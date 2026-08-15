import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma.js';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth.js';
import { loginRateLimiter } from '../../middleware/rateLimiter.middleware.js';

const router = Router();
const getJwtSecrets = () => {
  const secret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET || secret;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing in production!');
  }
  return {
    jwtSecret: secret || 'afreen_mall_dev_jwt_secret_key_2026',
    jwtRefreshSecret: refreshSecret || 'afreen_mall_dev_refresh_secret_key_2026',
  };
};

// ── Public Staff Directory Listing ───────────────────────────────────────────
router.get('/directory', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null, isDeactivated: false },
      select: {
        staffId: true,
        username: true,
        fullName: true,
        role: true,
      },
      orderBy: { staffId: 'asc' },
    });
    return res.json({ users });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch staff directory' });
  }
});

// ── Strict Production Authentication: Staff Login ───────────────────────────
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Staff ID / Username and Password are required' });
    }

    const cleanIdentifier = String(identifier).trim();
    const cleanPassword = String(password);

    if (!cleanPassword || cleanPassword.length === 0) {
      return res.status(400).json({ error: 'Password cannot be empty' });
    }

    // Lookup user by numeric staffId or string username (using indexed database fields)
    const numericStaffId = parseInt(cleanIdentifier, 10);
    const user = await prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [
          ...(isNaN(numericStaffId) ? [] : [{ staffId: numericStaffId }]),
          { username: cleanIdentifier },
        ],
      },
    });

    // 1. User existence check (generic error prevents user enumeration)
    if (!user) {
      await prisma.loginHistory.create({
        data: {
          username: cleanIdentifier,
          success: false,
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.get('user-agent'),
        },
      }).catch((err) => console.error('LoginHistory log error:', err?.message));
      return res.status(401).json({ error: 'Invalid Staff ID or Password' });
    }

    // 2. Account Lockout Check (15-minute temporary lockout after 5 consecutive failures)
    if (user.isLocked && user.lockoutUntil) {
      if (new Date() < user.lockoutUntil) {
        const remainingMins = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / (60 * 1000));
        return res.status(423).json({
          error: `Account Locked: 5 consecutive failed login attempts detected. Please try again in ${remainingMins} minute(s) or contact Super Admin.`,
          isLocked: true,
          remainingMins,
        });
      } else {
        // Unlock account after lockout period expires
        await prisma.user.update({
          where: { id: user.id },
          data: { isLocked: false, failedAttempts: 0, lockoutUntil: null },
        });
      }
    }

    // 3. Deactivation & 7-Day Inactivity Check
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const isInactiveOver7Days = user.lastLoginAt && (Date.now() - new Date(user.lastLoginAt).getTime() > SEVEN_DAYS_MS);

    if (user.isDeactivated || isInactiveOver7Days) {
      if (!user.isDeactivated && isInactiveOver7Days) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isDeactivated: true },
        });
      }
      return res.status(403).json({
        error: 'Account Deactivated: Staff account is inactive or disabled. Please contact Manager or Super Admin to reactivate.',
        isDeactivated: true,
      });
    }

    // 4. Cryptographic Password Verification using bcrypt
    const isPasswordValid = await bcrypt.compare(cleanPassword, user.passwordHash);

    if (!isPasswordValid) {
      const newFailedAttempts = user.failedAttempts + 1;
      const shouldLock = newFailedAttempts >= 5;
      const lockoutTime = shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: newFailedAttempts,
          isLocked: shouldLock,
          lockoutUntil: lockoutTime,
        },
      });

      await prisma.loginHistory.create({
        data: {
          userId: user.id,
          staffId: user.staffId,
          username: user.username,
          success: false,
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.get('user-agent'),
        },
      }).catch((err) => console.error('LoginHistory log error:', err?.message));

      if (shouldLock) {
        return res.status(423).json({
          error: 'Account Locked: 5 consecutive failed login attempts. Account locked for 15 minutes.',
          isLocked: true,
        });
      }

      return res.status(401).json({
        error: 'Invalid Staff ID or Password',
        remainingAttempts: 5 - newFailedAttempts,
      });
    }

    // 5. Successful Authentication -> Reset counters & issue session
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        isLocked: false,
        lockoutUntil: null,
        lastLoginAt: new Date(),
      },
    });

    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        staffId: user.staffId,
        username: user.username,
        success: true,
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.get('user-agent'),
      },
    }).catch((err) => console.error('LoginHistory log error:', err?.message));

    const userPayload = {
      id: user.id,
      staffId: user.staffId,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      canProcessSaleReturn: user.canProcessSaleReturn,
    };

    const { jwtSecret, jwtRefreshSecret } = getJwtSecrets();
    const token = jwt.sign(userPayload, jwtSecret, { expiresIn: '12h' });
    const refreshToken = jwt.sign({ id: user.id }, jwtRefreshSecret, { expiresIn: '7d' });

    // Store Session in Database
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        refreshToken,
        expiresAt: new Date(Date.now() + 12 * 3600 * 1000),
      },
    });

    return res.json({
      token,
      refreshToken,
      user: userPayload,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
});

// ── Secure Password Management: Change Password Endpoint ─────────────────────
router.post('/change-password', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    // Require & verify current password strictly using bcrypt.compare()
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required to change password' });
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Check if new password is identical to current password
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
      },
    });

    // Invalidate all active JWT sessions in DB for this user
    await prisma.session.deleteMany({
      where: { userId },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        staffId: user.staffId,
        userName: user.fullName,
        userRole: user.role,
        action: 'CHANGE_PASSWORD',
        entityName: 'User',
        entityId: user.id,
        reason: 'Staff password updated successfully. All active sessions invalidated.',
      },
    });

    return res.json({ message: 'Password updated successfully. Please log in with your new password.' });
  } catch (err: any) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'Failed to update password' });
  }
});

// ── Session Revocation: Logout Endpoint ──────────────────────────────────────
router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.sessionToken) {
      await prisma.session.deleteMany({
        where: { token: req.sessionToken },
      });
    }

    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          staffId: req.user.staffId,
          userName: req.user.fullName,
          userRole: req.user.role,
          action: 'LOGOUT',
          entityName: 'User',
          entityId: req.user.id,
          reason: 'User session logged out successfully.',
        },
      });
    }

    return res.json({ message: 'Logged out successfully' });
  } catch {
    return res.json({ message: 'Logged out successfully' });
  }
});

// ── Session Refresh Endpoint ────────────────────────────────────────────────
router.post('/refresh-token', async (req, res) => {
  try {
    const refreshToken = req.body?.refreshToken || req.headers['x-refresh-token'];
    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const { jwtSecret, jwtRefreshSecret } = getJwtSecrets();
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, jwtRefreshSecret);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || !session.user || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Session expired or invalidated' });
    }

    const user = session.user;
    if (user.isDeactivated || user.isLocked) {
      return res.status(403).json({ error: 'Account disabled or locked' });
    }

    const userPayload = {
      id: user.id,
      staffId: user.staffId,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      canProcessSaleReturn: user.canProcessSaleReturn,
    };

    const newAccessToken = jwt.sign(userPayload, jwtSecret, { expiresIn: '12h' });

    // Update session token
    await prisma.session.update({
      where: { id: session.id },
      data: { token: newAccessToken },
    });

    return res.json({
      token: newAccessToken,
      user: userPayload,
    });
  } catch (err: any) {
    console.error('Refresh token error:', err);
    return res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// ── Session Verification Endpoint ───────────────────────────────────────────
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        staffId: true,
        username: true,
        fullName: true,
        role: true,
        mustChangePassword: true,
        canProcessSaleReturn: true,
        isDeactivated: true,
        isLocked: true,
      },
    });

    if (!user || user.isDeactivated || user.isLocked) {
      return res.status(401).json({ error: 'Session invalid or account disabled' });
    }

    return res.json({ user });
  } catch {
    return res.status(500).json({ error: 'Failed to verify session' });
  }
});

export default router;


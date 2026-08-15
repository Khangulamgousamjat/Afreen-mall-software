import { Router, Response } from 'express';
import { prisma } from '../../prisma.js';
import { authenticateToken, requireManagerOrAdmin, AuthenticatedRequest } from '../../middleware/auth.js';
import { RoleName } from '@afreen-mall/shared-types';
import bcrypt from 'bcrypt';

const router = Router();

// Apply Manager or Super Admin requirement to ALL routes in this file
router.use(authenticateToken, requireManagerOrAdmin);

// GET /api/v1/users - List all staff (delegates to same Prisma query as /admin/users)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        staffId: true,
        username: true,
        fullName: true,
        role: true,
        mustChangePassword: true,
        isLocked: true,
        isDeactivated: true,
        canProcessSaleReturn: true,
        failedAttempts: true,
        createdAt: true,
      },
      orderBy: { staffId: 'asc' },
    });

    return res.json({ users });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/v1/users - Create new staff account
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username, fullName, role, canProcessSaleReturn } = req.body;

    if (!username || !fullName || !role) {
      return res.status(400).json({ error: 'Username, Full Name, and Role are required' });
    }

    if (!Object.values(RoleName).includes(role)) {
      return res.status(400).json({ error: `Invalid role name: ${role}` });
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: `Username '${username}' is already taken.` });
    }

    const highestUser = await prisma.user.findFirst({
      orderBy: { staffId: 'desc' },
      select: { staffId: true },
    });

    const nextStaffId = highestUser ? Math.max(highestUser.staffId + 1, 300000) : 300000;
    const temporaryPassword = process.env.DEFAULT_TEMP_PASSWORD || ('Afreen#' + Math.floor(100000 + Math.random() * 900000));
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const newUser = await prisma.user.create({
      data: {
        staffId: nextStaffId,
        username,
        fullName,
        passwordHash,
        role: role as RoleName,
        mustChangePassword: true,
        isDeactivated: false,
        canProcessSaleReturn: Boolean(canProcessSaleReturn),
      },
      select: {
        id: true,
        staffId: true,
        username: true,
        fullName: true,
        role: true,
        mustChangePassword: true,
        isDeactivated: true,
        canProcessSaleReturn: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        staffId: req.user!.staffId,
        userName: req.user!.fullName,
        userRole: req.user!.role,
        action: 'CREATE_STAFF_USER',
        entityName: 'User',
        entityId: newUser.id,
        afterValue: { staffId: newUser.staffId, username: newUser.username, role: newUser.role },
        reason: `New staff account created by ${req.user!.fullName}.`,
      },
    });

    return res.status(201).json({
      user: newUser,
      oneTimeTemporaryPassword: temporaryPassword,
      message: 'Staff account created successfully. Temporary password is valid for first login only.',
    });
  } catch (err: any) {
    console.error('Error creating staff user:', err);
    return res.status(500).json({ error: 'Failed to create staff account' });
  }
});

// PATCH /api/v1/users/:id/role
router.patch('/:id/role', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !Object.values(RoleName).includes(role)) {
      return res.status(400).json({ error: 'Valid role is required' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'Staff user not found' });
    }

    if (targetUser.staffId === 300000 && role !== RoleName.SUPER_ADMIN) {
      return res.status(400).json({ error: 'Root Super Admin role cannot be modified or revoked.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role: role as RoleName },
      select: { id: true, staffId: true, username: true, fullName: true, role: true },
    });

    return res.json({ user: updatedUser, message: 'Role updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update role' });
  }
});

// PATCH /api/v1/users/:id/status
router.patch('/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isDeactivated } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isDeactivated: Boolean(isDeactivated) },
      select: { id: true, staffId: true, username: true, isDeactivated: true },
    });

    return res.json({ user: updatedUser, message: 'Account status updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update account status' });
  }
});

// PATCH /api/v1/users/:id/permissions
router.patch('/:id/permissions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { canProcessSaleReturn } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { canProcessSaleReturn: Boolean(canProcessSaleReturn) },
      select: { id: true, staffId: true, username: true, canProcessSaleReturn: true },
    });

    return res.json({ user: updatedUser, message: 'Sale return permission updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update sale return permission' });
  }
});

// POST /api/v1/users/:id/unlock
router.post('/:id/unlock', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.update({
      where: { id },
      data: {
        isLocked: false,
        failedAttempts: 0,
        lockoutUntil: null,
      },
      select: { id: true, staffId: true, username: true, isLocked: true },
    });

    return res.json({ user, message: 'Account unlocked successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to unlock user' });
  }
});

export default router;

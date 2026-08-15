import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../../prisma.js';
import { authenticateToken, requireManagerOrAdmin, requireSuperAdmin, AuthenticatedRequest } from '../../middleware/auth.js';
import { RoleName } from '@afreen-mall/shared-types';

const router = Router();

// All admin routes require authentication
router.use(authenticateToken);

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/v1/admin/security-dashboard
router.get('/security-dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      lockedUsers,
      deactivatedUsers,
      failedLoginsToday,
      successfulLoginsToday,
      activeSessions,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, isDeactivated: false, isLocked: false } }),
      prisma.user.count({ where: { deletedAt: null, isLocked: true } }),
      prisma.user.count({ where: { deletedAt: null, isDeactivated: true } }),
      prisma.loginHistory.count({ where: { success: false, createdAt: { gte: last24h } } }),
      prisma.loginHistory.count({ where: { success: true, createdAt: { gte: last24h } } }),
      prisma.session.count({ where: { expiresAt: { gte: now } } }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          userName: true,
          userRole: true,
          action: true,
          entityName: true,
          reason: true,
          createdAt: true,
        },
      }),
    ]);

    return res.json({
      dashboard: {
        totalUsers,
        activeUsers,
        lockedUsers,
        deactivatedUsers,
        failedLoginsToday,
        successfulLoginsToday,
        activeSessions,
        recentAuditLogs,
        systemStatus: {
          api: 'ONLINE',
          database: 'CONNECTED',
          storage: 'HEALTHY',
        },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch security dashboard' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/v1/admin/users — Paginated user list
router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(String(req.query.page || '1'), 10);
    const limit = parseInt(String(req.query.limit || '50'), 10);
    const skip = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const roleFilter = req.query.role ? String(req.query.role) : undefined;
    const statusFilter = req.query.status ? String(req.query.status) : undefined;

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { fullName: { contains: search } },
      ];
    }
    if (roleFilter) where.role = roleFilter;
    if (statusFilter === 'locked') where.isLocked = true;
    if (statusFilter === 'deactivated') where.isDeactivated = true;
    if (statusFilter === 'active') { where.isLocked = false; where.isDeactivated = false; }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { staffId: 'asc' },
        select: {
          id: true,
          staffId: true,
          username: true,
          fullName: true,
          role: true,
          isLocked: true,
          isDeactivated: true,
          failedAttempts: true,
          mustChangePassword: true,
          canProcessSaleReturn: true,
          lastLoginAt: true,
          createdAt: true,
          _count: { select: { sessions: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/v1/admin/users — Create user (Super Admin only)
router.post('/users', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      username, fullName, role, email, mobile, department,
      canProcessSaleReturn, branch, company, employeeCode,
      initialPassword, password,
    } = req.body;

    if (!username || !fullName || !role) {
      return res.status(400).json({ error: 'Username, Full Name, and Role are required' });
    }
    if (!Object.values(RoleName).includes(role)) {
      return res.status(400).json({ error: `Invalid role: ${role}` });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(400).json({ error: `Username '${username}' is already taken` });
    }

    const highestUser = await prisma.user.findFirst({
      orderBy: { staffId: 'desc' },
      select: { staffId: true },
    });
    const nextStaffId = highestUser ? Math.max(highestUser.staffId + 1, 300000) : 300000;
    const temporaryPassword = (initialPassword && String(initialPassword).trim().length >= 6)
      ? String(initialPassword).trim()
      : (password && String(password).trim().length >= 6)
        ? String(password).trim()
        : (process.env.INITIAL_STAFF_PASSWORD || process.env.DEFAULT_TEMP_PASSWORD || 'Pass@123');
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
        id: true, staffId: true, username: true, fullName: true,
        role: true, mustChangePassword: true, isDeactivated: true, createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        staffId: req.user!.staffId,
        userName: req.user!.fullName,
        userRole: req.user!.role,
        action: 'ADMIN_CREATE_USER',
        entityName: 'User',
        entityId: newUser.id,
        afterValue: {
          staffId: newUser.staffId, username: newUser.username,
          role: newUser.role, email, mobile, department, branch, company, employeeCode,
        },
        reason: `Admin user created by ${req.user!.fullName}.`,
      },
    });

    return res.status(201).json({
      user: newUser,
      oneTimeTemporaryPassword: temporaryPassword,
      message: 'User created. Temporary password valid for first login only.',
    });
  } catch (err: any) {
    console.error('Admin create user error:', err);
    return res.status(500).json({ error: 'Failed to create user' });
  }
});

// PATCH /api/v1/admin/users/:id/role — Update role
router.patch('/users/:id/role', requireManagerOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !Object.values(RoleName).includes(role)) {
      return res.status(400).json({ error: 'Valid role is required' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    if (targetUser.staffId === 300000 && role !== RoleName.SUPER_ADMIN) {
      return res.status(400).json({ error: 'Root Super Admin role cannot be modified.' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: role as RoleName },
      select: { id: true, staffId: true, username: true, fullName: true, role: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        staffId: req.user!.staffId,
        userName: req.user!.fullName,
        userRole: req.user!.role,
        action: 'ADMIN_ROLE_CHANGE',
        entityName: 'User',
        entityId: id,
        beforeValue: { role: targetUser.role },
        afterValue: { role },
        reason: `Role changed from ${targetUser.role} to ${role} by ${req.user!.fullName}.`,
      },
    });

    return res.json({ user: updated, message: 'Role updated.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update role' });
  }
});

// GET /api/v1/admin/roles/:name/permissions - Get role permissions
router.get('/roles/:name/permissions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.params;
    const rolePermission = await prisma.rolePermission.findUnique({
      where: { roleName: name },
    });
    return res.json({
      roleName: name,
      permissions: rolePermission ? rolePermission.permissions : null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
});

// PATCH /api/v1/admin/roles/:name/permissions - Update role permissions
router.patch('/roles/:name/permissions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.params;
    const { permissions } = req.body;

    if (!permissions) {
      return res.status(400).json({ error: 'Permissions object is required' });
    }

    const updated = await prisma.rolePermission.upsert({
      where: { roleName: name },
      update: { permissions },
      create: { roleName: name, permissions },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        staffId: req.user!.staffId,
        userName: req.user!.fullName,
        userRole: req.user!.role,
        action: 'UPDATE_ROLE_PERMISSIONS',
        entityName: 'RolePermission',
        entityId: updated.id,
        reason: `Permissions updated for role ${name} by ${req.user!.fullName}.`,
      },
    });

    return res.json({ message: `Permissions for role ${name} updated successfully.`, rolePermission: updated });
  } catch (err: any) {
    console.error('Failed to update role permissions:', err);
    return res.status(500).json({ error: 'Failed to update role permissions' });
  }
});

// PATCH /api/v1/admin/users/:id/status — Activate / Deactivate / Lock / Unlock / Suspend
router.patch('/users/:id/status', requireManagerOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, isDeactivated } = req.body;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    if (targetUser.staffId === 300000) {
      return res.status(400).json({ error: 'Root Super Admin account status cannot be modified.' });
    }

    const updateData: any = {};
    if (typeof isDeactivated === 'boolean') {
      updateData.isDeactivated = isDeactivated;
    }
    if (status === 'ACTIVE') { updateData.isDeactivated = false; updateData.isLocked = false; updateData.failedAttempts = 0; updateData.lockoutUntil = null; }
    if (status === 'INACTIVE') updateData.isDeactivated = true;
    if (status === 'LOCKED') { updateData.isLocked = true; updateData.lockoutUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); }
    if (status === 'SUSPENDED') { updateData.isDeactivated = true; updateData.isLocked = true; }

    const updatedUser = await prisma.user.update({ where: { id }, data: updateData });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        staffId: req.user!.staffId,
        userName: req.user!.fullName,
        userRole: req.user!.role,
        action: `ADMIN_USER_STATUS_CHANGE`,
        entityName: 'User',
        entityId: id,
        afterValue: { status, isDeactivated: updatedUser.isDeactivated },
        reason: `User status updated by ${req.user!.fullName}.`,
      },
    });

    return res.json({ user: updatedUser, message: 'User status updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update user status' });
  }
});

// PATCH /api/v1/admin/users/:id/permissions — Toggle Sale Return Permission
router.patch('/users/:id/permissions', requireManagerOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
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

// POST /api/v1/admin/users/:id/unlock — Unlock locked staff account
router.post('/users/:id/unlock', requireManagerOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
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

// POST /api/v1/admin/users/:id/reset-password — Super Admin / Manager reset or set staff password
router.post('/users/:id/reset-password', requireManagerOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body; // optional — admin/manager can type an exact new password

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // Only Super Admin can modify Super Admin password
    if (targetUser.role === RoleName.SUPER_ADMIN && req.user!.role !== RoleName.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Only Super Admin can modify Super Admin password.' });
    }

    const tempPassword = newPassword && newPassword.length >= 6
      ? newPassword
      : (process.env.DEFAULT_TEMP_PASSWORD || ('Afreen#' + Math.floor(100000 + Math.random() * 900000)));

    const passwordHash = await bcrypt.hash(tempPassword, 12);

    await prisma.user.update({
      where: { id },
      data: { passwordHash, mustChangePassword: true, isLocked: false, failedAttempts: 0, lockoutUntil: null },
    });

    await prisma.session.deleteMany({ where: { userId: id } }); // force re-login everywhere

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id, staffId: req.user!.staffId,
        userName: req.user!.fullName, userRole: req.user!.role,
        action: 'ADMIN_PASSWORD_RESET', entityName: 'User', entityId: id,
        reason: `Password reset by ${req.user!.fullName} — no old password required. All sessions invalidated.`,
      },
    });

    return res.json({ tempPassword, temporaryPassword: tempPassword, message: 'Password reset. User must change it on next login.' });
  } catch (err: any) {
    console.error('Admin reset password error:', err);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

// POST /api/v1/admin/users/:id/force-logout — Force logout all sessions
router.post('/users/:id/force-logout', requireManagerOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.session.deleteMany({ where: { userId: id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        staffId: req.user!.staffId,
        userName: req.user!.fullName,
        userRole: req.user!.role,
        action: 'ADMIN_FORCE_LOGOUT',
        entityName: 'Session',
        entityId: id,
        reason: `Force logout by admin ${req.user!.fullName}. ${deleted.count} sessions terminated.`,
      },
    });

    return res.json({ message: `${deleted.count} session(s) terminated.` });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to force logout user' });
  }
});

// DELETE /api/v1/admin/users/:id — Permanently delete staff account
router.delete('/users/:id', requireManagerOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    if (targetUser.staffId === 300000) {
      return res.status(400).json({ error: 'Root Super Admin account cannot be deleted.' });
    }

    if (req.user?.id === id) {
      return res.status(400).json({ error: 'You cannot delete your own logged-in account.' });
    }

    // Invalidate target user's active sessions
    await prisma.session.deleteMany({ where: { userId: id } });

    // Nullify references in history and logs so foreign key constraints do not prevent deletion
    await prisma.loginHistory.updateMany({ where: { userId: id }, data: { userId: null } });
    await prisma.auditLog.updateMany({ where: { userId: id }, data: { userId: null } });

    // Permanently remove the user from database
    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        staffId: req.user!.staffId,
        userName: req.user!.fullName,
        userRole: req.user!.role,
        action: 'ADMIN_DELETE_USER',
        entityName: 'User',
        entityId: id,
        reason: `Staff profile for ${targetUser.fullName} (Staff ID: ${targetUser.staffId}, username: ${targetUser.username}) permanently deleted by ${req.user!.fullName}.`,
      },
    });

    return res.json({ message: `Staff account for ${targetUser.fullName} (Staff ID: ${targetUser.staffId}) has been permanently deleted.` });
  } catch (err: any) {
    console.error('Delete staff error:', err);
    return res.status(500).json({ error: 'Failed to delete staff account' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// RBAC — ROLES & PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

// All ERP roles with their default module access matrix
const DEFAULT_ROLES = [
  { name: RoleName.SUPER_ADMIN, description: 'Full system access. Cannot be restricted.', level: 1, color: '#ef4444' },
  { name: RoleName.STORE_MANAGER, description: 'Full store operations. Can manage staff.', level: 2, color: '#f59e0b' },
  { name: 'COMPANY_ADMIN', description: 'Company-level administration.', level: 2, color: '#f59e0b' },
  { name: 'BRANCH_ADMIN', description: 'Branch-level administration.', level: 3, color: '#8b5cf6' },
  { name: 'PURCHASE_MANAGER', description: 'Purchase orders, GRN, supplier management.', level: 3, color: '#06b6d4' },
  { name: 'INVENTORY_MANAGER', description: 'Stock control, adjustments, warehouse.', level: 3, color: '#06b6d4' },
  { name: 'FINANCE_MANAGER', description: 'Accounting, GL, journals, financial reports.', level: 3, color: '#10b981' },
  { name: 'HR_MANAGER', description: 'Employee management, payroll, attendance.', level: 3, color: '#10b981' },
  { name: 'SALES_MANAGER', description: 'Sales orders, pricing, discount approvals.', level: 3, color: '#10b981' },
  { name: 'CRM_MANAGER', description: 'Customer master, loyalty, communication.', level: 3, color: '#10b981' },
  { name: RoleName.CASHIER, description: 'POS billing and sale return (if permitted).', level: 4, color: '#6b7280' },
  { name: RoleName.CASH_OFFICER, description: 'Cash reconciliation and day close.', level: 4, color: '#6b7280' },
  { name: RoleName.ACCOUNTANT, description: 'Accounting entries and financial reports.', level: 4, color: '#6b7280' },
  { name: RoleName.INVENTORY_STAFF, description: 'View inventory, process GRN.', level: 5, color: '#6b7280' },
  { name: 'WAREHOUSE_STAFF', description: 'Warehouse stock movements.', level: 5, color: '#6b7280' },
  { name: 'CUSTOMER_SERVICE', description: 'CRM support tickets and customer lookup.', level: 5, color: '#6b7280' },
  { name: 'AUDITOR', description: 'Read-only access to all modules.', level: 5, color: '#6b7280' },
  { name: 'READ_ONLY', description: 'View only, no create/edit/delete.', level: 6, color: '#6b7280' },
];

// GET /api/v1/admin/roles
router.get('/roles', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get user count per role
    const roleUserCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
      where: { deletedAt: null },
    });
    const countMap: Record<string, number> = {};
    roleUserCounts.forEach((r) => { countMap[r.role] = r._count.id; });

    const roles = DEFAULT_ROLES.map((r) => ({
      ...r,
      userCount: countMap[r.name] || 0,
      isSystemRole: true,
    }));

    return res.json({ roles });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// GET /api/v1/admin/permissions — Permission matrix definition
router.get('/permissions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const permissionMatrix = {
      modules: [
        {
          id: 'pos', name: 'POS & Billing', screens: [
            { id: 'pos_billing', name: 'POS Billing' },
            { id: 'pos_return', name: 'Sale Return' },
            { id: 'day_close', name: 'Day Close' },
          ],
        },
        {
          id: 'inventory', name: 'Inventory', screens: [
            { id: 'product_master', name: 'Product Master' },
            { id: 'stock_view', name: 'Stock View' },
            { id: 'stock_adjustment', name: 'Stock Adjustment' },
          ],
        },
        {
          id: 'purchase', name: 'Purchasing', screens: [
            { id: 'purchase_order', name: 'Purchase Order' },
            { id: 'grn', name: 'GRN (Goods Receipt)' },
            { id: 'purchase_return', name: 'Purchase Return' },
          ],
        },
        {
          id: 'sales', name: 'Sales', screens: [
            { id: 'sales_order', name: 'Sales Order' },
            { id: 'quotation', name: 'Quotation' },
            { id: 'delivery_note', name: 'Delivery Note' },
          ],
        },
        {
          id: 'accounting', name: 'Accounting & Finance', screens: [
            { id: 'chart_of_accounts', name: 'Chart of Accounts' },
            { id: 'journal_entry', name: 'Journal Entry' },
            { id: 'financial_reports', name: 'Financial Reports' },
            { id: 'gst_compliance', name: 'GST Compliance' },
          ],
        },
        {
          id: 'hrms', name: 'HRMS', screens: [
            { id: 'employee_master', name: 'Employee Master' },
            { id: 'attendance', name: 'Attendance' },
            { id: 'payroll', name: 'Payroll' },
            { id: 'leave_management', name: 'Leave Management' },
          ],
        },
        {
          id: 'crm', name: 'CRM', screens: [
            { id: 'customer_master', name: 'Customer Master' },
            { id: 'loyalty', name: 'Loyalty Program' },
            { id: 'support_tickets', name: 'Support Tickets' },
          ],
        },
        {
          id: 'suppliers', name: 'Supplier Management', screens: [
            { id: 'supplier_master', name: 'Supplier Master' },
            { id: 'vendor_scorecard', name: 'Vendor Scorecard' },
            { id: 'accounts_payable', name: 'Accounts Payable' },
          ],
        },
        {
          id: 'admin', name: 'System Administration', screens: [
            { id: 'user_management', name: 'User Management' },
            { id: 'rbac', name: 'Roles & Permissions' },
            { id: 'system_config', name: 'System Configuration' },
            { id: 'audit_log', name: 'Audit Log' },
          ],
        },
      ],
      actions: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'PRINT', 'EXPORT', 'IMPORT', 'VOID', 'REVERSE'],
    };

    return res.json({ permissionMatrix });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch permission matrix' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-COMPANY & MULTI-BRANCH
// ─────────────────────────────────────────────────────────────────────────────

// In-memory store for companies and branches (future: persist to DB)
let companies: any[] = [
  {
    id: 'COMP-001',
    name: 'Afreen Mall Enterprises Pvt. Ltd.',
    gstin: '27AABCA1234L1Z5',
    pan: 'AABCA1234L',
    address: 'Shop No. 1, Afreen Mall, Mumbai, Maharashtra 400001',
    financialYear: '2026-27',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

let branches: any[] = [
  {
    id: 'BRN-001',
    companyId: 'COMP-001',
    code: 'AFREEN-001',
    name: 'Afreen Mall – Main Store',
    storeType: 'RETAIL',
    address: 'Ground Floor, Afreen Mall, Mumbai',
    gstin: '27AABCA1234L1Z5',
    contactPhone: '+91 98765 43210',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
];

router.get('/companies', async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ companies });
});

router.post('/companies', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, gstin, pan, address, financialYear, currency, timezone } = req.body;
    if (!name) return res.status(400).json({ error: 'Company name is required' });

    const company = {
      id: `COMP-${String(companies.length + 1).padStart(3, '0')}`,
      name, gstin: gstin || '', pan: pan || '', address: address || '',
      financialYear: financialYear || '2026-27', currency: currency || 'INR',
      timezone: timezone || 'Asia/Kolkata', isActive: true,
      createdAt: new Date().toISOString(),
    };
    companies.push(company);

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id, staffId: req.user!.staffId,
        userName: req.user!.fullName, userRole: req.user!.role,
        action: 'ADMIN_CREATE_COMPANY', entityName: 'Company', entityId: company.id,
        afterValue: company, reason: `Company created by ${req.user!.fullName}.`,
      },
    });

    return res.status(201).json({ company, message: 'Company created successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create company' });
  }
});

router.get('/branches', async (req: AuthenticatedRequest, res: Response) => {
  const companyId = req.query.companyId ? String(req.query.companyId) : undefined;
  const filtered = companyId ? branches.filter((b) => b.companyId === companyId) : branches;
  return res.json({ branches: filtered });
});

router.post('/branches', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyId, code, name, storeType, address, gstin, contactPhone } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'Branch code and name are required' });

    const branch = {
      id: `BRN-${String(branches.length + 1).padStart(3, '0')}`,
      companyId: companyId || 'COMP-001', code, name,
      storeType: storeType || 'RETAIL', address: address || '',
      gstin: gstin || '', contactPhone: contactPhone || '',
      status: 'ACTIVE', createdAt: new Date().toISOString(),
    };
    branches.push(branch);

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id, staffId: req.user!.staffId,
        userName: req.user!.fullName, userRole: req.user!.role,
        action: 'ADMIN_CREATE_BRANCH', entityName: 'Branch', entityId: branch.id,
        afterValue: branch, reason: `Branch created by ${req.user!.fullName}.`,
      },
    });

    return res.status(201).json({ branch, message: 'Branch created successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create branch' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_CONFIG: Record<string, any> = {
  pos: {
    label: 'POS Settings',
    settings: {
      defaultTaxRate: { label: 'Default Tax Rate (%)', value: '18', type: 'number' },
      receiptHeaderLine1: { label: 'Receipt Header Line 1', value: 'Afreen Mall', type: 'text' },
      receiptHeaderLine2: { label: 'Receipt Header Line 2', value: 'Mumbai, Maharashtra', type: 'text' },
      allowPartialPayment: { label: 'Allow Partial Payment', value: 'false', type: 'boolean' },
      enableBarcodeScan: { label: 'Enable Barcode Scanner', value: 'true', type: 'boolean' },
      gracePeriodMinutes: { label: 'Login Grace Period (min)', value: '5', type: 'number' },
    },
  },
  inventory: {
    label: 'Inventory Settings',
    settings: {
      lowStockThreshold: { label: 'Default Low Stock Threshold', value: '10', type: 'number' },
      enableBatchTracking: { label: 'Enable Batch Tracking', value: 'false', type: 'boolean' },
      enableSerialNumber: { label: 'Enable Serial Number Tracking', value: 'false', type: 'boolean' },
      defaultWarehouse: { label: 'Default Warehouse', value: 'WH-MAIN-001', type: 'text' },
    },
  },
  finance: {
    label: 'Finance Settings',
    settings: {
      financialYearStart: { label: 'Financial Year Start', value: 'April', type: 'text' },
      defaultCurrency: { label: 'Default Currency', value: 'INR', type: 'text' },
      cgstRate: { label: 'CGST Rate (%)', value: '9', type: 'number' },
      sgstRate: { label: 'SGST Rate (%)', value: '9', type: 'number' },
      enableDoubleEntry: { label: 'Enforce Double-Entry', value: 'true', type: 'boolean' },
    },
  },
  hr: {
    label: 'HR Settings',
    settings: {
      pfRate: { label: 'PF Rate (% of Basic)', value: '12', type: 'number' },
      esicRate: { label: 'ESIC Rate (% of Gross)', value: '0.75', type: 'number' },
      esicThreshold: { label: 'ESIC Threshold (₹/month)', value: '21000', type: 'number' },
      workingDaysPerMonth: { label: 'Working Days/Month', value: '26', type: 'number' },
      gracePeriodMinutes: { label: 'Attendance Grace Period (min)', value: '10', type: 'number' },
      otMultiplier: { label: 'Overtime Multiplier', value: '1.5', type: 'number' },
    },
  },
  security: {
    label: 'Security Settings',
    settings: {
      passwordMinLength: { label: 'Min Password Length', value: '8', type: 'number' },
      maxLoginAttempts: { label: 'Max Failed Login Attempts', value: '5', type: 'number' },
      lockoutDurationMinutes: { label: 'Lockout Duration (min)', value: '15', type: 'number' },
      sessionTimeoutHours: { label: 'Session Timeout (hours)', value: '12', type: 'number' },
      inactivityAutoLockDays: { label: 'Inactivity Auto-Lock (days)', value: '7', type: 'number' },
      require2FA: { label: 'Require 2FA for Admins', value: 'false', type: 'boolean' },
    },
  },
  regional: {
    label: 'Regional Settings',
    settings: {
      timezone: { label: 'Timezone', value: 'Asia/Kolkata', type: 'text' },
      dateFormat: { label: 'Date Format', value: 'DD/MM/YYYY', type: 'text' },
      timeFormat: { label: 'Time Format', value: '12h', type: 'text' },
      language: { label: 'Language', value: 'en-IN', type: 'text' },
      currencySymbol: { label: 'Currency Symbol', value: '₹', type: 'text' },
    },
  },
};

router.get('/config', async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ config: SYSTEM_CONFIG });
});

router.patch('/config', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category, key, value } = req.body;
    if (!category || !key || value === undefined) {
      return res.status(400).json({ error: 'category, key, and value are required' });
    }
    if (!SYSTEM_CONFIG[category]?.settings[key]) {
      return res.status(404).json({ error: 'Configuration key not found' });
    }

    const oldValue = SYSTEM_CONFIG[category].settings[key].value;
    SYSTEM_CONFIG[category].settings[key].value = String(value);

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id, staffId: req.user!.staffId,
        userName: req.user!.fullName, userRole: req.user!.role,
        action: 'ADMIN_CONFIG_CHANGE', entityName: 'SystemConfig',
        entityId: `${category}.${key}`,
        beforeValue: { value: oldValue },
        afterValue: { value: String(value) },
        reason: `Config ${category}.${key} changed by ${req.user!.fullName}.`,
      },
    });

    return res.json({ message: 'Configuration updated.', config: SYSTEM_CONFIG[category] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// NUMBER SERIES MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

const NUMBER_SERIES: Record<string, any> = {
  invoice: { module: 'Invoice', prefix: 'INV', suffix: '', yearCode: '26', branchPrefix: false, currentSeq: 1001, example: 'INV-26-1001' },
  purchase_order: { module: 'Purchase Order', prefix: 'PO', suffix: '', yearCode: '26', branchPrefix: false, currentSeq: 501, example: 'PO-2026-0501' },
  grn: { module: 'GRN', prefix: 'GRN', suffix: '', yearCode: '26', branchPrefix: false, currentSeq: 201, example: 'GRN-2026-0201' },
  sales_order: { module: 'Sales Order', prefix: 'SO', suffix: '', yearCode: '26', branchPrefix: false, currentSeq: 301, example: 'SO-2026-0301' },
  journal: { module: 'Journal Entry', prefix: 'JRN', suffix: '', yearCode: '2026', branchPrefix: false, currentSeq: 1, example: 'JRN-2026-000001' },
  employee: { module: 'Employee', prefix: 'EMP', suffix: '', yearCode: '2026', branchPrefix: false, currentSeq: 1, example: 'EMP-2026-000001' },
  customer: { module: 'Customer', prefix: 'CUST', suffix: '', yearCode: '26', branchPrefix: false, currentSeq: 1001, example: 'CUST-26-1001' },
  supplier: { module: 'Supplier', prefix: 'SUP', suffix: '', yearCode: '26', branchPrefix: false, currentSeq: 1, example: 'SUP-2026-001' },
  payslip: { module: 'Payslip', prefix: 'PSL', suffix: '', yearCode: '2026', branchPrefix: false, currentSeq: 1, example: 'PSL-2026-001' },
  leave: { module: 'Leave Application', prefix: 'LV', suffix: '', yearCode: '2026', branchPrefix: false, currentSeq: 1, example: 'LV-2026-000001' },
};

router.get('/number-series', async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ numberSeries: NUMBER_SERIES });
});

router.patch('/number-series/:module', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { module } = req.params;
    const { prefix, suffix, yearCode, branchPrefix } = req.body;

    if (!NUMBER_SERIES[module]) {
      return res.status(404).json({ error: 'Number series module not found' });
    }

    const old = { ...NUMBER_SERIES[module] };
    if (prefix !== undefined) NUMBER_SERIES[module].prefix = prefix;
    if (suffix !== undefined) NUMBER_SERIES[module].suffix = suffix;
    if (yearCode !== undefined) NUMBER_SERIES[module].yearCode = yearCode;
    if (branchPrefix !== undefined) NUMBER_SERIES[module].branchPrefix = branchPrefix;

    // Regenerate example
    const s = NUMBER_SERIES[module];
    s.example = `${s.prefix}-${s.yearCode}-${String(s.currentSeq).padStart(4, '0')}${s.suffix}`;

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id, staffId: req.user!.staffId,
        userName: req.user!.fullName, userRole: req.user!.role,
        action: 'ADMIN_NUMBER_SERIES_UPDATE', entityName: 'NumberSeries',
        entityId: module, beforeValue: old, afterValue: NUMBER_SERIES[module],
        reason: `Number series for ${module} updated by ${req.user!.fullName}.`,
      },
    });

    return res.json({ series: NUMBER_SERIES[module], message: 'Number series updated.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update number series' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// APPROVAL ENGINE
// ─────────────────────────────────────────────────────────────────────────────

let approvalRules: any[] = [
  { id: 'APR-001', module: 'Purchase Order', event: 'PURCHASE_ORDER_ABOVE', threshold: 5000000, approverRole: RoleName.STORE_MANAGER, isActive: true, escalationHours: 24 },
  { id: 'APR-002', module: 'Discount', event: 'DISCOUNT_ABOVE_PERCENT', threshold: 20, approverRole: RoleName.STORE_MANAGER, isActive: true, escalationHours: 4 },
  { id: 'APR-003', module: 'Sale Return', event: 'RETURN_ABOVE', threshold: 100000, approverRole: RoleName.STORE_MANAGER, isActive: true, escalationHours: 2 },
  { id: 'APR-004', module: 'Journal Entry', event: 'MANUAL_JOURNAL_ABOVE', threshold: 10000000, approverRole: RoleName.SUPER_ADMIN, isActive: true, escalationHours: 48 },
  { id: 'APR-005', module: 'Payroll', event: 'PAYROLL_RUN', threshold: 0, approverRole: RoleName.STORE_MANAGER, isActive: true, escalationHours: 24 },
];

let pendingApprovals: any[] = [];

router.get('/approval-rules', async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ rules: approvalRules });
});

router.post('/approval-rules', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { module, event, threshold, approverRole, escalationHours } = req.body;
    if (!module || !event || !approverRole) {
      return res.status(400).json({ error: 'module, event, and approverRole are required' });
    }

    const rule = {
      id: `APR-${String(approvalRules.length + 1).padStart(3, '0')}`,
      module, event, threshold: Number(threshold) || 0,
      approverRole, escalationHours: Number(escalationHours) || 24,
      isActive: true, createdAt: new Date().toISOString(),
    };
    approvalRules.push(rule);

    return res.status(201).json({ rule, message: 'Approval rule created.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create approval rule' });
  }
});

router.patch('/approval-rules/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive, threshold, escalationHours, approverRole } = req.body;
    const idx = approvalRules.findIndex((r) => r.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Rule not found' });

    if (isActive !== undefined) approvalRules[idx].isActive = Boolean(isActive);
    if (threshold !== undefined) approvalRules[idx].threshold = Number(threshold);
    if (escalationHours !== undefined) approvalRules[idx].escalationHours = Number(escalationHours);
    if (approverRole !== undefined) approvalRules[idx].approverRole = approverRole;

    return res.json({ rule: approvalRules[idx], message: 'Approval rule updated.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update approval rule' });
  }
});

router.get('/pending-approvals', async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ approvals: pendingApprovals });
});

router.post('/approvals/:id/approve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const idx = pendingApprovals.findIndex((a) => a.id === id);
    if (idx !== -1) {
      pendingApprovals[idx].status = 'APPROVED';
      pendingApprovals[idx].approvedBy = req.user!.fullName;
      pendingApprovals[idx].approvedAt = new Date().toISOString();
      pendingApprovals[idx].comments = comments;
    }
    return res.json({ message: 'Approval granted.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to approve' });
  }
});

router.post('/approvals/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const idx = pendingApprovals.findIndex((a) => a.id === id);
    if (idx !== -1) {
      pendingApprovals[idx].status = 'REJECTED';
      pendingApprovals[idx].rejectedBy = req.user!.fullName;
      pendingApprovals[idx].rejectedAt = new Date().toISOString();
      pendingApprovals[idx].rejectionReason = reason;
    }
    return res.json({ message: 'Approval rejected.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to reject' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW ENGINE
// ─────────────────────────────────────────────────────────────────────────────

let workflows: any[] = [
  {
    id: 'WF-001',
    name: 'Purchase Order Approval',
    trigger: 'PURCHASE_ORDER_CREATED',
    isActive: true,
    steps: [
      { stepNo: 1, name: 'Department Head Review', role: 'PURCHASE_MANAGER', timeoutHours: 24 },
      { stepNo: 2, name: 'Finance Approval', role: RoleName.ACCOUNTANT, timeoutHours: 48 },
      { stepNo: 3, name: 'Store Manager Final Approval', role: RoleName.STORE_MANAGER, timeoutHours: 24 },
    ],
  },
  {
    id: 'WF-002',
    name: 'Leave Request Workflow',
    trigger: 'LEAVE_APPLIED',
    isActive: true,
    steps: [
      { stepNo: 1, name: 'Department Manager Review', role: RoleName.STORE_MANAGER, timeoutHours: 48 },
      { stepNo: 2, name: 'HR Manager Confirmation', role: 'HR_MANAGER', timeoutHours: 24 },
    ],
  },
  {
    id: 'WF-003',
    name: 'Journal Entry Authorization',
    trigger: 'MANUAL_JOURNAL_POSTED',
    isActive: true,
    steps: [
      { stepNo: 1, name: 'Accountant Verification', role: RoleName.ACCOUNTANT, timeoutHours: 4 },
      { stepNo: 2, name: 'Finance Manager Approval', role: 'FINANCE_MANAGER', timeoutHours: 8 },
      { stepNo: 3, name: 'Super Admin Authorization', role: RoleName.SUPER_ADMIN, timeoutHours: 24 },
    ],
  },
];

router.get('/workflows', async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ workflows });
});

router.post('/workflows', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, trigger, steps } = req.body;
    if (!name || !trigger || !steps?.length) {
      return res.status(400).json({ error: 'name, trigger, and steps are required' });
    }
    const workflow = {
      id: `WF-${String(workflows.length + 1).padStart(3, '0')}`,
      name, trigger, steps, isActive: true, createdAt: new Date().toISOString(),
    };
    workflows.push(workflow);
    return res.status(201).json({ workflow, message: 'Workflow created.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create workflow' });
  }
});

router.patch('/workflows/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive, steps, name } = req.body;
    const idx = workflows.findIndex((w) => w.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Workflow not found' });

    if (isActive !== undefined) workflows[idx].isActive = Boolean(isActive);
    if (steps !== undefined) workflows[idx].steps = steps;
    if (name !== undefined) workflows[idx].name = name;

    return res.json({ workflow: workflows[idx], message: 'Workflow updated.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

let notificationRules: any[] = [
  { id: 'NR-001', event: 'APPROVAL_REQUIRED', channels: ['IN_APP', 'EMAIL'], isActive: true },
  { id: 'NR-002', event: 'APPROVAL_COMPLETED', channels: ['IN_APP'], isActive: true },
  { id: 'NR-003', event: 'LOGIN_FAILED_MAX', channels: ['IN_APP', 'EMAIL'], isActive: true },
  { id: 'NR-004', event: 'PASSWORD_EXPIRY', channels: ['IN_APP', 'EMAIL'], isActive: true },
  { id: 'NR-005', event: 'LOW_STOCK', channels: ['IN_APP'], isActive: true },
  { id: 'NR-006', event: 'PAYROLL_COMPLETED', channels: ['IN_APP', 'EMAIL'], isActive: true },
  { id: 'NR-007', event: 'CONTRACT_EXPIRY', channels: ['IN_APP', 'EMAIL'], isActive: true },
  { id: 'NR-008', event: 'SHIFT_CLOSING', channels: ['IN_APP'], isActive: true },
];

router.get('/notification-rules', async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ rules: notificationRules });
});

router.patch('/notification-rules/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive, channels } = req.body;
    const idx = notificationRules.findIndex((r) => r.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Rule not found' });

    if (isActive !== undefined) notificationRules[idx].isActive = Boolean(isActive);
    if (channels !== undefined) notificationRules[idx].channels = channels;

    return res.json({ rule: notificationRules[idx], message: 'Notification rule updated.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update notification rule' });
  }
});

router.get('/notifications', async (req: AuthenticatedRequest, res: Response) => {
  // Sample in-app notifications for authenticated user
  const notifications = [
    { id: 'N-001', type: 'APPROVAL_REQUIRED', title: 'Purchase Order Approval Required', message: 'PO-2026-0501 from Reliance Retail requires your approval.', isRead: false, createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
    { id: 'N-002', type: 'LOW_STOCK', title: 'Low Stock Alert', message: 'Product BASMATI-5KG is below minimum stock threshold (8 units remaining).', isRead: false, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    { id: 'N-003', type: 'LOGIN_ALERT', title: 'Failed Login Attempts', message: '3 failed login attempts detected for user cashier2 from IP 192.168.1.45.', isRead: true, createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
  ];
  return res.json({ notifications, unreadCount: notifications.filter((n) => !n.isRead).length });
});

// ─────────────────────────────────────────────────────────────────────────────
// SESSION MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

router.get('/sessions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();
    const sessions = await prisma.session.findMany({
      where: { expiresAt: { gte: now } },
      include: {
        user: {
          select: { staffId: true, username: true, fullName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return res.json({ sessions });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.delete('/sessions/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.session.delete({ where: { id: req.params.id } });
    return res.json({ message: 'Session terminated.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to terminate session' });
  }
});

router.delete('/sessions/user/:userId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deleted = await prisma.session.deleteMany({ where: { userId: req.params.userId } });
    return res.json({ message: `${deleted.count} session(s) terminated.` });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to terminate user sessions' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────────────────────────────────────

router.get('/audit-logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(String(req.query.page || '1'), 10);
    const limit = parseInt(String(req.query.limit || '50'), 10);
    const skip = (page - 1) * limit;
    const action = req.query.action ? String(req.query.action) : undefined;
    const userId = req.query.userId ? String(req.query.userId) : undefined;
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    const where: any = {};
    if (action) where.action = { contains: action };
    if (userId) where.userId = userId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return res.json({ logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN HISTORY
// ─────────────────────────────────────────────────────────────────────────────

router.get('/login-history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(String(req.query.page || '1'), 10);
    const limit = parseInt(String(req.query.limit || '50'), 10);
    const skip = (page - 1) * limit;
    const success = req.query.success !== undefined ? req.query.success === 'true' : undefined;
    const userId = req.query.userId ? String(req.query.userId) : undefined;

    const where: any = {};
    if (success !== undefined) where.success = success;
    if (userId) where.userId = userId;

    const [history, total] = await Promise.all([
      prisma.loginHistory.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.loginHistory.count({ where }),
    ]);

    return res.json({ history, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch login history' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY LOG
// ─────────────────────────────────────────────────────────────────────────────

let activityLog: any[] = [
  { id: 'ACT-001', module: 'Scheduler', event: 'DAILY_BACKUP_COMPLETED', severity: 'INFO', status: 'SUCCESS', message: 'Nightly database backup completed. Size: 42 MB.', createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: 'ACT-002', module: 'HRMS', event: 'PAYROLL_BATCH_PROCESSED', severity: 'INFO', status: 'SUCCESS', message: 'Monthly payroll batch PAYROLL-BATCH-2026-0801 processed for 24 employees.', createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
  { id: 'ACT-003', module: 'Notification', event: 'EMAIL_DELIVERY_FAILED', severity: 'WARNING', status: 'FAILED', message: 'Email delivery failed for 2 recipients. SMTP timeout.', createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
  { id: 'ACT-004', module: 'Inventory', event: 'LOW_STOCK_RECALCULATION', severity: 'INFO', status: 'SUCCESS', message: 'Inventory low-stock thresholds recalculated for 1,240 SKUs.', createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() },
  { id: 'ACT-005', module: 'API', event: 'RATE_LIMIT_EXCEEDED', severity: 'ERROR', status: 'BLOCKED', message: 'IP 203.101.45.22 exceeded rate limit (500 req/min). Temporarily blocked.', createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString() },
  { id: 'ACT-006', module: 'Database', event: 'INDEX_MAINTENANCE_COMPLETED', severity: 'INFO', status: 'SUCCESS', message: 'Database index maintenance completed. Performance improved by ~12%.', createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
  { id: 'ACT-007', module: 'CRM', event: 'LOYALTY_EXPIRY_PROCESSED', severity: 'INFO', status: 'SUCCESS', message: '47 loyalty accounts with expired points processed and notified.', createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
];

router.get('/activity-log', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const module = req.query.module ? String(req.query.module) : undefined;
    const severity = req.query.severity ? String(req.query.severity) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const limit = parseInt(String(req.query.limit || '50'), 10);

    let filtered = [...activityLog];
    if (module) filtered = filtered.filter((a) => a.module === module);
    if (severity) filtered = filtered.filter((a) => a.severity === severity);
    if (status) filtered = filtered.filter((a) => a.status === status);

    return res.json({ activities: filtered.slice(0, limit), total: filtered.length });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BACKUP MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

let backups: any[] = [
  { id: 'BCK-001', type: 'FULL', status: 'COMPLETED', sizeMb: 42.8, target: 'LOCAL', duration: 94, completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), triggeredBy: 'SCHEDULER', verified: true },
  { id: 'BCK-002', type: 'INCREMENTAL', status: 'COMPLETED', sizeMb: 3.2, target: 'LOCAL', duration: 12, completedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(), triggeredBy: 'SCHEDULER', verified: true },
  { id: 'BCK-003', type: 'FULL', status: 'COMPLETED', sizeMb: 41.1, target: 'LOCAL', duration: 88, completedAt: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(), triggeredBy: 'MANUAL', verified: true },
];

const disasterRecoveryConfig = {
  rto: '4 hours',
  rpo: '1 hour',
  backupRetentionDays: 30,
  offSiteEnabled: false,
  cloudEnabled: false,
  recoveryContacts: ['admin@afreenmall.com', 'it@afreenmall.com'],
  lastDrTestDate: '2026-07-15',
};

router.get('/backups', async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ backups, disasterRecovery: disasterRecoveryConfig });
});

router.post('/backups/run', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type = 'FULL', target = 'LOCAL' } = req.body;
    const validTypes = ['FULL', 'INCREMENTAL', 'DIFFERENTIAL'];
    if (!validTypes.includes(type)) return res.status(400).json({ error: 'Invalid backup type' });

    // Simulate backup
    const backup: any = {
      id: `BCK-${String(backups.length + 1).padStart(3, '0')}`,
      type, status: 'RUNNING', sizeMb: 0, target,
      duration: 0, triggeredBy: 'MANUAL', verified: false,
      startedAt: new Date().toISOString(),
      startedBy: req.user!.fullName,
    };
    backups.unshift(backup);

    // Simulate completion after a delay (in-memory)
    setTimeout(() => {
      const idx = backups.findIndex((b) => b.id === backup.id);
      if (idx !== -1) {
        backups[idx].status = 'COMPLETED';
        backups[idx].sizeMb = type === 'FULL' ? 42.5 + Math.random() * 5 : 3 + Math.random() * 2;
        backups[idx].duration = type === 'FULL' ? 85 + Math.floor(Math.random() * 20) : 10 + Math.floor(Math.random() * 5);
        backups[idx].completedAt = new Date().toISOString();
        backups[idx].verified = true;
        activityLog.unshift({ id: `ACT-${Date.now()}`, module: 'Backup', event: 'BACKUP_COMPLETED', severity: 'INFO', status: 'SUCCESS', message: `${type} backup ${backup.id} completed. Size: ${backups[idx].sizeMb.toFixed(1)} MB.`, createdAt: new Date().toISOString() });
      }
    }, 3000);

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id, staffId: req.user!.staffId,
        userName: req.user!.fullName, userRole: req.user!.role,
        action: 'ADMIN_BACKUP_RUN', entityName: 'Backup', entityId: backup.id,
        afterValue: { type, target }, reason: `Manual ${type} backup initiated by ${req.user!.fullName}.`,
      },
    });

    return res.status(201).json({ backup, message: `${type} backup started. ID: ${backup.id}` });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to start backup' });
  }
});

router.get('/backups/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  const backup = backups.find((b) => b.id === req.params.id);
  if (!backup) return res.status(404).json({ error: 'Backup not found' });
  return res.json({ backup });
});

router.post('/backups/:id/restore', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { confirmed, confirmationText } = req.body;
    const backup = backups.find((b) => b.id === id);
    if (!backup) return res.status(404).json({ error: 'Backup not found' });
    if (!confirmed || confirmationText !== 'RESTORE') {
      return res.status(400).json({
        error: 'Restore requires explicit confirmation and typing the literal string "RESTORE".',
        requiresConfirmation: true,
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id, staffId: req.user!.staffId,
        userName: req.user!.fullName, userRole: req.user!.role,
        action: 'ADMIN_RESTORE_INITIATED', entityName: 'Backup', entityId: id,
        reason: `Restore from backup ${id} (${backup.type}) initiated by ${req.user!.fullName}. WARNING: This operation overwrites current data.`,
      },
    });

    activityLog.unshift({ id: `ACT-${Date.now()}`, module: 'Backup', event: 'RESTORE_INITIATED', severity: 'WARNING', status: 'RUNNING', message: `Restore from ${id} initiated by ${req.user!.fullName}.`, createdAt: new Date().toISOString() });

    return res.json({ message: `Restore from ${id} initiated. This operation will complete within the configured RTO window.` });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to initiate restore' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM HEALTH MONITORING
// ─────────────────────────────────────────────────────────────────────────────

router.get('/system-health', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();
    const last5Min = new Date(now.getTime() - 5 * 60 * 1000);

    // Real DB health check
    let dbStatus = 'HEALTHY';
    let dbResponseMs = 0;
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbResponseMs = Date.now() - dbStart;
    } catch {
      dbStatus = 'DEGRADED';
    }

    // Session / active user counts
    const [activeSessions, failedLoginsLast5Min, totalLogsToday] = await Promise.all([
      prisma.session.count({ where: { expiresAt: { gte: now } } }),
      prisma.loginHistory.count({ where: { success: false, createdAt: { gte: last5Min } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: new Date(now.setHours(0, 0, 0, 0)) } } }),
    ]);

    // Simulate system metrics (in production these would come from OS/cloud APIs)
    const memoryUsed = process.memoryUsage();
    const memoryMb = Math.round(memoryUsed.heapUsed / 1024 / 1024);
    const memoryTotalMb = Math.round(memoryUsed.heapTotal / 1024 / 1024);

    return res.json({
      health: {
        timestamp: new Date().toISOString(),
        overall: dbStatus === 'HEALTHY' ? 'HEALTHY' : 'DEGRADED',
        api: { status: 'ONLINE', responseMs: 12, requestsPerMin: 84 },
        database: { status: dbStatus, responseMs: dbResponseMs, connections: 5 },
        memory: { usedMb: memoryMb, totalMb: memoryTotalMb, percentUsed: Math.round((memoryMb / memoryTotalMb) * 100) },
        storage: { usedGb: 2.4, totalGb: 50, percentUsed: 4.8 },
        queue: { pending: 0, processing: 0, failed: 0, status: 'IDLE' },
        activeSessions,
        failedLoginsLast5Min,
        totalAuditEventsToday: totalLogsToday,
        uptime: { seconds: Math.floor(process.uptime()), formatted: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m` },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch system health' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULER
// ─────────────────────────────────────────────────────────────────────────────

let schedulerJobs: any[] = [
  { id: 'JOB-001', name: 'Daily Database Backup', module: 'Backup', action: 'FULL_BACKUP', cron: '0 2 * * *', cronDesc: 'Every day at 2:00 AM', enabled: true, lastRunAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), lastStatus: 'SUCCESS', nextRunAt: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(), runCount: 127 },
  { id: 'JOB-002', name: 'Loyalty Points Expiry Check', module: 'CRM', action: 'LOYALTY_EXPIRY', cron: '0 8 * * *', cronDesc: 'Every day at 8:00 AM', enabled: true, lastRunAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), lastStatus: 'SUCCESS', nextRunAt: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(), runCount: 245 },
  { id: 'JOB-003', name: 'Monthly GST Report Generation', module: 'Accounting', action: 'GST_REPORT', cron: '0 9 1 * *', cronDesc: '1st of every month at 9:00 AM', enabled: true, lastRunAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), lastStatus: 'SUCCESS', nextRunAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(), runCount: 8 },
  { id: 'JOB-004', name: 'Inventory Low Stock Recalculation', module: 'Inventory', action: 'STOCK_RECALC', cron: '*/30 * * * *', cronDesc: 'Every 30 minutes', enabled: true, lastRunAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), lastStatus: 'SUCCESS', nextRunAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), runCount: 4820 },
  { id: 'JOB-005', name: 'Weekly Sales Summary Email', module: 'Reports', action: 'SALES_SUMMARY_EMAIL', cron: '0 7 * * 1', cronDesc: 'Every Monday at 7:00 AM', enabled: false, lastRunAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), lastStatus: 'SUCCESS', nextRunAt: null, runCount: 32 },
  { id: 'JOB-006', name: 'Database Index Maintenance', module: 'Database', action: 'INDEX_MAINTENANCE', cron: '0 3 * * 0', cronDesc: 'Every Sunday at 3:00 AM', enabled: true, lastRunAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), lastStatus: 'SUCCESS', nextRunAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), runCount: 18 },
  { id: 'JOB-007', name: 'Old Audit Log Archival', module: 'Admin', action: 'ARCHIVE_AUDIT_LOGS', cron: '0 1 1 * *', cronDesc: '1st of every month at 1:00 AM', enabled: true, lastRunAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), lastStatus: 'SUCCESS', nextRunAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(), runCount: 8 },
];

router.get('/scheduler/jobs', async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ jobs: schedulerJobs });
});

router.post('/scheduler/jobs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, module, action, cron, cronDesc, enabled } = req.body;
    if (!name || !cron || !module || !action) return res.status(400).json({ error: 'name, module, action, and cron are required' });

    const job = {
      id: `JOB-${String(schedulerJobs.length + 1).padStart(3, '0')}`,
      name, module, action, cron, cronDesc: cronDesc || cron,
      enabled: enabled !== false,
      lastRunAt: null, lastStatus: 'PENDING',
      nextRunAt: null, runCount: 0,
      createdAt: new Date().toISOString(),
    };
    schedulerJobs.push(job);

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id, staffId: req.user!.staffId,
        userName: req.user!.fullName, userRole: req.user!.role,
        action: 'ADMIN_SCHEDULER_CREATE', entityName: 'SchedulerJob', entityId: job.id,
        afterValue: job, reason: `Scheduler job '${name}' created by ${req.user!.fullName}.`,
      },
    });

    return res.status(201).json({ job, message: 'Scheduled job created.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create scheduled job' });
  }
});

router.patch('/scheduler/jobs/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { enabled, cron, cronDesc } = req.body;
    const idx = schedulerJobs.findIndex((j) => j.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Job not found' });

    if (enabled !== undefined) schedulerJobs[idx].enabled = Boolean(enabled);
    if (cron) schedulerJobs[idx].cron = cron;
    if (cronDesc) schedulerJobs[idx].cronDesc = cronDesc;

    return res.json({ job: schedulerJobs[idx], message: 'Job updated.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update job' });
  }
});

router.post('/scheduler/jobs/:id/run-now', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const idx = schedulerJobs.findIndex((j) => j.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Job not found' });

    // Simulate run
    schedulerJobs[idx].lastRunAt = new Date().toISOString();
    schedulerJobs[idx].lastStatus = 'SUCCESS';
    schedulerJobs[idx].runCount += 1;

    activityLog.unshift({ id: `ACT-${Date.now()}`, module: schedulerJobs[idx].module, event: 'MANUAL_JOB_RUN', severity: 'INFO', status: 'SUCCESS', message: `Job '${schedulerJobs[idx].name}' executed manually by ${req.user!.fullName}.`, createdAt: new Date().toISOString() });

    return res.json({ job: schedulerJobs[idx], message: `Job '${schedulerJobs[idx].name}' executed.` });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to run job' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE FLAGS
// ─────────────────────────────────────────────────────────────────────────────

let featureFlags: any[] = [
  { key: 'LOYALTY_MODULE', name: 'Loyalty Program', description: 'Customer loyalty points, tiers, and redemptions', enabled: true, scope: 'COMPANY', module: 'CRM', rolloutPercent: 100 },
  { key: 'GIFT_CARDS', name: 'Gift Cards', description: 'Issue and redeem gift cards at POS', enabled: false, scope: 'BRANCH', module: 'POS', rolloutPercent: 0 },
  { key: 'ONLINE_ORDERS', name: 'Online Orders', description: 'Accept and process orders from digital channels', enabled: false, scope: 'COMPANY', module: 'Sales', rolloutPercent: 0 },
  { key: 'MULTI_CURRENCY', name: 'Multi-Currency', description: 'Accept payments in foreign currencies', enabled: false, scope: 'COMPANY', module: 'Finance', rolloutPercent: 0 },
  { key: 'WAREHOUSE_TRANSFERS', name: 'Warehouse Transfers', description: 'Inter-warehouse stock movement', enabled: true, scope: 'COMPANY', module: 'Inventory', rolloutPercent: 100 },
  { key: 'VENDOR_PORTAL', name: 'Vendor Self-Service Portal', description: 'Allow vendors to view orders and invoices online', enabled: false, scope: 'COMPANY', module: 'Suppliers', rolloutPercent: 0 },
  { key: 'MOBILE_APP', name: 'Mobile App Access', description: 'Allow ERP access via mobile application', enabled: false, scope: 'COMPANY', module: 'Admin', rolloutPercent: 0 },
  { key: 'BIOMETRIC_AUTH', name: 'Biometric Authentication', description: 'Fingerprint/face login for POS terminals', enabled: false, scope: 'BRANCH', module: 'Auth', rolloutPercent: 0 },
  { key: 'AI_INSIGHTS', name: 'AI Business Insights', description: 'AI-powered analytics and forecasting', enabled: false, scope: 'COMPANY', module: 'Reports', rolloutPercent: 0 },
  { key: 'WHATSAPP_NOTIFICATIONS', name: 'WhatsApp Notifications', description: 'Send customer notifications via WhatsApp Business', enabled: false, scope: 'COMPANY', module: 'CRM', rolloutPercent: 0 },
  { key: 'ADVANCED_ANALYTICS', name: 'Advanced Analytics Dashboard', description: 'Extended BI dashboards and drill-down reports', enabled: true, scope: 'COMPANY', module: 'Reports', rolloutPercent: 100 },
  { key: 'TWO_FACTOR_AUTH', name: 'Two-Factor Authentication', description: 'Require OTP in addition to password for admins', enabled: false, scope: 'USER_GROUP', module: 'Auth', rolloutPercent: 0 },
];

router.get('/feature-flags', async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ flags: featureFlags });
});

router.patch('/feature-flags/:key', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { key } = req.params;
    const { enabled, rolloutPercent, scope } = req.body;
    const idx = featureFlags.findIndex((f) => f.key === key);
    if (idx === -1) return res.status(404).json({ error: 'Feature flag not found' });

    const old = { ...featureFlags[idx] };
    if (enabled !== undefined) featureFlags[idx].enabled = Boolean(enabled);
    if (rolloutPercent !== undefined) featureFlags[idx].rolloutPercent = Math.min(100, Math.max(0, Number(rolloutPercent)));
    if (scope) featureFlags[idx].scope = scope;

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id, staffId: req.user!.staffId,
        userName: req.user!.fullName, userRole: req.user!.role,
        action: 'ADMIN_FEATURE_FLAG_CHANGE', entityName: 'FeatureFlag', entityId: key,
        beforeValue: old, afterValue: featureFlags[idx],
        reason: `Feature flag '${key}' set to ${featureFlags[idx].enabled ? 'ENABLED' : 'DISABLED'} by ${req.user!.fullName}.`,
      },
    });

    return res.json({ flag: featureFlags[idx], message: `Feature '${featureFlags[idx].name}' updated.` });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update feature flag' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// API MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

let apiKeys: any[] = [
  { id: 'AK-001', name: 'External POS Integration', key: 'afreen_live_xxxxxxxxxxxxxxxxxxxxxxxx', keyPreview: 'afreen_live_xxxx…xxxx', scope: 'READ_WRITE', allowedOrigins: ['https://pos.afreenmall.com'], rateLimit: 300, requestsToday: 1247, isActive: true, createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), expiresAt: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'AK-002', name: 'Accounting Integration', key: 'afreen_live_yyyyyyyyyyyyyyyyyyyyyyyy', keyPreview: 'afreen_live_yyyy…yyyy', scope: 'READ', allowedOrigins: ['https://accounting.afreenmall.com'], rateLimit: 60, requestsToday: 89, isActive: true, createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), expiresAt: new Date(Date.now() + 350 * 24 * 60 * 60 * 1000).toISOString() },
];

const apiMonitorData = {
  totalRequestsToday: 14826,
  failedRequestsToday: 42,
  avgResponseTimeMs: 28,
  authFailuresToday: 7,
  rateLimitViolationsToday: 3,
  topEndpoints: [
    { endpoint: 'POST /api/v1/auth/login', requests: 3241, avgMs: 45 },
    { endpoint: 'GET /api/v1/catalog', requests: 2890, avgMs: 12 },
    { endpoint: 'POST /api/v1/pos/transaction', requests: 2156, avgMs: 67 },
    { endpoint: 'GET /api/v1/inventory', requests: 1842, avgMs: 18 },
    { endpoint: 'GET /api/v1/reports', requests: 954, avgMs: 142 },
  ],
};

router.get('/api-keys', async (req: AuthenticatedRequest, res: Response) => {
  const maskedKeys = apiKeys.map((k) => ({ ...k, key: undefined })); // Never expose raw key
  return res.json({ apiKeys: maskedKeys });
});

router.post('/api-keys', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, scope, allowedOrigins, rateLimit, expiresInDays } = req.body;
    if (!name || !scope) return res.status(400).json({ error: 'name and scope are required' });

    const rawKey = `afreen_live_${Math.random().toString(36).substring(2, 18)}${Math.random().toString(36).substring(2, 18)}`;
    const apiKey = {
      id: `AK-${String(apiKeys.length + 1).padStart(3, '0')}`,
      name, key: rawKey, keyPreview: `${rawKey.substring(0, 16)}…${rawKey.substring(rawKey.length - 4)}`,
      scope: scope || 'READ', allowedOrigins: allowedOrigins || ['*'],
      rateLimit: Number(rateLimit) || 60, requestsToday: 0, isActive: true,
      createdAt: new Date().toISOString(),
      expiresAt: expiresInDays ? new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000).toISOString() : null,
    };
    apiKeys.push(apiKey);

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id, staffId: req.user!.staffId,
        userName: req.user!.fullName, userRole: req.user!.role,
        action: 'ADMIN_API_KEY_CREATED', entityName: 'ApiKey', entityId: apiKey.id,
        afterValue: { name, scope, rateLimit }, reason: `API key '${name}' created by ${req.user!.fullName}.`,
      },
    });

    return res.status(201).json({ apiKey: { ...apiKey, key: rawKey }, message: 'API key created. Copy the key — it will not be shown again.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create API key' });
  }
});

router.delete('/api-keys/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const idx = apiKeys.findIndex((k) => k.id === id);
    if (idx === -1) return res.status(404).json({ error: 'API key not found' });

    const keyName = apiKeys[idx].name;
    apiKeys.splice(idx, 1);

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id, staffId: req.user!.staffId,
        userName: req.user!.fullName, userRole: req.user!.role,
        action: 'ADMIN_API_KEY_REVOKED', entityName: 'ApiKey', entityId: id,
        reason: `API key '${keyName}' revoked by ${req.user!.fullName}.`,
      },
    });

    return res.json({ message: `API key '${keyName}' revoked.` });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

router.get('/api-monitor', async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ monitor: apiMonitorData });
});

// ─────────────────────────────────────────────────────────────────────────────
// LICENSING
// ─────────────────────────────────────────────────────────────────────────────

let licenseData: any = {
  key: 'AFREEN-MALL-ENT-2026-XXXX-YYYY-ZZZZ',
  type: 'ENTERPRISE',
  status: 'ACTIVE',
  issuedTo: 'Afreen Mall Enterprises Pvt. Ltd.',
  issuedDate: '2026-04-01',
  expiryDate: '2027-03-31',
  daysUntilExpiry: 238,
  activatedModules: ['POS', 'Inventory', 'Purchasing', 'Sales', 'CRM', 'Suppliers', 'Accounting', 'HRMS', 'Admin', 'Reports'],
  limits: {
    companies: { allowed: 5, used: 1 },
    branches: { allowed: 10, used: 1 },
    users: { allowed: 50, used: 7 },
    posTerminals: { allowed: 10, used: 2 },
    storageGb: { allowed: 50, used: 2.4 },
  },
  supportTier: 'PREMIUM',
  supportExpiry: '2027-03-31',
};

router.get('/license', async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ license: licenseData });
});

router.get('/license/usage', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [userCount, sessionCount] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null, isDeactivated: false } }),
      prisma.session.count({ where: { expiresAt: { gte: new Date() } } }),
    ]);

    const usage = {
      ...licenseData.limits,
      users: { ...licenseData.limits.users, used: userCount },
      activeSessions: sessionCount,
    };

    return res.json({ usage });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch license usage' });
  }
});

router.post('/license/activate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: 'License key is required' });

    // Simulate validation
    if (!key.startsWith('AFREEN-')) {
      return res.status(400).json({ error: 'Invalid license key format. Expected AFREEN-XXXXX-XXXXX-XXXXX.' });
    }

    licenseData.key = key;
    licenseData.status = 'ACTIVE';

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id, staffId: req.user!.staffId,
        userName: req.user!.fullName, userRole: req.user!.role,
        action: 'ADMIN_LICENSE_ACTIVATED', entityName: 'License', entityId: 'LICENSE',
        reason: `License key activated by ${req.user!.fullName}.`,
      },
    });

    return res.json({ license: licenseData, message: 'License activated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to activate license' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MAINTENANCE MODE
// ─────────────────────────────────────────────────────────────────────────────

let maintenanceMode: any = {
  enabled: false,
  message: 'Afreen Mall ERP is currently undergoing scheduled maintenance. We will be back shortly.',
  scheduledStart: null,
  scheduledEnd: null,
  enabledBy: null,
  enabledAt: null,
  allowedRoles: ['SUPER_ADMIN', 'STORE_MANAGER'],
};

router.get('/maintenance', async (req: AuthenticatedRequest, res: Response) => {
  return res.json({ maintenance: maintenanceMode });
});

router.post('/maintenance/enable', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, scheduledStart, scheduledEnd } = req.body;

    maintenanceMode.enabled = true;
    maintenanceMode.message = message || maintenanceMode.message;
    maintenanceMode.scheduledStart = scheduledStart || new Date().toISOString();
    maintenanceMode.scheduledEnd = scheduledEnd || null;
    maintenanceMode.enabledBy = req.user!.fullName;
    maintenanceMode.enabledAt = new Date().toISOString();

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id, staffId: req.user!.staffId,
        userName: req.user!.fullName, userRole: req.user!.role,
        action: 'ADMIN_MAINTENANCE_ENABLED', entityName: 'MaintenanceMode', entityId: 'SYSTEM',
        afterValue: maintenanceMode, reason: `Maintenance mode ENABLED by ${req.user!.fullName}.`,
      },
    });

    activityLog.unshift({ id: `ACT-${Date.now()}`, module: 'Admin', event: 'MAINTENANCE_ENABLED', severity: 'WARNING', status: 'ACTIVE', message: `System maintenance mode enabled by ${req.user!.fullName}. Regular users blocked.`, createdAt: new Date().toISOString() });

    return res.json({ maintenance: maintenanceMode, message: 'Maintenance mode enabled.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to enable maintenance mode' });
  }
});

router.post('/maintenance/disable', async (req: AuthenticatedRequest, res: Response) => {
  try {
    maintenanceMode.enabled = false;
    maintenanceMode.enabledBy = null;
    maintenanceMode.enabledAt = null;

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id, staffId: req.user!.staffId,
        userName: req.user!.fullName, userRole: req.user!.role,
        action: 'ADMIN_MAINTENANCE_DISABLED', entityName: 'MaintenanceMode', entityId: 'SYSTEM',
        reason: `Maintenance mode DISABLED by ${req.user!.fullName}. System restored to normal operation.`,
      },
    });

    activityLog.unshift({ id: `ACT-${Date.now()}`, module: 'Admin', event: 'MAINTENANCE_DISABLED', severity: 'INFO', status: 'SUCCESS', message: `System maintenance mode disabled by ${req.user!.fullName}. Normal operation resumed.`, createdAt: new Date().toISOString() });

    return res.json({ maintenance: maintenanceMode, message: 'Maintenance mode disabled. Normal operation resumed.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to disable maintenance mode' });
  }
});

export default router;

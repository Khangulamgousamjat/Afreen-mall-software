import bcrypt from 'bcrypt';
import { prisma } from './prisma.js';
import { RoleName } from '@prisma/client';

export async function bootstrapDatabase(): Promise<void> {
  try {
    console.log('[Bootstrap] Verifying production database schema & accounts...');

    // 1. Ensure Default Store exists
    await prisma.store.upsert({
      where: { code: 'AFREEN-001' },
      update: {},
      create: {
        code: 'AFREEN-001',
        name: 'Afreen Mall',
        address: 'Main Commercial Hub, City Center, Sector 4',
        phone: '+91 8625076618',
        email: 'operations@afreenmall.com',
        gstin: '27AAAAA0000A1Z5',
      },
    });

    // 2. Ensure Super Admin (300000) exists with valid bcrypt password hash
    const superAdminPassword = process.env.INITIAL_SUPER_ADMIN_PASSWORD || 'Kingkhan@12';
    const superAdminHash = await bcrypt.hash(superAdminPassword, 12);
    await prisma.user.upsert({
      where: { staffId: 300000 },
      update: {
        passwordHash: superAdminHash,
        isDeactivated: false,
        isLocked: false,
        failedAttempts: 0,
        lockoutUntil: null,
      },
      create: {
        staffId: 300000,
        username: 'Superkhan',
        fullName: 'Afreen Mall Super Admin',
        role: RoleName.SUPER_ADMIN,
        passwordHash: superAdminHash,
        mustChangePassword: false,
      },
    });
    console.log('[Bootstrap] Super Admin (300000) verified active.');

    // 3. Ensure Standard Seed Staff Accounts (300001 - 300015) exist
    const defaultStaffPassword = process.env.INITIAL_STAFF_PASSWORD || 'Pass@123';
    const defaultHash = await bcrypt.hash(defaultStaffPassword, 12);

    const staffAccounts = [
      { staffId: 300001, username: 'manager1',    name: 'Sanjay Gupta (Store Manager)',        role: RoleName.STORE_MANAGER },
      { staffId: 300002, username: 'cashofficer1',name: 'Babuji Namole (Cash Officer)',         role: RoleName.CASH_OFFICER },
      { staffId: 300003, username: 'accountant1', name: 'Amit Verma (Accountant)',              role: RoleName.ACCOUNTANT },
      { staffId: 300004, username: 'inventory1',  name: 'Vikram Singh (Inventory / GRN Exec.)', role: RoleName.INVENTORY_STAFF },
      { staffId: 300005, username: 'warehouse1',  name: 'Deepak Gaikwad (Warehouse Staff)',     role: RoleName.WAREHOUSE_STAFF },
      { staffId: 300006, username: 'purchase1',   name: 'Neha Singh (Purchase Team)',           role: RoleName.PURCHASE_TEAM },
      { staffId: 300007, username: 'auditor1',    name: 'Rajesh Deshmukh (Auditor)',            role: RoleName.AUDITOR },
      { staffId: 300008, username: 'hr1',         name: 'Priya Kulkarni (HR Manager)',          role: RoleName.HR_MANAGER },
      { staffId: 300009, username: 'sales1',      name: 'Rohan Kadam (Sales Manager)',          role: RoleName.SALES_MANAGER },
      { staffId: 300010, username: 'crm1',        name: 'Sneha Joshi (CRM Manager)',            role: RoleName.CRM_MANAGER },
      { staffId: 300011, username: 'cashier1',    name: 'Pooja Sharma (Cashier)',                role: RoleName.CASHIER },
      { staffId: 300012, username: 'cashier2',    name: 'Vinayak Shinde (Cashier)',              role: RoleName.CASHIER },
      { staffId: 300013, username: 'cashier3',    name: 'Mahesh Patil (Cashier)',                role: RoleName.CASHIER },
      { staffId: 300014, username: 'cashier4',    name: 'Sachin Jadhav (Cashier)',               role: RoleName.CASHIER },
      { staffId: 300015, username: 'cashier5',    name: 'Rahul Chavan (Cashier)',                role: RoleName.CASHIER },
    ];

    for (const staff of staffAccounts) {
      await prisma.user.upsert({
        where: { staffId: staff.staffId },
        update: {
          passwordHash: defaultHash,
          isDeactivated: false,
          isLocked: false,
          failedAttempts: 0,
          lockoutUntil: null,
          mustChangePassword: false,
        },
        create: {
          staffId: staff.staffId,
          username: staff.username,
          fullName: staff.name,
          role: staff.role,
          passwordHash: defaultHash,
          mustChangePassword: false,
        },
      });
    }

    // 3.1 Also update any other existing staff accounts (like 300203 or custom users) to Pass@123
    await prisma.user.updateMany({
      where: {
        staffId: { not: 300000 },
      },
      data: {
        passwordHash: defaultHash,
        isDeactivated: false,
        isLocked: false,
        failedAttempts: 0,
        lockoutUntil: null,
        mustChangePassword: false,
      },
    });

    console.log(`[Bootstrap] All staff accounts verified active with password Pass@123.`);

    // 4. Ensure POS Registers exist
    const registers = ['POS-01', 'POS-02', 'POS-03'];
    for (const posNumber of registers) {
      await prisma.register.upsert({
        where: { posNumber },
        update: {},
        create: {
          posNumber,
          name: `Checkout Counter ${posNumber.split('-')[1]}`,
          isActive: true,
        },
      });
    }

    console.log('[Bootstrap] Database bootstrap verification completed successfully.');
  } catch (err: any) {
    console.error('[Bootstrap] Warning: Database bootstrap failed:', err?.message || err);
  }
}

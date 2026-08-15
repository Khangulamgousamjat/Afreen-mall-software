/**
 * testDb.ts — Test database helpers
 *
 * Provides a shared Prisma client pointed at the TEST database and utilities
 * to seed minimal required data (register, product, user) and wipe tables
 * between test suites so each suite starts from a known clean state.
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env.test relative to this file's location — safe regardless of cwd
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env.test'), override: false });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import type { Express } from 'express';
import { resetRateLimiterForTest } from '../../middleware/rateLimiter.middleware.js';

const testDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/afreen_test';

export const testPrisma = new PrismaClient({
  datasources: {
    db: { url: testDbUrl },
  },
  log: [], // silence query logs during tests
});

// ── Cleanup ────────────────────────────────────────────────────────────────────

/**
 * Wipe all transactional data that tests create. Called in afterEach/afterAll.
 * Preserves nothing — tests always seed what they need.
 */
export async function cleanDb() {
  resetRateLimiterForTest();
  let retries = 3;
  while (retries > 0) {
    try {
      // Order respects FK constraints
      await testPrisma.auditLog.deleteMany();
      await testPrisma.stockMovement.deleteMany();
      await testPrisma.stockAdjustment.deleteMany();
      await testPrisma.saleItem.deleteMany();
      await testPrisma.saleReturn.deleteMany();
      await testPrisma.sale.deleteMany();
      await testPrisma.heldBill.deleteMany();
      await testPrisma.registerClose.deleteMany();
      await testPrisma.managerCashReport.deleteMany();
      await testPrisma.loginHistory.deleteMany();
      await testPrisma.session.deleteMany();
      await testPrisma.inventory.deleteMany();
      await testPrisma.product.deleteMany();
      await testPrisma.customer.deleteMany();
      await testPrisma.user.deleteMany();
      await testPrisma.register.deleteMany();
      await testPrisma.hSNCode.deleteMany();
      await testPrisma.taxRate.deleteMany();
      await testPrisma.unit.deleteMany();
      await testPrisma.category.deleteMany();
      break;
    } catch (err) {
      retries--;
      if (retries === 0) throw err;
      await testPrisma.$connect().catch(() => {});
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}

// ── Seed helpers ───────────────────────────────────────────────────────────────

export interface SeededRegister {
  id: string;
  posNumber: string;
}

export async function seedRegister(): Promise<SeededRegister> {
  const rand = Math.floor(Math.random() * 1000000);
  return testPrisma.register.create({
    data: { posNumber: `POS-${rand}`, name: `Test Till ${rand}`, isActive: true },
  });
}

export interface SeededUser {
  id: string;
  staffId: number;
  username: string;
  passwordPlain: string;
  role: string;
}

export async function seedUser(overrides?: {
  username?: string;
  password?: string;
  role?: string;
  staffId?: number;
  mustChangePassword?: boolean;
}): Promise<SeededUser> {
  const rand = Math.floor(Math.random() * 100000);
  const username = overrides?.username ?? `cashier_${rand}`;
  const password = overrides?.password ?? 'Test@1234';
  const role = overrides?.role ?? 'CASHIER';
  const staffId = overrides?.staffId ?? (300000 + rand);

  const passwordHash = await bcrypt.hash(password, 10);

  await testPrisma.user.create({
    data: {
      username,
      fullName: 'Test Cashier',
      staffId,
      passwordHash,
      role: role as any,
      mustChangePassword: overrides?.mustChangePassword ?? false,
      isDeactivated: false,
      isLocked: false,
      failedAttempts: 0,
    },
  });

  return { id: '', staffId, username, passwordPlain: password, role };
}

export interface SeededProduct {
  id: string;
  inventoryId: string;
  mrp: number;
  saleRate: number;
  gstPct: number;
  initialStock: number;
}

export async function seedProduct(initialStock = 100): Promise<SeededProduct> {
  const rand = Math.floor(Math.random() * 1000000);
  const category = await testPrisma.category.create({
    data: { name: `Test Cat ${rand}`, code: `TC-${rand}` },
  });
  const unit = await testPrisma.unit.create({
    data: { name: `Pcs ${rand}`, code: `PCS-${rand}` },
  });
  const taxRate = await testPrisma.taxRate.create({
    data: { name: `GST 18% ${rand}`, rate: 18 },
  });

  const product = await testPrisma.product.create({
    data: {
      barcode: `TEST-${Date.now()}-${rand}`,
      name: 'Test Product',
      description: 'Integration test product',
      categoryId: category.id,
      unitId: unit.id,
      taxRateId: taxRate.id,
      mrp: 11800,     // ₹118.00 in paise
      saleRate: 10000, // ₹100.00 in paise
      discountPct: 0,
    },
  });

  const inventory = await testPrisma.inventory.create({
    data: { productId: product.id, currentStock: initialStock },
  });

  return {
    id: product.id,
    inventoryId: inventory.id,
    mrp: 11800,
    saleRate: 10000,
    gstPct: 18,
    initialStock,
  };
}

/**
 * Log in a seeded user and return the JWT access token for use in Authorization headers.
 */
export async function getAuthToken(
  app: Express,
  username: string,
  password: string
): Promise<string> {
  // Inline require so this helper doesn't circularly depend on the app at module load
  const supertest = (await import('supertest')).default;
  const res = await (supertest(app) as any)
    .post('/api/v1/auth/login')
    .send({ identifier: username, password });
  if (res.status !== 200) {
    throw new Error(`Login failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.token as string;
}

/**
 * cash.test.ts — Integration tests for cash reconciliation pipeline
 *
 * Locks in Part 8 P0 fixes:
 *  - POST /cash/day-close: variance math (countedCash - systemCash), status classification
 *  - POST /cash/manager-report: finalVariance = bna + upi + card - systemTotalSales
 *  - POST /cash/manager-report/:id/approve: sets accountantApproved=true in DB
 *  - PATCH /cash/report/:id/override: requires reason, writes AuditLog entry
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env.test'), override: false });

import { createApp } from '../app.js';
import {
  testPrisma,
  cleanDb,
  seedUser,
  seedRegister,
  getAuthToken,
} from './helpers/testDb.js';
import { resetRateLimiterForTest } from '../middleware/rateLimiter.middleware.js';

const app = createApp();
const request = supertest(app);

beforeAll(async () => {
  await cleanDb();
});

beforeEach(() => {
  resetRateLimiterForTest();
});

afterEach(async () => {
  await cleanDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

// ── POST /api/v1/cash/day-close ───────────────────────────────────────────────

describe('POST /api/v1/cash/day-close', () => {
  it('saves day close with correct variance: countedCash - systemCash', async () => {
    const register = await seedRegister();
    await seedUser({ username: 'cashier_dc', password: 'DayClose@1', staffId: 300301, role: 'CASHIER' });
    const token = await getAuthToken(app as any, 'cashier_dc', 'DayClose@1');

    const systemCash = 500000; // ₹5000 in paise
    const countedCash = 498000; // ₹4980 → short by ₹20 = -2000 paise

    const res = await request
      .post('/api/v1/cash/day-close')
      .set('Authorization', `Bearer ${token}`)
      .send({
        registerId: register.id,
        systemCash,
        systemCard: 0,
        systemUPI: 0,
        countedCash,
        denominations: { d500: 9, d200: 4, d100: 1, d50: 0, d20: 4, d10: 0, d5: 0, d2: 0, d1: 0 },
        useBNACount: false,
        isCloseReturn: false,
      });

    expect(res.status).toBe(201);
    const record = res.body.closeRecord;
    expect(record.variance).toBe(countedCash - systemCash); // -2000
    expect(record.status).toBe('SHORT');

    // Verify persisted in DB
    const dbRecord = await testPrisma.registerClose.findUnique({ where: { id: record.id } });
    expect(dbRecord?.variance).toBe(-2000);
    expect(dbRecord?.status).toBe('SHORT');
  });

  it('classifies EXCESS when countedCash > systemCash', async () => {
    const register = await seedRegister();
    await seedUser({ username: 'cashier_ex', password: 'Excess@Pass1', staffId: 300302, role: 'CASHIER' });
    const token = await getAuthToken(app as any, 'cashier_ex', 'Excess@Pass1');

    const res = await request
      .post('/api/v1/cash/day-close')
      .set('Authorization', `Bearer ${token}`)
      .send({
        registerId: register.id,
        systemCash: 100000,
        systemCard: 0,
        systemUPI: 0,
        countedCash: 105000, // excess by 5000 paise
        denominations: { d500: 2, d200: 0, d100: 0, d50: 0, d20: 0, d10: 0, d5: 0, d2: 0, d1: 0 },
      });

    expect(res.status).toBe(201);
    expect(res.body.closeRecord.status).toBe('EXCESS');
    expect(res.body.closeRecord.variance).toBe(5000);
  });

  it('classifies MATCHED when countedCash === systemCash', async () => {
    const register = await seedRegister();
    await seedUser({ username: 'cashier_ok', password: 'Matched@Pass1', staffId: 300303, role: 'CASHIER' });
    const token = await getAuthToken(app as any, 'cashier_ok', 'Matched@Pass1');

    const res = await request
      .post('/api/v1/cash/day-close')
      .set('Authorization', `Bearer ${token}`)
      .send({
        registerId: register.id,
        systemCash: 200000,
        systemCard: 0,
        systemUPI: 0,
        countedCash: 200000,
        denominations: { d500: 4, d200: 0, d100: 0, d50: 0, d20: 0, d10: 0, d5: 0, d2: 0, d1: 0 },
      });

    expect(res.status).toBe(201);
    expect(res.body.closeRecord.status).toBe('MATCHED');
    expect(res.body.closeRecord.variance).toBe(0);
  });

  it('returns 400 when required fields are missing', async () => {
    const register = await seedRegister();
    await seedUser({ username: 'cashier_bad', password: 'Bad@Pass1', staffId: 300304, role: 'CASHIER' });
    const token = await getAuthToken(app as any, 'cashier_bad', 'Bad@Pass1');

    const res = await request
      .post('/api/v1/cash/day-close')
      .set('Authorization', `Bearer ${token}`)
      .send({ registerId: register.id }); // missing countedCash and denominations

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });
});

// ── POST /api/v1/cash/manager-report ─────────────────────────────────────────

describe('POST /api/v1/cash/manager-report', () => {
  it('stores report with correct finalVariance = bna + upi + card - system', async () => {
    const register = await seedRegister();
    await seedUser({ username: 'mgr_report', password: 'MgrRep@Pass1', staffId: 300401, role: 'STORE_MANAGER' });
    const token = await getAuthToken(app as any, 'mgr_report', 'MgrRep@Pass1');

    const bnaReportedAmount = 450000; // ₹4500
    const upiTotal = 100000;           // ₹1000
    const cardTotal = 50000;           // ₹500
    const systemTotalSales = 600000;  // ₹6000
    // Expected variance = 450000 + 100000 + 50000 - 600000 = 0 (MATCHED)

    const res = await request
      .post('/api/v1/cash/manager-report')
      .set('Authorization', `Bearer ${token}`)
      .send({
        registerId: register.id,
        posNumber: 'POS-01',
        cashOfficerStaffId: 300099,
        cashOfficerName: 'Test Officer',
        denominations: { d500: 9 },
        cashTotal: bnaReportedAmount,
        upiTotal,
        cardTotal,
        bnaReportedAmount,
        systemTotalSales,
      });

    expect(res.status).toBe(201);
    expect(res.body.report.finalVariance).toBe(0);
    expect(res.body.report.varianceStatus).toBe('MATCHED');
  });

  it('computes SHORT variance correctly', async () => {
    const register = await seedRegister();
    await seedUser({ username: 'mgr_short', password: 'Short@Pass1', staffId: 300402, role: 'STORE_MANAGER' });
    const token = await getAuthToken(app as any, 'mgr_short', 'Short@Pass1');

    const res = await request
      .post('/api/v1/cash/manager-report')
      .set('Authorization', `Bearer ${token}`)
      .send({
        registerId: register.id,
        posNumber: 'POS-02',
        cashOfficerStaffId: 300099,
        cashOfficerName: 'Test Officer',
        denominations: {},
        cashTotal: 300000,
        upiTotal: 0,
        cardTotal: 0,
        bnaReportedAmount: 300000,
        systemTotalSales: 350000, // ₹3500 system vs ₹3000 collected
      });

    expect(res.status).toBe(201);
    expect(res.body.report.finalVariance).toBe(-50000); // 300k - 350k = -50k
    expect(res.body.report.varianceStatus).toBe('SHORT');
  });

  it('returns 400 when bnaReportedAmount or cashTotal are missing', async () => {
    const register = await seedRegister();
    await seedUser({ username: 'mgr_nodata', password: 'NoData@Pass1', staffId: 300403, role: 'STORE_MANAGER' });
    const token = await getAuthToken(app as any, 'mgr_nodata', 'NoData@Pass1');

    const res = await request
      .post('/api/v1/cash/manager-report')
      .set('Authorization', `Bearer ${token}`)
      .send({ registerId: register.id }); // missing required amounts

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });
});

// ── POST /api/v1/cash/manager-report/:id/approve ──────────────────────────────

describe('POST /api/v1/cash/manager-report/:id/approve', () => {
  async function createReport(token: string, registerId: string) {
    const res = await request
      .post('/api/v1/cash/manager-report')
      .set('Authorization', `Bearer ${token}`)
      .send({
        registerId,
        posNumber: 'POS-01',
        cashOfficerStaffId: 300099,
        cashOfficerName: 'Test Officer',
        denominations: {},
        cashTotal: 200000,
        upiTotal: 0,
        cardTotal: 0,
        bnaReportedAmount: 200000,
        systemTotalSales: 200000,
      });
    return res.body.report.id as string;
  }

  it('sets accountantApproved=true and records AuditLog', async () => {
    const register = await seedRegister();
    // Manager creates the report
    await seedUser({ username: 'mgr_approve', password: 'MgrApp@Pass1', staffId: 300501, role: 'STORE_MANAGER' });
    const mgrToken = await getAuthToken(app as any, 'mgr_approve', 'MgrApp@Pass1');
    const reportId = await createReport(mgrToken, register.id);

    // Accountant approves using the REAL report ID
    await seedUser({ username: 'acct_approve', password: 'AcctApp@Pass1', staffId: 300502, role: 'ACCOUNTANT' });
    const acctToken = await getAuthToken(app as any, 'acct_approve', 'AcctApp@Pass1');

    const res = await request
      .post(`/api/v1/cash/manager-report/${reportId}/approve`)
      .set('Authorization', `Bearer ${acctToken}`);

    expect(res.status).toBe(200);
    expect(res.body.report.accountantApproved).toBe(true);
    expect(res.body.report.accountantApprovedBy).toBeTruthy();

    // Verify persisted in DB
    const dbReport = await testPrisma.managerCashReport.findUnique({ where: { id: reportId } });
    expect(dbReport?.accountantApproved).toBe(true);
    expect(dbReport?.accountantApprovedAt).toBeDefined();

    // Verify AuditLog entry was written
    const auditEntry = await testPrisma.auditLog.findFirst({
      where: { entityId: reportId, action: 'ACCOUNTANT_APPROVE_DAY_CLOSE' },
    });
    expect(auditEntry).toBeDefined();
  });

  it('returns 403 when a non-accountant tries to approve', async () => {
    const register = await seedRegister();
    await seedUser({ username: 'cashier_noapprove', password: 'NoApprove@1', staffId: 300503, role: 'CASHIER' });
    const cashierToken = await getAuthToken(app as any, 'cashier_noapprove', 'NoApprove@1');

    // Cashier tries to approve — should be rejected
    const res = await request
      .post('/api/v1/cash/manager-report/any-fake-id/approve')
      .set('Authorization', `Bearer ${cashierToken}`);

    expect(res.status).toBe(403);
  });
});

// ── PATCH /api/v1/cash/report/:id/override ───────────────────────────────────

describe('PATCH /api/v1/cash/report/:id/override', () => {
  async function createReportAsManager(registerId: string): Promise<{ token: string; reportId: string }> {
    await seedUser({ username: `mgr_ovr_${Date.now()}`, password: 'OvrMgr@Pass1', staffId: 300601 + Math.floor(Math.random() * 10), role: 'STORE_MANAGER' });
    // Get fresh users
    const mgr = await testPrisma.user.findFirst({ where: { role: 'STORE_MANAGER' } });
    const token = await getAuthToken(app as any, mgr!.username, 'OvrMgr@Pass1');
    const res = await request
      .post('/api/v1/cash/manager-report')
      .set('Authorization', `Bearer ${token}`)
      .send({
        registerId,
        posNumber: 'POS-01',
        cashOfficerStaffId: 300099,
        cashOfficerName: 'Officer Test',
        denominations: {},
        cashTotal: 100000,
        upiTotal: 0,
        cardTotal: 0,
        bnaReportedAmount: 100000,
        systemTotalSales: 100000,
      });
    return { token, reportId: res.body.report.id };
  }

  it('updates the report and writes AuditLog when reason is provided', async () => {
    const register = await seedRegister();
    const { token, reportId } = await createReportAsManager(register.id);

    const res = await request
      .patch(`/api/v1/cash/report/${reportId}/override`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        bnaReportedAmount: 98000, // correction: ₹980 instead of ₹1000
        reason: 'BNA machine slip mismatch — confirmed by physical count',
      });

    expect(res.status).toBe(200);
    expect(res.body.report.bnaReportedAmount).toBe(98000);

    // Verify AuditLog was written with the reason
    const auditLog = await testPrisma.auditLog.findFirst({
      where: { entityId: reportId, action: 'OVERRIDE_CASH_REPORT' },
    });
    expect(auditLog).toBeDefined();
    expect(auditLog?.reason).toBe('BNA machine slip mismatch — confirmed by physical count');
  });

  it('returns 400 when reason is missing or empty', async () => {
    const register = await seedRegister();
    const { token, reportId } = await createReportAsManager(register.id);

    const res = await request
      .patch(`/api/v1/cash/report/${reportId}/override`)
      .set('Authorization', `Bearer ${token}`)
      .send({ bnaReportedAmount: 99000, reason: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/reason/i);
  });

  it('returns 403 when a cashier (non-manager) tries to override', async () => {
    const register = await seedRegister();
    await seedUser({ username: 'cashier_noovr', password: 'NoOvr@Pass1', staffId: 300611, role: 'CASHIER' });
    const cashierToken = await getAuthToken(app as any, 'cashier_noovr', 'NoOvr@Pass1');

    const res = await request
      .patch('/api/v1/cash/report/any-fake-id/override')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ bnaReportedAmount: 10000, reason: 'Test reason' });

    expect(res.status).toBe(403);
  });
});

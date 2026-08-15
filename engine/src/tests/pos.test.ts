/**
 * pos.test.ts — Integration tests for POST /pos/invoice and held bills
 *
 * Locks in Part 1 (stock decrement atomicity) and Part 7 (multi-terminal held bill sync):
 *  - Invoice creation decrements inventory in the DB transaction
 *  - isReturn=true increments stock (sale return path)
 *  - totalAmount and changeDue are computed correctly
 *  - Held bills are stored and visible to all terminals
 *  - DELETE /pos/held-bills/:id removes the bill from the DB
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
  seedProduct,
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

// ── POST /api/v1/pos/invoice ─────────────────────────────────────────────────

describe('POST /api/v1/pos/invoice', () => {
  it('creates invoice and decrements inventory stock atomically', async () => {
    const register = await seedRegister();
    const product = await seedProduct(50); // 50 units in stock
    await seedUser({ username: 'pos_cashier', password: 'CashierPass1', staffId: 300101, role: 'CASHIER' });
    const token = await getAuthToken(app as any, 'pos_cashier', 'CashierPass1');

    const netRate = Math.round(product.saleRate * (1 + product.gstPct / 100)); // 10000 * 1.18 = 11800

    const res = await request
      .post('/api/v1/pos/invoice')
      .set('Authorization', `Bearer ${token}`)
      .send({
        registerId: register.id,
        saleType: 'RETAIL',
        paymentMode: 'CASH',
        paidCash: 23600, // ₹236 in paise for 2 units
        items: [
          {
            id: product.id,
            qty: 2,
            mrp: product.mrp,
            rate: product.saleRate,
            discountPercent: 0,
            discountAmount: 0,
            gstPercent: product.gstPct,
            netRate,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.invoice).toBeDefined();
    expect(res.body.invoice.invoiceNo).toMatch(/^AFM-\d{4}-\d{6}$/);

    // Verify stock was decremented in DB
    const inv = await testPrisma.inventory.findUnique({ where: { productId: product.id } });
    expect(inv?.currentStock).toBe(48); // 50 - 2
  });

  it('records correct totalAmount and changeDue on invoice', async () => {
    const register = await seedRegister();
    const product = await seedProduct(20);
    await seedUser({ username: 'pos_calc', password: 'CalcPass@1', staffId: 300102, role: 'CASHIER' });
    const token = await getAuthToken(app as any, 'pos_calc', 'CalcPass@1');

    const netRate = Math.round(product.saleRate * (1 + product.gstPct / 100)); // 11800
    const paidCash = 15000; // ₹150 paid for ₹118 item → change = ₹32 = 3200 paise

    const res = await request
      .post('/api/v1/pos/invoice')
      .set('Authorization', `Bearer ${token}`)
      .send({
        registerId: register.id,
        saleType: 'RETAIL',
        paymentMode: 'CASH',
        paidCash,
        items: [
          {
            id: product.id,
            qty: 1,
            mrp: product.mrp,
            rate: product.saleRate,
            discountPercent: 0,
            discountAmount: 0,
            gstPercent: product.gstPct,
            netRate,
          },
        ],
      });

    expect(res.status).toBe(201);
    const inv = res.body.invoice;
    expect(inv.totalAmount).toBe(netRate);       // 11800 paise
    expect(inv.changeDue).toBe(paidCash - netRate); // 15000 - 11800 = 3200
  });

  it('returns 400 when items array is empty', async () => {
    const register = await seedRegister();
    await seedUser({ username: 'pos_empty', password: 'EmptyPass1', staffId: 300103, role: 'CASHIER' });
    const token = await getAuthToken(app as any, 'pos_empty', 'EmptyPass1');

    const res = await request
      .post('/api/v1/pos/invoice')
      .set('Authorization', `Bearer ${token}`)
      .send({ registerId: register.id, paymentMode: 'CASH', paidCash: 0, items: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least one item/i);
  });

  it('increments stock when isReturn=true (sale return path)', async () => {
    const register = await seedRegister();
    const product = await seedProduct(10);
    await seedUser({ username: 'pos_return', password: 'ReturnPass1', staffId: 300104, role: 'CASHIER' });
    const token = await getAuthToken(app as any, 'pos_return', 'ReturnPass1');

    const netRate = Math.round(product.saleRate * (1 + product.gstPct / 100));

    const res = await request
      .post('/api/v1/pos/invoice')
      .set('Authorization', `Bearer ${token}`)
      .send({
        registerId: register.id,
        saleType: 'RETAIL',
        paymentMode: 'CASH',
        paidCash: netRate,
        isReturn: true,
        items: [
          {
            id: product.id,
            qty: 3,
            mrp: product.mrp,
            rate: product.saleRate,
            discountPercent: 0,
            discountAmount: 0,
            gstPercent: product.gstPct,
            netRate,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.invoice.status).toBe('RETURNED');

    // Stock must have increased
    const inv = await testPrisma.inventory.findUnique({ where: { productId: product.id } });
    expect(inv?.currentStock).toBe(13); // 10 + 3
  });

  it('records a StockMovement entry for each invoice item', async () => {
    const register = await seedRegister();
    const product = await seedProduct(30);
    await seedUser({ username: 'pos_movement', password: 'MovPass@1', staffId: 300105, role: 'CASHIER' });
    const token = await getAuthToken(app as any, 'pos_movement', 'MovPass@1');

    const netRate = Math.round(product.saleRate * (1 + product.gstPct / 100));

    const res = await request
      .post('/api/v1/pos/invoice')
      .set('Authorization', `Bearer ${token}`)
      .send({
        registerId: register.id,
        saleType: 'RETAIL',
        paymentMode: 'CASH',
        paidCash: netRate * 2,
        items: [{ id: product.id, qty: 2, mrp: product.mrp, rate: product.saleRate, discountPercent: 0, discountAmount: 0, gstPercent: product.gstPct, netRate }],
      });

    expect(res.status).toBe(201);

    const inv = await testPrisma.inventory.findUnique({ where: { productId: product.id } });
    const movement = await testPrisma.stockMovement.findFirst({
      where: { inventoryId: inv!.id, type: 'SALE' },
    });

    expect(movement).toBeDefined();
    expect(movement?.quantity).toBe(-2); // negative = deducted
  });

  it('returns 401 when no auth token is provided', async () => {
    const res = await request.post('/api/v1/pos/invoice').send({ items: [] });
    expect(res.status).toBe(401);
  });
});

// ── Held Bills (Part 7 — Multi-terminal sync) ─────────────────────────────────

describe('POST /api/v1/pos/held-bills + GET + DELETE', () => {
  it('stores a held bill and makes it visible to all terminals via GET', async () => {
    await seedUser({ username: 'held_cashier', password: 'HeldPass@1', staffId: 300201, role: 'CASHIER' });
    const token = await getAuthToken(app as any, 'held_cashier', 'HeldPass@1');

    const holdPayload = {
      registerId: 'terminal-01',
      registerName: 'POS-01',
      totalAmountPaise: 25000,
      customerPhone: '9876543210',
      customerName: 'Test Customer',
      note: 'Customer will return in 5 min',
      items: [{ id: 'prod-abc', name: 'Widget', qty: 2, netRate: 12500 }],
    };

    const postRes = await request
      .post('/api/v1/pos/held-bills')
      .set('Authorization', `Bearer ${token}`)
      .send(holdPayload);

    expect(postRes.status).toBe(201);
    expect(postRes.body.heldBill.holdNo).toMatch(/^HOLD-/);

    // GET must return the bill — simulates another terminal reading it
    const getRes = await request
      .get('/api/v1/pos/held-bills')
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.heldBills).toHaveLength(1);
    expect(getRes.body.heldBills[0].registerName).toBe('POS-01');
    expect(getRes.body.heldBills[0].customerName).toBe('Test Customer');
  });

  it('DELETE recalls and removes the held bill from DB', async () => {
    await seedUser({ username: 'held_del', password: 'DelPass@1', staffId: 300202, role: 'CASHIER' });
    const token = await getAuthToken(app as any, 'held_del', 'DelPass@1');

    const postRes = await request
      .post('/api/v1/pos/held-bills')
      .set('Authorization', `Bearer ${token}`)
      .send({
        registerId: 'terminal-02',
        registerName: 'POS-02',
        totalAmountPaise: 5000,
        items: [{ id: 'prod-xyz', name: 'Item', qty: 1, netRate: 5000 }],
      });

    const billId = postRes.body.heldBill.id;

    const delRes = await request
      .delete(`/api/v1/pos/held-bills/${billId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(delRes.status).toBe(200);

    // Confirm removed from DB
    const inDb = await testPrisma.heldBill.findUnique({ where: { id: billId } });
    expect(inDb).toBeNull();
  });

  it('DELETE returns 404 for non-existent held bill', async () => {
    await seedUser({ username: 'held_404', password: 'NotFound@1', staffId: 300203, role: 'CASHIER' });
    const token = await getAuthToken(app as any, 'held_404', 'NotFound@1');

    const res = await request
      .delete('/api/v1/pos/held-bills/non-existent-uuid')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('POST returns 400 for empty items array', async () => {
    await seedUser({ username: 'held_empty', password: 'EmptyHeld@1', staffId: 300204, role: 'CASHIER' });
    const token = await getAuthToken(app as any, 'held_empty', 'EmptyHeld@1');

    const res = await request
      .post('/api/v1/pos/held-bills')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/empty/i);
  });
});

/**
 * auth.test.ts — Integration tests for POST /auth/login and POST /auth/change-password
 *
 * Locks in the Part 2 security fixes so they cannot silently regress:
 *  - bcrypt-verified passwords only (no bypass)
 *  - Account lockout after 5 consecutive failures
 *  - change-password rejects identical passwords and short passwords
 *  - All sessions invalidated on password change
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
} from './helpers/testDb.js';
import { resetRateLimiterForTest } from '../middleware/rateLimiter.middleware.js';

const app = createApp();
const request = supertest(app);

// ── Lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await cleanDb();
});

beforeEach(() => {
  resetRateLimiterForTest();
});

afterEach(async () => {
  await cleanDb();
  resetRateLimiterForTest();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

// ── POST /api/v1/auth/login ───────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  it('returns 200 with JWT token on valid credentials', async () => {
    await seedUser({ username: 'cashier01', password: 'ValidPass1', staffId: 300001 });

    const res = await request
      .post('/api/v1/auth/login')
      .send({ identifier: 'cashier01', password: 'ValidPass1' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.username).toBe('cashier01');
  });

  it('returns 401 on wrong password and reports remaining attempts', async () => {
    await seedUser({ username: 'cashier02', password: 'CorrectPass1', staffId: 300002 });

    const res = await request
      .post('/api/v1/auth/login')
      .send({ identifier: 'cashier02', password: 'WrongPass!' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Invalid/i);
    expect(res.body).toHaveProperty('remainingAttempts');
    expect(res.body.remainingAttempts).toBe(4);
  });

  it('returns 401 on non-existent user without leaking existence', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ identifier: 'no_such_user', password: 'AnyPassword1' });

    expect(res.status).toBe(401);
    // Must NOT say "user not found" — generic message prevents enumeration
    expect(res.body.error).toMatch(/Invalid/i);
  });

  it('returns 400 when identifier or password is missing', async () => {
    const noId = await request.post('/api/v1/auth/login').send({ password: 'pass' });
    expect(noId.status).toBe(400);

    const noPass = await request.post('/api/v1/auth/login').send({ identifier: 'cashier02' });
    expect(noPass.status).toBe(400);
  });

  it('locks account after 5 consecutive failed login attempts', async () => {
    await seedUser({ username: 'locktest', password: 'RealPass@1', staffId: 300003 });

    for (let i = 0; i < 5; i++) {
      await request
        .post('/api/v1/auth/login')
        .send({ identifier: 'locktest', password: 'WrongPass!' });
    }

    // 6th attempt — account should now be locked
    const res = await request
      .post('/api/v1/auth/login')
      .send({ identifier: 'locktest', password: 'RealPass@1' });

    expect(res.status).toBe(423);
    expect(res.body.isLocked).toBe(true);

    // Verify lockout is persisted in DB
    const user = await testPrisma.user.findUnique({ where: { username: 'locktest' } });
    expect(user?.isLocked).toBe(true);
    expect(user?.failedAttempts).toBeGreaterThanOrEqual(5);
    expect(user?.lockoutUntil).toBeDefined();
  });

  it('allows login by numeric staffId', async () => {
    await seedUser({ username: 'byid_user', password: 'PassById1', staffId: 300004 });

    const res = await request
      .post('/api/v1/auth/login')
      .send({ identifier: '300004', password: 'PassById1' });

    expect(res.status).toBe(200);
    expect(res.body.user.staffId).toBe(300004);
  });

  it('resets failedAttempts to 0 on successful login', async () => {
    await seedUser({ username: 'resettest', password: 'GoodPass@1', staffId: 300005 });

    // One wrong attempt first
    await request
      .post('/api/v1/auth/login')
      .send({ identifier: 'resettest', password: 'Wrong!' });

    // Correct login
    await request
      .post('/api/v1/auth/login')
      .send({ identifier: 'resettest', password: 'GoodPass@1' });

    const user = await testPrisma.user.findUnique({ where: { username: 'resettest' } });
    expect(user?.failedAttempts).toBe(0);
  });
});

// ── POST /api/v1/auth/change-password ─────────────────────────────────────────

describe('POST /api/v1/auth/change-password', () => {
  async function loginAndGetToken(username: string, password: string) {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ identifier: username, password });
    return res.body.token as string;
  }

  it('successfully changes password with valid current password', async () => {
    await seedUser({ username: 'chpass01', password: 'OldPass@123', staffId: 300011 });
    const token = await loginAndGetToken('chpass01', 'OldPass@123');

    const res = await request
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'OldPass@123', newPassword: 'NewPass@456' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated successfully/i);

    // Verify new password works
    const loginRes = await request
      .post('/api/v1/auth/login')
      .send({ identifier: 'chpass01', password: 'NewPass@456' });
    expect(loginRes.status).toBe(200);
  });

  it('rejects new password that is identical to current password', async () => {
    await seedUser({ username: 'chpass02', password: 'SamePass@1', staffId: 300012 });
    const token = await loginAndGetToken('chpass02', 'SamePass@1');

    const res = await request
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'SamePass@1', newPassword: 'SamePass@1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/different from current/i);
  });

  it('rejects new password shorter than 8 characters', async () => {
    await seedUser({ username: 'chpass03', password: 'LongPass@1', staffId: 300013 });
    const token = await loginAndGetToken('chpass03', 'LongPass@1');

    const res = await request
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'LongPass@1', newPassword: 'abc' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 8/i);
  });

  it('rejects change when current password is wrong', async () => {
    await seedUser({ username: 'chpass04', password: 'RealPass@1', staffId: 300014 });
    const token = await loginAndGetToken('chpass04', 'RealPass@1');

    const res = await request
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'WrongCurrent!', newPassword: 'NewPass@789' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/incorrect/i);
  });

  it('invalidates all sessions after password change', async () => {
    await seedUser({ username: 'chpass05', password: 'OldSess@1', staffId: 300015 });
    const token = await loginAndGetToken('chpass05', 'OldSess@1');

    await request
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'OldSess@1', newPassword: 'NewSess@99' });

    // Old token should now be rejected by /me because DB session was deleted
    const meRes = await request
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(401);

    const user = await testPrisma.user.findUnique({ where: { username: 'chpass05' } });
    const sessions = await testPrisma.session.findMany({ where: { userId: user!.id } });
    expect(sessions).toHaveLength(0);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request
      .post('/api/v1/auth/change-password')
      .send({ currentPassword: 'any', newPassword: 'NewPass@1' });

    expect(res.status).toBe(401);
  });
});

// ── GET /api/v1/auth/me ───────────────────────────────────────────────────────

describe('GET /api/v1/auth/me', () => {
  it('returns 200 with user payload for valid token', async () => {
    await seedUser({ username: 'mecheck01', password: 'MePass@1', staffId: 300021 });

    const loginRes = await request
      .post('/api/v1/auth/login')
      .send({ identifier: 'mecheck01', password: 'MePass@1' });
    const token = loginRes.body.token;

    const res = await request
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('mecheck01');
  });

  it('returns 403 for a tampered/invalid token', async () => {
    const res = await request
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer totally.invalid.token');

    expect(res.status).toBe(403);
  });

  it('returns 401 when no token is supplied', async () => {
    const res = await request.get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});


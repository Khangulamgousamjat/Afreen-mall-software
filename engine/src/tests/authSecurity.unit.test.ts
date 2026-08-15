import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { loginRateLimiter, resetRateLimiterForTest } from '../middleware/rateLimiter.middleware.js';

describe('P0 Security & Auth Unit Tests', () => {
  beforeEach(() => {
    resetRateLimiterForTest();
  });

  describe('Password Hashing & Bcrypt Verification', () => {
    it('cryptographically verifies correct passwords with bcrypt', async () => {
      const plainPassword = 'CorrectPass123!';
      const hash = await bcrypt.hash(plainPassword, 10);

      const isValid = await bcrypt.compare(plainPassword, hash);
      expect(isValid).toBe(true);

      const isInvalid = await bcrypt.compare('WrongPass123!', hash);
      expect(isInvalid).toBe(false);
    });

    it('rejects empty and wrong password comparisons', async () => {
      const hash = await bcrypt.hash('SecurePassword@2026', 10);
      const isEmptyValid = await bcrypt.compare('', hash);
      expect(isEmptyValid).toBe(false);
    });
  });

  describe('Per-IP Rate Limiting Middleware', () => {
    it('allows up to 10 attempts and blocks the 11th with HTTP 429', () => {
      const req: any = { ip: '192.168.1.100', socket: {}, headers: { 'x-test-rate-limit': 'true' } };
      const res: any = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();

      // First 10 requests should call next()
      for (let i = 0; i < 10; i++) {
        loginRateLimiter(req, res, next);
      }
      expect(next).toHaveBeenCalledTimes(10);
      expect(res.status).not.toHaveBeenCalledWith(429);

      // 11th request should trigger HTTP 429
      loginRateLimiter(req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/Too many login attempts/i),
        })
      );
    });

    it('resets rate limit for different IPs independently', () => {
      const req1: any = { ip: '10.0.0.1', socket: {}, headers: { 'x-test-rate-limit': 'true' } };
      const req2: any = { ip: '10.0.0.2', socket: {}, headers: { 'x-test-rate-limit': 'true' } };
      const res: any = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      const next = vi.fn();

      for (let i = 0; i < 10; i++) {
        loginRateLimiter(req1, res, next);
      }

      // req2 from different IP should be allowed
      loginRateLimiter(req2, res, next);
      expect(res.status).not.toHaveBeenCalledWith(429);
    });
  });

  describe('JWT Token Signing & Verification', () => {
    const secret = 'afreen_mall_dev_jwt_secret_key_2026';

    it('signs and verifies valid JWT session tokens', () => {
      const userPayload = {
        id: 'usr-300001',
        staffId: 300001,
        username: 'cashier01',
        fullName: 'Test Cashier',
        role: 'CASHIER',
        mustChangePassword: false,
      };

      const token = jwt.sign(userPayload, secret, { expiresIn: '12h' });
      const decoded = jwt.verify(token, secret) as any;

      expect(decoded.staffId).toBe(300001);
      expect(decoded.username).toBe('cashier01');
    });

    it('rejects tampered or forged JWT tokens', () => {
      const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.invalid_signature';
      expect(() => jwt.verify(tamperedToken, secret)).toThrow();
    });
  });
});

import { Request, Response, NextFunction } from 'express';

interface IpAttemptRecord {
  count: number;
  resetTime: number;
}

const ipAttemptsMap = new Map<string, IpAttemptRecord>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipAttemptsMap.entries()) {
    if (now > record.resetTime) {
      ipAttemptsMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

/**
 * Per-IP Rate Limiter for sensitive endpoints like /auth/login
 * Limits an IP to 10 login requests per minute.
 */
export const loginRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  // In test environment, skip IP rate limiting for integration test suites unless explicitly tested
  if (process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
    return next();
  }

  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxAttempts = 10;

  let record = ipAttemptsMap.get(ip);

  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    ipAttemptsMap.set(ip, record);
    return next();
  }

  record.count += 1;

  if (record.count > maxAttempts) {
    const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
    res.setHeader('Retry-After', String(retryAfterSec));
    return res.status(429).json({
      error: `Too many login attempts from this IP. Please try again in ${retryAfterSec} seconds.`,
      retryAfterSec,
    });
  }

  next();
};

export const resetRateLimiterForTest = () => {
  ipAttemptsMap.clear();
};

import { Request, Response, NextFunction } from 'express';

/**
 * Enterprise Audit & Inspection Middleware
 * Primary Security Layer: Prisma ORM Query Parameterization ($1, $2, $3).
 * Note: Real SQL injection protection is handled natively by Prisma's parameterized prepared statements.
 * This middleware operates purely as an audit logger for suspicious command patterns without blocking non-malicious user input.
 */

const SUSPICIOUS_SQLI_PATTERNS = [
  /;\s*(DROP|ALTER|TRUNCATE)\b/i,
  /\bUNION\s+ALL\s+SELECT\b/i,
  /\bEXEC(\s+|\()sp_/i,
];

function containsSuspiciousPattern(val: any): boolean {
  if (typeof val === 'string') {
    for (const pattern of SUSPICIOUS_SQLI_PATTERNS) {
      if (pattern.test(val)) {
        return true;
      }
    }
  } else if (typeof val === 'object' && val !== null) {
    for (const key of Object.keys(val)) {
      if (containsSuspiciousPattern(key) || containsSuspiciousPattern(val[key])) {
        return true;
      }
    }
  }
  return false;
}

export const sqlInjectionGuard = (req: Request, res: Response, next: NextFunction) => {
  try {
    const isSuspiciousBody = req.body && containsSuspiciousPattern(req.body);
    const isSuspiciousQuery = req.query && containsSuspiciousPattern(req.query);

    if (isSuspiciousBody || isSuspiciousQuery) {
      console.warn(`[SECURITY AUDIT LOG] Suspicious SQL keyword sequence observed from IP: ${req.ip} path: ${req.originalUrl}. Prisma query parameterization active.`);
    }

    next();
  } catch {
    next();
  }
};

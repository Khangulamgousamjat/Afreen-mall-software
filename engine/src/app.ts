import express from 'express';
import cors from 'cors';

import authRouter from './modules/auth/auth.routes.js';
import usersRouter from './modules/users/users.routes.js';
import posRouter from './modules/pos/pos.routes.js';
import cashRouter from './modules/cash/cash.routes.js';
import catalogRouter from './modules/catalog/catalog.routes.js';
import inventoryRouter from './modules/inventory/inventory.routes.js';
import purchasingRouter from './modules/purchasing/purchasing.routes.js';
import warehouseRouter from './modules/warehouse/warehouse.routes.js';
import customersRouter from './modules/customers/customers.routes.js';
import reportsRouter from './modules/reports/reports.routes.js';
import hardwareRouter from './modules/hardware/hardware.routes.js';
import salesRouter from './modules/sales/sales.routes.js';
import suppliersRouter from './modules/suppliers/suppliers.routes.js';
import accountingRouter from './modules/accounting/accounting.routes.js';
import hrmsRouter from './modules/hrms/hrms.routes.js';
import adminRouter from './modules/admin/admin.routes.js';
import biRouter from './modules/bi/bi.routes.js';

import { sqlInjectionGuard } from './middleware/sqlInjectionGuard.middleware.js';

export function createApp() {
  const app = express();

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000', 'https://afreen-mall.onrender.com', 'https://afreen-mall.vercel.app'];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (
          !origin ||
          allowedOrigins.includes(origin) ||
          origin.endsWith('.vercel.app') ||
          process.env.NODE_ENV !== 'production'
        ) {
          callback(null, true);
        } else {
          callback(new Error('CORS Policy: Origin not allowed'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      optionsSuccessStatus: 200,
    })
  );
  app.use(express.json());

  // Enterprise Security Headers (OWASP ASVS Standard)
  app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https:; script-src 'self' https:; font-src 'self' data: https:; connect-src 'self' https:;"
    );
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // WAF Global SQL Injection Shield
  app.use(sqlInjectionGuard);

  // Healthcheck endpoints
  const healthHandler = (req: express.Request, res: express.Response) => {
    res.json({ status: 'ok', store: 'Afreen Mall Internal Operations Platform API', time: new Date() });
  };
  app.get('/health', healthHandler);
  app.get('/api/v1/health', healthHandler);


  // API v1 Routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/pos', posRouter);
  app.use('/api/v1/cash', cashRouter);
  app.use('/api/v1/catalog', catalogRouter);
  app.use('/api/v1/inventory', inventoryRouter);
  app.use('/api/v1/purchasing', purchasingRouter);
  app.use('/api/v1/warehouse', warehouseRouter);
  app.use('/api/v1/customers', customersRouter);
  app.use('/api/v1/reports', reportsRouter);
  app.use('/api/v1/hardware', hardwareRouter);
  app.use('/api/v1/sales', salesRouter);
  app.use('/api/v1/suppliers', suppliersRouter);
  app.use('/api/v1/accounting', accountingRouter);
  app.use('/api/v1/hrms', hrmsRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/bi', biRouter);

  return app;
}

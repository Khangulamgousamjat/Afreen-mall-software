# Architecture — AFREEN MALL Internal Operations Platform

## Overview
Afreen Mall is a staff-only, single-tenant retail management system covering the full store lifecycle: POS billing, cash handover/reconciliation, inventory, purchasing, warehouse, B2B sales, supplier/VRM, accounting, HRMS, CRM/loyalty, reporting, BI, and system administration. Designed for shop-floor desktop browsers, packaged for later Electron/Tauri wrapping.

## System Topology & Layers
1. **Desktop Software & Presentation Layer (`electron/` & `apps/web`)**:
   - Native Windows PC Desktop Software running via Electron runtime (`AfreenMall.exe`).
   - Secure IPC Bridge (`electron/preload.ts`) providing direct hardware integration (silent ESC/POS thermal printing, POS kiosk mode, native file save dialogs, network connectivity checks).
   - React + TypeScript + Vite UI styled with Vanilla CSS design tokens supporting Dark (`#0B0F0D`) and Light (`#F0EDE4`) themes.
   - Zero external browser dependencies; offline transaction caching with automatic cloud database sync on internet restore.
   - Dedicated keyboard shortcut registry (F1-F12), USB-HID barcode scanner keyboard wedge listener.

2. **Backend (`apps/api`)**:
   - Node.js with modular Express (or NestJS-style domain modules) under `/api/v1/`.
   - Dedicated modules per business domain: Auth, Users, POS, Cash, Inventory, Purchasing, Warehouse, Sales, Suppliers, Accounting, HRMS, Customers, Reports, BI, Admin, Hardware.
   - Server-side RBAC enforcement with 20 granular roles (`RoleName` enum).
   - Parameterized queries exclusively via Prisma ORM + WAF SQL injection shield middleware.
   - Dual-token authentication (15-min JWT access token + 7-day HttpOnly refresh token).

3. **Database & Cache**:
   - PostgreSQL as relational source of truth with Prisma ORM.
   - All monetary values stored strictly as 64-bit integer paise (1 INR = 100 paise).
   - Redis for token blacklisting, session state management, and hot-product lookup caching.

4. **Hardware Integration Layer (`/api/v1/hardware`)**:
   - Barcode Scanner: USB-HID keyboard wedge simulation with `Enter` termination.
   - EDC Card Terminal: Simulated async authorization with mock transaction IDs.
   - UPI QR Generator: Dynamic Base64 UPI payload QR generation (`upi://pay?...`).
   - Thermal Receipt Printer: Formatted text-buffer generator with duplicate watermark & audit logging.

5. **Financial & Reconciliation Pipeline**:
   - Atomic multi-step operations wrapped in DB `$transaction`.
   - Immutable `AuditLog` records containing `beforeValue`, `afterValue`, and mandatory `reason` on financial overrides or stock corrections.
   - Cash reconciliation pipeline: Cashier Day Close (`RegisterClose`) → Cash Officer Handover → Manager Consolidation (`ManagerCashReport`) with BNA deposits → Accountant Approval.

# AFREEN MALL — Internal Operations Platform
## Master Build Prompt for Antigravity (Agentic IDE)

> **Purpose of this document:** Paste this entire file into Antigravity as the first message of a new session (or save it as `PROJECT_BRIEF.md` in the repo root and reference it). It is written as a directive specification, not a marketing brief — every section is something the agent should treat as a hard requirement unless explicitly told otherwise during the build.

---

## 0. How to Use This Prompt

1. Give Antigravity this entire document as the initial instruction.
2. Instruct the agent to **initialize its `brain/` memory directory first** (see §15) before writing any code — populate `architecture.md`, `stack.md`, `conventions.md`, `decisions.md`, `known-issues.md`, and `session-log.md` from the corresponding sections below, verbatim where possible.
3. Require the agent to produce an **implementation plan** and stop for your approval before scaffolding (pre-boot → plan → approval → build), mirroring the workflow already established in this project.
4. Build in the phased order given in §15. Do not let the agent skip ahead to polish/UI before the data layer and auth are working end-to-end.
5. Every module below must ship with: Prisma models, Express (or NestJS) routes, a React screen, and — where noted — integration tests.

---

## 1. Mission & Product Vision

Build **Afreen Mall — Internal Operations Platform**: a staff-only, single-tenant retail management system covering the full store lifecycle — POS billing, cash handover/reconciliation, inventory, purchasing, warehouse, B2B sales, supplier/VRM, accounting, HRMS, CRM/loyalty, reporting, BI, and system administration — running on shop-floor desktop browsers, packaged for later Electron/Tauri wrapping.

This is **not** a multi-tenant SaaS product. It is a single-store (extensible to single-company/multi-branch) internal tool. Optimize for correctness, auditability, and keyboard-driven speed at the POS counter over configurability.

---

## 2. Non-Negotiable Engineering Principles

- **TypeScript strict mode everywhere.** `any` is banned. No implicit any.
- **Money is always an integer in paise** (1 INR = 100 paise). Never store or compute money as a float. All API payloads, DB columns, and UI state carry paise; only the presentation layer divides by 100 for display.
- **Every mutating financial action must be auditable.** Any endpoint that changes cash totals, inventory stock, GL balances, or user permissions must write an immutable `AuditLog` row with `beforeValue`/`afterValue`/`reason` in the same DB transaction as the mutation.
- **No fabricated success.** A `catch` block must never call a success callback (`onSuccess`, `onClose`) or synthesize fake IDs (e.g., `Date.now().toString().slice(-6)`) to paper over a failed request. Errors must surface to the user via `getApiErrorMessage`-style helpers.
- **Parameterized queries only.** Use the ORM's query builder exclusively; never string-concatenate SQL. A lightweight WAF/audit-logging middleware for suspicious patterns is acceptable as a secondary layer, not a substitute.
- **Stock and cash mutations run inside DB transactions.** Any operation touching `Inventory.currentStock`, `StockMovement`, and the originating document (Sale, PurchaseOrder/GRN, StockAdjustment, Transfer) must be wrapped in a single `$transaction`.
- **RBAC is enforced server-side on every route**, never trusted from the client. The frontend may hide UI for UX, but the backend is the source of truth.

---

## 3. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React + TypeScript + Vite | Fast dev loop, easy to wrap in Electron/Tauri later, no server-only APIs used so it stays portable |
| Backend | Node.js — Express (modular) or NestJS (module-per-domain) | REST under `/api/v1/`; one module per business area |
| Database | PostgreSQL + Prisma ORM | Strong relational guarantees, type-safe queries, migration tooling |
| Cache/Session | Redis | Token blacklisting, session state, hot-product caching |
| Styling | Vanilla CSS with custom properties (design tokens) | No CSS-in-JS/Tailwind build step; tokens drive both dark and light themes |
| Auth | JWT access token (15 min, in-memory) + refresh token (7 day, HttpOnly cookie) | XSS-resistant token storage split |
| Containerization | Docker Compose (postgres, redis, api, web) | One-command local + prod parity |
| Testing | Vitest + Supertest against a real Postgres test DB | Integration tests over the HTTP layer, not unit-mocked |
| Exports | ExcelJS (xlsx), PDFKit (pdf), custom CSV writer | All export generation is in-process — no third-party export SaaS |
| Package management | npm workspaces monorepo | `apps/*` and `packages/*` share `packages/shared-types` |

**Do not substitute** GraphQL, ORMs other than Prisma, or a CSS framework unless the user explicitly asks — this stack is chosen deliberately for build-speed and Electron portability.

---

## 4. Monorepo Structure

```
/
├── apps/
│   ├── api/                 # Express/NestJS backend
│   │   ├── src/
│   │   │   ├── modules/<domain>/<domain>.routes.ts (+ .service.ts if NestJS)
│   │   │   ├── middleware/  # auth.ts, sqlInjectionGuard.middleware.ts
│   │   │   ├── services/    # exportService.ts, etc.
│   │   │   ├── tests/       # *.test.ts + tests/helpers/testDb.ts
│   │   │   ├── prisma.ts
│   │   │   ├── app.ts       # createApp() factory — no side effects on import
│   │   │   └── index.ts     # listens on PORT, calls createApp()
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── seed.ts
│   │   │   └── migrations/
│   │   └── Dockerfile
│   └── web/                 # Vite React frontend
│       ├── src/
│       │   ├── components/  # modals, shared widgets
│       │   ├── screens/     # one screen per sidebar item
│       │   ├── context/     # AuthContext.tsx
│       │   ├── hooks/       # useIdleTimer, useFocusTrap
│       │   ├── services/    # api.ts (axios instance), apiError.ts
│       │   ├── styles/      # index.css (design tokens)
│       │   └── constants/
│       └── Dockerfile
├── packages/
│   └── shared-types/        # RoleName, PaymentMode, SaleType, UserSession, POSCartItem, etc.
├── .github/workflows/       # ci.yml (typecheck + integration tests against Postgres service)
├── docker-compose.yml
└── package.json              # npm workspaces root
```

Enforce: **one NestJS-style module per business area** even if using plain Express Router — `AuthModule`, `POSModule`, `CashModule`, `InventoryModule`, `PurchasingModule`, `WarehouseModule`, `SalesModule`, `SuppliersModule`, `AccountingModule`, `HRMSModule`, `CustomersModule`, `ReportsModule`, `BIModule`, `AdminModule`, `HardwareModule`.

---

## 5. Architectural Decisions (record these as ADRs in `brain/decisions.md`)

1. **Monorepo vs polyrepo** → Monorepo via npm workspaces. Keeps frontend, backend, and shared types in one repo, deployed via Docker Compose.
2. **Database & ORM** → PostgreSQL + Prisma. Type safety, automatic migrations, clean Postgres mapping.
3. **CSS strategy** → Vanilla CSS + custom properties. No Tailwind/styled-components — faster compile, exact control over design tokens.
4. **Auth storage** → Access token in memory (React state/context, never localStorage), refresh token in an HttpOnly cookie. Prevents XSS token theft.
5. **Numbers/IDs** → Staff IDs auto-increment from `300000`. All other business documents (invoices, POs, GRNs, journals) use a `PREFIX-YEAR-SEQUENCE` numbering convention, ideally centralized in an admin-configurable `NumberSeries` table.

---

## 6. Coding & Naming Conventions

- TypeScript strict; no `any`.
- Prettier/ESLint formatting enforced in CI.
- JSDoc on all exported functions/classes.
- Backend: one module per screen/business-domain; DTOs validated with `class-validator` if NestJS is chosen, or manual guard-clause validation with 400 responses if Express.
- Frontend: components in `apps/web/src/components`, screens in `apps/web/src/pages` or `screens`; business logic extracted into hooks (`usePOS`, `useAuth`, `useIdleTimer`, `useFocusTrap`).
- Database: `snake_case` table/column names (or Prisma's default `PascalCase` models mapped to `snake_case` tables — pick one and be consistent); **all money columns are `Int` (paise)**.
- Every list screen must support the pattern: fetch from API, gracefully fall back to a clearly-labeled sample/demo dataset only in non-production dev builds — **never silently mask a production API failure with fake data**.

---

## 7. Data Model — Core Prisma Entities

Instruct the agent to generate a full `schema.prisma` covering at minimum these model groups. Field-level detail is intentionally left to the agent's judgment except where types are money/paise (must be `Int`) or enums (must be Prisma `enum`).

**Identity & Access**
`User` (staffId Int @unique starting 300000, username, fullName, passwordHash, role, mustChangePassword, isLocked, failedAttempts, lockoutUntil, lastLoginAt, isDeactivated, canProcessSaleReturn), `Session`, `LoginHistory`, `AuditLog` (userId?, staffId, userName, userRole, action, entityName, entityId, beforeValue Json?, afterValue Json?, reason?), `RolePermission`.

**Store & System**
`Store`, `SystemSetting`, `Company`, `Branch`, `NumberSeries`, `ApprovalRule`, `Workflow`, `FeatureFlag`, `ApiKey`, `Backup`, `SchedulerJob`, `MaintenanceState`.

**Catalog & Inventory**
`Category`, `SubCategory`, `Brand`, `Unit`, `TaxRate`, `HSNCode`, `Product` (barcode @unique, mrp Int, saleRate Int, discountPct Float, minStockLevel Int), `Inventory` (productId @unique, currentStock, reservedStock), `StockMovement` (type, quantity signed, referenceId, notes), `StockAdjustment`, `Warehouse`, `Rack`, `Bin`.

**POS & Sales**
`Register` (posNumber @unique), `Sale` (invoiceNo @unique, registerId, saleType enum, cashierStaffId, paymentMode enum, totalQty, totalDiscount, totalAmount, paidCash/paidCard/paidUPI, changeDue, transactionId, isManuallyRecovered, reprintCount, status), `SaleItem`, `SaleReturn`, `HeldBill` (holdNo @unique, cartJson String — serialized cart for cross-terminal recall).

**Cash Reconciliation Pipeline**
`RegisterClose` (cashier day-close: systemCash/Card/UPI, countedCash, denominations Json, variance, status enum MATCHED/SHORT/EXCESS), `ManagerCashReport` (cashOfficer→manager consolidation: bnaReportedAmount, upiTotal, cardTotal, systemTotalSales, finalVariance, accountantApproved Boolean).

**Purchasing**
`Supplier`, `PurchaseOrder` (poNumber @unique, status enum DRAFT/SUBMITTED/APPROVED/REJECTED/RECEIVED/COMPLETED, totalAmount), `POLineItem`, `GRN`.

**Customers / CRM**
`Customer` (phone @unique, tier, loyaltyPoints, lastVisit).

**Accounting**
`Account` (accountCode @unique, category, type DEBIT/CREDIT, balance Int), `JournalEntry`, `JournalLine` (debit/credit Int, must balance per entry).

**HRMS**
`Employee`, `AttendanceLog`, `LeaveApplication`, `PayrollBatch`, `Payslip`.

**Sales (B2B) & Suppliers Extended**
`Quotation`, `SalesOrder`, `VendorContract`, `SupplierPayment`.

**Enums required:** `RoleName` (20 roles — see §8), `SaleType` (RETAIL/WHOLESALE/INSTITUTIONAL), `PaymentMode` (CASH/CARD/UPI/SPLIT), `CashVarianceStatus` (MATCHED/SHORT/EXCESS), `PurchaseOrderStatus` (DRAFT/SUBMITTED/APPROVED/REJECTED/RECEIVED/COMPLETED).

**Rule:** every table storing money uses `Int` (paise). Every table that represents a document a human can edit after creation and that participates in cash/inventory truth (RegisterClose, ManagerCashReport, Sale) must be reachable from an `AuditLog` entry when modified post-creation.

---

## 8. Authentication, Sessions & RBAC

- Numeric 6-digit Staff ID auto-incrementing from `300000`, plus a username. Login accepts either.
- Password auth via bcrypt (cost ≥ 10). 5 consecutive failed attempts → 15-minute account lockout (`423 Locked`), tracked via `failedAttempts`/`lockoutUntil`.
- JWT access token: 15 min (backend enforces via `authenticateToken` middleware); refresh token: 7 day HttpOnly cookie.
- Absolute session TTL: 12 hours from login; 15-minute client-side idle auto-logout via activity-tracking hook.
- `mustChangePassword` flag forces a password-change modal on first login for any user created by an admin with a temporary password (shown exactly once, never re-fetchable).
- 7-day login inactivity → auto-deactivate account; reactivation requires Manager/Super Admin.

**Roles (`RoleName` enum — implement all 20):**
`SUPER_ADMIN, COMPANY_ADMIN, BRANCH_ADMIN, REGIONAL_MANAGER, STORE_MANAGER, PURCHASE_MANAGER, INVENTORY_MANAGER, FINANCE_MANAGER, HR_MANAGER, SALES_MANAGER, CRM_MANAGER, ACCOUNTANT, CASHIER, CASH_OFFICER, INVENTORY_STAFF, WAREHOUSE_STAFF, PURCHASE_TEAM, CUSTOMER_SERVICE, AUDITOR, READ_ONLY`

- `SUPER_ADMIN` bypasses all `requireRole` checks.
- User management (create/deactivate/reset-password/role-change) is restricted to `STORE_MANAGER` + `SUPER_ADMIN`.
- Cashiers see a deliberately reduced sidebar: **Sale (POS)**, **Sale Return**, **Day Close** only — nothing else. All other modules are hidden, not just disabled.
- `canProcessSaleReturn` is a per-cashier boolean permission, defaulting to `false` for new cashier accounts; toggled by Manager/Admin.

---

## 9. Module Specifications

For each module below: implement the listed REST endpoints under `/api/v1/<module>`, the corresponding Prisma writes/reads, and one React screen. All endpoints require `authenticateToken`; role-gated endpoints must additionally call `requireRole([...])`.

### 9.1 POS & Billing (`/api/v1/pos`)
- `GET /product/:barcode` — barcode/name lookup; support weighted-scale EAN-13 prefix `20`/`21` decoding (embedded weight → computed qty).
- `POST /invoice` — atomic transaction: create `Sale` + `SaleItem[]`, decrement/increment `Inventory` + write `StockMovement`, award loyalty points (1 pt / ₹100) if `customerPhone` present, generate formatted thermal receipt text.
- `GET /invoices`, `GET /next-invoice-number`, `GET /last-invoice`, `GET /invoice-by-number/:invoiceNo`.
- `GET /check-transaction-id/:id`, `POST /recover-bill` (Cash Officer+ only — manual card/UPI bill recovery with duplicate-transaction-ID guard).
- `POST /reprint-duplicate` (Cash Officer+ only — increments `reprintCount`, stamps "DUPLICATE COPY" watermark, audit-logged).
- `POST /void` (Manager+ or manager-PIN-verified — reverses sale, restores stock, audit-logged).
- `GET/POST/DELETE /held-bills` — store-wide (not per-terminal) hold/recall so any register can resume another cashier's held cart.
- `GET /registers`.
- `POST /sync-offline-queue` — idempotent bulk-insert for offline-queued sales (dedupe by `invoiceNo`).

**Frontend POS screen must implement:** full keyboard-only operability (F1–F12 shortcut registry avoiding browser-reserved keys), duplicate-barcode-scan increments qty instead of adding a row, cash rounding to nearest ₹1 (>0.50 rounds up) applied only to cash payments, focus-trap modals, active-cart `beforeunload` guard, live clock, and an offline sales queue in `localStorage` with a sync banner when connectivity returns.

### 9.2 Cash Reconciliation (`/api/v1/cash`)
- `POST /day-close` — cashier end-of-shift; variance = countedCash − systemCash; status derived (MATCHED/SHORT/EXCESS).
- `GET /day-close/list?date=` — Cash Officer handover view.
- `POST /manager-report` — manager consolidates cash + BNA + card + UPI vs system total; `finalVariance = bna + upi + card − systemTotalSales`.
- `PATCH /report/:id/override` — Manager/Accountant/Super Admin only; **mandatory non-empty `reason`**; writes before/after `AuditLog`.
- `POST /manager-report/:id/approve` — Accountant/Super Admin only; sets `accountantApproved = true` + timestamp + approver name; audit-logged.
- `GET /reports`.

**Business rule:** BNA (Bank Note Acceptor) machine deposits are cash, not a separate payment channel — `Total Cash = Counter Cash + BNA Cash`, always additive to card/UPI, never blended.

### 9.3 Inventory (`/api/v1/inventory`)
- `GET /` — list with computed `stockRatioPercentage` and traffic-light `gaugeColor` (red <50%, amber <100%, green ≥100% of min stock).
- `POST /adjust` — mandatory reason, transaction writes `StockAdjustment` + `StockMovement` + `AuditLog`.
- `POST /transfer` — inter-warehouse; blocks if `sourceWarehouse === destinationWarehouse` or insufficient stock.
- `POST /repack` — bulk→retail conversion; decrements bulk SKU, increments retail SKU, records wastage.
- `GET /ledger` — immutable `StockMovement` feed, read-only.
- `GET /reorder-suggestions` — EOQ-style suggestion where `currentStock <= minStockLevel`.
- `GET /analytics` — dead-stock/overstock/understock counts, ABC classification (80/15/5 split by value).

### 9.4 Purchasing (`/api/v1/purchasing`)
- `GET/POST /orders` — PO creation auto-generates `poNumber` (`PO-YYYY-####`), computes `totalAmount` from line items.
- `POST /grn` — Goods Receipt inside a transaction: marks PO `COMPLETED`, increments `Inventory` per line, writes `StockMovement` per line.
- `GET /suppliers`, `GET/POST /requisitions`, `POST /requisitions/:id/approve`.
- `POST /invoices/verify` — 3-way match (PO vs GRN vs Supplier Invoice), audit-logged.
- `POST /returns` — decrements inventory, generates debit note number.
- `GET /supplier-performance` — on-time delivery %, fill rate %, return rate %, overall rating.

### 9.5 Warehouse (`/api/v1/warehouse`)
- `GET /` — racks/bins tree (`Warehouse → Rack[] → Bin[]`).

### 9.6 Sales / B2B (`/api/v1/sales`)
- `GET/POST /quotations`, `GET/POST /orders`, `POST /orders/:id/deliver` (issues Delivery Order, marks DISPATCHED).
- `POST /returns` — looks up original `Sale` by invoiceNo, creates `SaleReturn`, marks original sale `RETURNED`, issues credit note number.
- `POST /collections` — AR collection receipt.
- `GET /analytics`.

### 9.7 Suppliers / VRM (`/api/v1/suppliers`)
- `GET/POST /`, `POST /contracts`, `GET /scorecards`, `GET /payables` (computed from POs minus payments), `POST /payments`, `GET /risk`.

### 9.8 Accounting & Finance (`/api/v1/accounting`)
- `GET /coa` (seed a default Chart of Accounts if empty), `POST /coa`.
- `GET /gl`, `GET/POST /journals` — **reject if `totalDebit !== totalCredit`** (double-entry enforced server-side, not just client-side).
- `GET /financial-statements` — computed Trial Balance, P&L, Balance Sheet from live `Account` balances (not hardcoded).
- `GET /gst`, `GET /gst/gstr1` (GSTN-conforming JSON export), `GET /gst/export?format=pdf|csv|xlsx`.
- `GET /bank-reconciliation`.

### 9.9 HRMS (`/api/v1/hrms`)
- `GET/POST /employees` (auto empCode `EMP-YYYY-######`), `GET /attendance`, `POST /attendance/check-in`, `GET /shifts`, `GET /recruitment`, `GET/POST /leaves`, `GET /payroll`, `POST /payroll/run` (batch-generates payslips for all active employees at a flat/derived rate — pluggable for real salary structures later).

### 9.10 Customers / CRM (`/api/v1/customers`)
- `GET / ` (search by phone/name/email), `GET /:phone`, `POST /` (register, +50 welcome points), `POST /redeem-points`, `GET /segments/rfm`, `POST /campaigns`, `GET/POST /tickets`, `POST /tickets/:id/resolve`, `POST /feedback`.

### 9.11 Reports (`/api/v1/reports`)
- `GET /export?type=sales|audit|gst&format=xlsx|pdf|csv`, `GET /dashboard` (aggregated KPIs: today/week/month revenue, growth %, payment-mode split, low-stock list, 7-day trend, recent sales, recent audit feed — all computed from live DB aggregates), `GET /gst`, `GET /audit`.

### 9.12 Business Intelligence (`/api/v1/bi`)
- `GET /executive-summary`, `GET /kpis?category=sales|inventory|purchase|finance|hr|crm`, `GET /cross-module`, `GET /branch-performance`, `GET /product-analytics`, `GET /customer-analytics`, `GET /scorecards`, `GET /forecasting`, `GET /profitability`, `GET /data-quality`, `GET /ai-insights`, `GET /export`.

### 9.13 System Administration (`/api/v1/admin`) — Manager/Super Admin only
- Security dashboard, full user CRUD + force-logout + password reset + unlock, roles & permission matrix, multi-company/branch, system config (POS/inventory/finance/HR/security/regional settings), number series, approval engine, workflow engine, sessions, audit log (paginated, filterable, immutable), login history, activity log, backup & restore (with typed "RESTORE" confirmation), system health, scheduler jobs, feature flags, API key management, licensing, maintenance mode.

### 9.14 Hardware Integration Layer (`/api/v1/hardware`) — simulated
Since there is no physical hardware in this environment, define clean interface contracts and simulate them:

| Device | Contract | Simulation |
|---|---|---|
| Barcode Scanner | Accepts a USB-HID keyboard-wedge string terminated by `Enter` | A focused input box / global keydown listener on the POS screen |
| EDC Card Terminal | `processCardPayment(amount): Promise<{success, transactionId, maskedCard, error?}>` | Mock REST call, ~1.5s delay, returns success |
| UPI QR Generator | `generateUPIQR(amount, txId): Promise<{qrCodeBase64, upiPayload}>` | Canvas-rendered QR of a `upi://pay?...` URL |
| Thermal Printer | `printReceipt(textBuffer): Promise<{success, printCount}>` | Logs to a `PrintedReceipts` table + shows a print-preview modal |

Document explicitly in `known-issues.md` that real serial/USB drivers (ESC/POS, PineLabs SDK) are out of scope for this build.

---

## 10. Frontend Application

### 10.1 Design System / Tokens
Define CSS custom properties for both themes (dark default, light via `[data-theme="light"]`):

- Dark: bg `#0B0F0D`, surface `#151C18`, accent `#10b981` (emerald), text `#E6EDE8`, muted `#6ee7b7`.
- Light: bg `#F0EDE4`, surface `#ffffff`, accent `#10b981`, text `#1a1a1a`.
- Typography: a single consistent serif or sans-serif family declared once via `--font-family` and applied globally with `!important` to prevent per-component drift.
- Flat cards (no border-radius) if the reference aesthetic is enterprise/utilitarian; adjust to taste but keep it **one consistent card style everywhere**.
- WCAG 2.4.7 compliant `:focus-visible` outline (2px solid accent, 4px soft glow) on every interactive element.
- `tabular-nums` / monospace for all numeric and monetary table cells.

### 10.2 Screen Map (sidebar order)
Dashboard → POS (Sale) → Sale Return → Day Close → Cash Reconciliation → Inventory → Purchasing → Suppliers → Sales Management → Accounting → HRMS → Warehouse → Customers → BI & Analytics → Reports → Settings → System Administration (Super Admin only badge).

Cashier role sees only: Dashboard (cashier command-center variant) → POS → Sale Return → Day Close.

### 10.3 UX Rules
- `useIdleTimer` hook: configurable timeout (default 15 min), tracks `mousemove/keydown/mousedown/click/scroll/touchstart`, calls `onIdle` to force logout.
- `useFocusTrap` hook: WCAG 2.1.2 — auto-focus first interactive element on modal open, trap Tab/Shift+Tab inside the modal, restore focus to the trigger element on close.
- Centralized keyboard shortcut registry (single source of truth) that explicitly avoids OS/browser-reserved combinations (`F5`, `F11`, `F12` alone, `Ctrl+W`, `Ctrl+T`, `Ctrl+F`).
- Every list/dashboard screen fetches from the API on mount and on a reasonable polling interval where live data matters (e.g., dashboard every 30s); never block the whole page on one failed sub-fetch — degrade section by section.
- Every destructive/financial action (void invoice, override cash report, restore backup) requires an explicit confirmation step, and for backup-restore specifically, typing a literal confirmation string.

---

## 11. Security Hardening Checklist

- [ ] bcrypt password hashing, cost ≥ 10.
- [ ] JWT signed with a secret sourced from env; **hard-fail at boot in production if `JWT_SECRET` is unset** (do not silently fall back to a dev default outside `NODE_ENV=development`).
- [ ] Account lockout after 5 failed attempts (15 min).
- [ ] Generic "Invalid Staff ID or Password" error on both wrong-password and unknown-user cases (no user enumeration).
- [ ] CORS locked to an explicit allow-list in production.
- [ ] Security headers on every response: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`, `Content-Security-Policy`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`.
- [ ] Prisma parameterized queries exclusively; a lightweight audit-only pattern-scan middleware is fine as defense-in-depth but must never be the only protection claimed.
- [ ] Every admin/override endpoint writes a full before/after `AuditLog` entry with a human-supplied `reason` where the action is a correction.
- [ ] All active sessions invalidated on password change.
- [ ] Rate-limit login and password-reset endpoints.
- [ ] Never log or return raw API keys/passwords after creation — one-time reveal only.

---

## 12. Testing Strategy

- Integration tests (Vitest + Supertest) run against a **real Postgres test database**, not mocks — `apps/api/src/tests/*.test.ts` with a `tests/helpers/testDb.ts` providing `cleanDb()`, `seedUser()`, `seedRegister()`, `seedProduct()`, `getAuthToken()`.
- Minimum required coverage before a module is considered "done":
  - Auth: login success/failure/lockout/enumeration-resistance, change-password rules, session invalidation.
  - POS: invoice creation decrements stock atomically, return path increments stock, StockMovement written, held-bills CRUD works cross-terminal.
  - Cash: variance math for day-close and manager-report, accountant-approval sets flag + writes audit log, override requires reason.
- CI (`ci.yml`): typecheck all workspaces → spin up an ephemeral Postgres service container → `prisma db push --force-reset` → run integration tests. Fail the build on any typecheck or test failure.
- Two supplementary static audits worth keeping as CI/pre-commit scripts:
  - **No fake-success in catch blocks** (scan for `catch { ... onSuccess(...) ... }` without an accompanying error-set call).
  - **No hardcoded credentials / localStorage password caching** in frontend source.

---

## 13. DevOps: Docker Compose, CI/CD, Environments

- `docker-compose.yml`: `postgres` (15-alpine), `redis` (7-alpine), `api` (built from `apps/api/Dockerfile`, depends on postgres+redis), `web` (built from `apps/web/Dockerfile`, nginx-served static build, depends on api).
- `apps/api/Dockerfile`: multi-stage, `npm install` → build `shared-types` → `prisma generate` → `tsc` build → `node dist/index.js`.
- `apps/web/Dockerfile`: multi-stage, Vite build → served via `nginx:alpine`.
- Env vars via `.env.example` at root and per-app: `DATABASE_URL`, `REDIS_URL`, `PORT`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV`, `ALLOWED_ORIGINS`, `VITE_API_URL`.
- If deploying the API to a free-tier host with cold starts, add a scheduled keep-warm ping workflow hitting `/health` every ~12 minutes.

---

## 14. Known Deferrals / Non-Goals for v1

Document these explicitly in `brain/known-issues.md` so the agent (and future sessions) don't silently attempt them or claim false completeness:

- Real hardware drivers (serial/USB ESC-POS printer, PineLabs EDC SDK) — simulated only, see §9.14.
- Biometric attendance hardware — simulated via password verification / manual punch entry.
- Multi-tenant SaaS isolation — this is a single-store/single-company system; multi-company fields exist but are not fully isolated at the query layer.
- Real payroll tax engine (PF/ESIC/TDS slabs) — flat-rate placeholder only.
- Real SMS/WhatsApp/Email delivery for CRM campaigns — logged/audited, not actually dispatched.

---

## 15. Execution Plan — Phased Build Order

**Phase 0 — Brain bootstrap.** Create `.gemini/antigravity/brain/` (or the equivalent memory directory for your agent) with `architecture.md`, `stack.md`, `conventions.md`, `decisions.md`, `known-issues.md`, `session-log.md` populated from §§3–6 and §14 above. Present a numbered implementation plan and **wait for explicit approval** before writing code.

**Phase 1 — Foundations.** npm workspaces scaffold, `shared-types` package with all enums/interfaces (§7 enums, `UserSession`, `POSCartItem`, `CashDenominations`), Prisma schema + first migration + seed script (Super Admin `Superkhan`/staffId `300000`, a handful of demo staff, sample products/categories/units/tax rates, one warehouse+rack+bin, one sample customer).

**Phase 2 — Auth & RBAC.** `/api/v1/auth` (login, change-password, me, directory), `authenticateToken`/`requireRole` middleware, `AuthContext` on the frontend, Welcome → Login → Dashboard shell with role-based sidebar filtering. Ship integration tests for this phase before moving on.

**Phase 3 — POS core loop.** Barcode lookup, cart, invoice creation with atomic stock decrement, receipt generation, Day Close screen. This is the highest-value path — do not proceed to peripheral modules until this is solid and tested.

**Phase 4 — Cash reconciliation pipeline.** Day-close → Cash Officer handover → Manager consolidation → Accountant approval, with override + audit trail.

**Phase 5 — Inventory, Purchasing, Warehouse.** Stock adjustments/transfers/repacking, PO→GRN receiving flow, rack/bin views.

**Phase 6 — Sales(B2B), Suppliers, Accounting, HRMS, CRM.** Build in whatever order matches business priority; each is largely independent once Phase 1–3 exist.

**Phase 7 — Reports, BI, Admin.** Aggregation-heavy read endpoints and the System Administration console last, since they depend on data produced by every earlier module.

**Phase 8 — Hardening pass.** Walk the checklist in §11 end-to-end, run the static audits from §12, confirm CI is green, and update `brain/session-log.md` with a final status summary.

---

## 16. Definition of Done (per module)

A module is "done" only when **all** of the following are true:

1. Prisma models exist and match §7 conventions (paise as `Int`, enums where specified).
2. Every endpoint listed in §9 for that module exists, is role-gated correctly, and returns real DB-backed data (no hardcoded response bodies left in place after Phase 1).
3. Mutating endpoints that touch cash/inventory/GL run inside a `$transaction` and write an `AuditLog` row where specified.
4. At least the "minimum required coverage" tests from §12 pass for that module, if listed.
5. The corresponding React screen renders from the live API (loading and error states handled, no silent fallback to fake data in production builds).
6. `brain/known-issues.md` and `brain/session-log.md` are updated to reflect the module's real status.

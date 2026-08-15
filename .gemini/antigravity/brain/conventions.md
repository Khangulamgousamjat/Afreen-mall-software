# Coding & Naming Conventions — AFREEN MALL

## Core Engineering Principles
- **TypeScript strict mode everywhere.** `any` is banned. No implicit any.
- **Money is always an integer in paise** (1 INR = 100 paise). Never store or compute money as a float. All API payloads, DB columns, and UI state carry paise; only the presentation layer divides by 100 for display.
- **Every mutating financial action must be auditable.** Any endpoint that changes cash totals, inventory stock, GL balances, or user permissions must write an immutable `AuditLog` row with `beforeValue`/`afterValue`/`reason` in the same DB transaction as the mutation.
- **No fabricated success.** A `catch` block must never call a success callback (`onSuccess`, `onClose`) or synthesize fake IDs (e.g., `Date.now().toString().slice(-6)`) to paper over a failed request. Errors must surface to the user via `getApiErrorMessage`-style helpers.
- **Parameterized queries only.** Use the ORM's query builder exclusively; never string-concatenate SQL. A lightweight WAF/audit-logging middleware for suspicious patterns is acceptable as a secondary layer, not a substitute.
- **Stock and cash mutations run inside DB transactions.** Any operation touching `Inventory.currentStock`, `StockMovement`, and the originating document (Sale, PurchaseOrder/GRN, StockAdjustment, Transfer) must be wrapped in a single `$transaction`.
- **RBAC is enforced server-side on every route**, never trusted from the client. The frontend may hide UI for UX, but the backend is the source of truth.

## Code Standards
- Prettier/ESLint formatting enforced in CI.
- JSDoc on all exported functions/classes.
- Backend: one module per screen/business-domain; DTOs validated with manual guard-clause validation returning explicit 400 responses.
- Frontend: components in `apps/web/src/components`, screens in `apps/web/src/screens` / `pages`; business logic extracted into hooks (`usePOS`, `useAuth`, `useIdleTimer`, `useFocusTrap`).
- Database: `PascalCase` models mapped to `snake_case` tables or consistent Prisma defaults; **all money columns are `Int` (paise)**.
- Every list screen must support the pattern: fetch from API, gracefully fall back to a clearly-labeled sample/demo dataset only in non-production dev builds — **never silently mask a production API failure with fake data**.

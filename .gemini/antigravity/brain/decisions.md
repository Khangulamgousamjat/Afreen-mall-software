# Architectural Decisions (ADRs) — AFREEN MALL

## 1. Monorepo vs Polyrepo
- **Decision:** Monorepo via npm workspaces (`apps/api`, `apps/web`, `packages/shared-types`).
- **Rationale:** Keeps frontend, backend, and shared types synchronized in one repository, deployed via Docker Compose with zero cross-repo publishing overhead.

## 2. Database & ORM
- **Decision:** PostgreSQL + Prisma ORM.
- **Rationale:** Strict relational integrity, type-safe queries, transaction guarantees (`$transaction`), and standardized migration tooling.

## 3. CSS Strategy
- **Decision:** Vanilla CSS + CSS custom properties (design tokens).
- **Rationale:** Eliminates Tailwind/styled-components compilation overhead; provides instant theme switching (Dark default `#0B0F0D` / Light `#F0EDE4`), WCAG 2.4.7 focus outlines, and seamless portability to Electron/Tauri desktop apps.

## 4. Auth Storage & Split Token Strategy
- **Decision:** Access token stored in-memory (React state/context, never in localStorage), refresh token stored in HttpOnly cookie.
- **Rationale:** Protects against XSS token extraction while providing seamless token refreshing.

## 5. Numbers & Identifier Schemes
- **Decision:** Staff IDs auto-increment from `300000`. All business documents (Invoices, POs, GRNs, Journals) use `PREFIX-YEAR-SEQUENCE` format managed via centralized `NumberSeries` table.
- **Rationale:** Professional enterprise auditability and human-readable references.

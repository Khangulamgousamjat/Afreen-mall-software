# Tech Stack — AFREEN MALL Internal Operations Platform

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React + TypeScript + Vite | Fast dev loop, easy to wrap in Electron/Tauri later, no server-only APIs used so it stays portable |
| Backend | Node.js — Express (modular) / NestJS pattern | REST under `/api/v1/`; one module per business area |
| Database | PostgreSQL + Prisma ORM | Strong relational guarantees, type-safe queries, migration tooling |
| Cache/Session | Redis | Token blacklisting, session state, hot-product caching |
| Styling | Vanilla CSS with custom properties (design tokens) | No CSS-in-JS/Tailwind build step; tokens drive both dark and light themes |
| Auth | JWT access token (15 min, in-memory) + refresh token (7 day, HttpOnly cookie) | XSS-resistant token storage split |
| Containerization | Docker Compose (postgres, redis, api, web) | One-command local + prod parity |
| Testing | Vitest + Supertest against a real Postgres test DB | Integration tests over the HTTP layer, not unit-mocked |
| Exports | ExcelJS (xlsx), PDFKit (pdf), custom CSV writer | All export generation is in-process — no third-party export SaaS |
| Package management | npm workspaces monorepo | `apps/*` and `packages/*` share `packages/shared-types` |

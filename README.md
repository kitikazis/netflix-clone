# Netflix Clone

Production-grade practice project. Monorepo (npm workspaces).

- **`apps/api`** — NestJS backend (TypeScript, modular architecture).
- **`apps/web`** — Next.js frontend (shell mínimo con SSR; catálogo/reproductor en Fases 4/7).
- `packages/shared` — shared types/DTOs _(later)_.

> Nota: todo el modelo de datos (entidades, DTOs, columnas, migraciones) y los
> módulos están nombrados **en español**.

## Stack

| Concern        | Choice                                   |
| -------------- | ---------------------------------------- |
| Backend        | NestJS 11 (TypeScript)                   |
| Database / ORM | PostgreSQL 16 + **TypeORM** (migrations) |
| Cache/sessions | Redis 7 (ioredis)                        |
| Background jobs| BullMQ _(Phase 5)_                       |
| Frontend       | Next.js + HLS.js _(Phase 7)_             |
| Transcoding    | ffmpeg → HLS _(Phase 5)_                 |
| Storage        | Cloudflare R2 (S3 API) _(Phase 6)_       |

## Prerequisites

- Node.js >= 22, npm >= 11
- Docker (for Postgres + Redis)

## Getting started

```bash
# 1. Install deps (from repo root — installs all workspaces)
npm install

# 2. Start infrastructure (Postgres + Redis)
npm run infra:up

# 3. Configure API env
cp apps/api/.env.example apps/api/.env   # adjust if needed

# 4. Aplicar migraciones (crea el esquema en Postgres)
npm run migration:run --workspace @netflix-clone/api

# 5. Run the API in watch mode
npm run dev:api

# 6. (Opcional) Front mínimo con SSR
npm run dev --workspace @netflix-clone/web
```

- API:      http://localhost:3000/api/v1
- Health:   http://localhost:3000/api/v1/health
- Swagger:  http://localhost:3000/docs
- Web:      http://localhost:3001

## Migrations (TypeORM)

Run from `apps/api`:

```bash
npm run migration:generate -- src/database/migrations/<Name>
npm run migration:run
npm run migration:revert
npm run migration:show
```

## Architecture notes

- **Config** is validated at boot (`src/config/env.validation.ts`); a bad/missing env var aborts startup. Typed slices via `registerAs` (`app`, `database`, `redis`, `jwt`).
- **DB**: `synchronize: false` everywhere — schema only ever changes through versioned migrations. `SnakeNamingStrategy` for Postgres-idiomatic column names.
- **Redis** is a global module exposing a shared ioredis client (`REDIS_CLIENT` token) with graceful shutdown.
- **Cross-cutting**: global `ValidationPipe`, response-envelope interceptor, catch-all exception filter, Terminus health checks (DB + Redis).

## Build phases

1. ✅ Project setup + module structure + config (Postgres + Redis)
2. ✅ Entidades & migraciones (usuarios, perfiles, contenido, episodios, generos, progreso_visualizacion)
   - ➕ Front mínimo `apps/web` (SSR de estado del sistema) — adelantado
3. ⬜ Multi-profile auth (JWT + refresh)
4. ⬜ Catalog API (CRUD + search + pagination)
5. ⬜ Video pipeline (BullMQ + ffmpeg → HLS)
6. ⬜ Upload + Cloudflare R2 storage
7. ⬜ Next.js frontend (SSR catalog + HLS.js player)
8. ⬜ Continue watching + history (Redis)

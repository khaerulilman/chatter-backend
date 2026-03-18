# Chatter Project — Claude Instructions

This is a full-stack social media app (Chatter) with a clean architecture backend (Node.js/Express/PostgreSQL) and a React/Vite frontend.

## Project Structure

- `backend-clean/` — Backend API (Express, PostgreSQL via `postgres` tagged template, Redis caching)
- `frontend/` — Frontend SPA (React + Vite + TypeScript + Tailwind CSS)

## Architecture Pattern

Backend follows **Clean Architecture** with dependency injection via `container.js`:

```
backend-clean/
  migrations/          → Database schema (node-pg-migrate)
  src/
    entities/          → Domain entities
    use-cases/         → Business logic (factory functions receiving dependencies)
    adapters/
      controllers/     → Express request handlers
      repositories/    → Database access layer (uses postgres tagged templates)
      services/        → External service adapters (hash, token, id, cache, image, email)
      middleware/      → Express middleware (auth, rate-limit)
      routes/          → Express route definitions
    frameworks/
      database/        → PostgreSQL connection
      redis/           → Redis connection
      email/           → Email provider
      imagekit/        → Image upload provider
    container.js       → Dependency injection wiring
```

## Key Conventions

- Database queries use `postgres` tagged template literals (NOT raw strings) — automatically parameterized
- Use cases are factory functions: `export const make{Feature}UseCases = ({ deps }) => { ... }`
- Dependencies are injected via `container.js`, never imported directly in use cases
- Notifications go through `notifyService` (injected as `notificationUseCases`)
- Redis caching is handled at the repository layer via `cache.service.js`
- IDs use nanoid (21 chars) or UUID v4 via `idService`
- Auth middleware: `verifyToken` (required) or `optionalAuth` (optional)
- Frontend API calls go through a single axios instance in `frontend/src/api/api.ts`

## Skills

- `.github/skills/create-new-api.md` — Step-by-step guide to create a new API endpoint (migration → repository → use case → controller → route → container → middleware → notification → postman → frontend API)
- `.github/skills/redis-cache-best-practices.md` — Redis caching patterns, TTL strategy, key naming, cache invalidation rules, and common pitfalls

## Commands

- Backend dev: `cd backend-clean && npm run dev`
- Frontend dev: `cd frontend && npm run dev`
- Run migrations: `cd backend-clean && npm run migrate up`
- Rollback migration: `cd backend-clean && npm run migrate down`

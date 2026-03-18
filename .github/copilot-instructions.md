# Chatter Project — Copilot Instructions

This is a full-stack social media app (Chatter) with a clean architecture backend (Node.js/Express/PostgreSQL) and a React/Vite frontend.

## Project Structure

- `backend-clean/` — Backend API (Express, PostgreSQL via `postgres` tagged template, Redis caching)
- `frontend/` — Frontend SPA (React + Vite + TypeScript + Tailwind CSS)

## Architecture Pattern

Backend follows **Clean Architecture** with dependency injection via `container.js`:

```
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

## Skills

- `.github/skills/create-new-api.md` — Step-by-step guide to create a new API endpoint
- `.github/skills/redis-cache-best-practices.md` — Redis caching patterns, TTL strategy, invalidation rules

# PreçoCerto — Development Notes

## Stack
- **Runtime**: Node.js 20+ (Express 4, vanilla HTML/JS frontend served as static files)
- **Database**: MySQL 8.4 (compose service, schema auto-initialized from `database/schema.sql`)
- **Single origin**: Express serves both the API (`/api/*`) and the frontend (`/`, `/admin`) on port 3000 — no CORS or separate origins.

## Running
- `docker compose -f docker-compose.base44.yml up -d` brings up MySQL + the app.
- The `web` service uses `node:20-alpine` with the repo bind-mounted; `npm install` runs at startup, then `npm run dev` (`node --watch src/server.js`) provides live reload.
- Health check: `GET /api/health` returns `{"status":"ok","database":"connected"}`.

## Environment
- DB credentials are local infra, wired via compose `environment:` (not secrets).
- `ADMIN_API_KEY` is the only user-facing secret. A development placeholder lives in `.env.base44-defaults`; the real value is delivered via `/run/base44/app.env` (last env_file entry, always wins). Without it the public site works but the admin panel rejects all mutations.

## Key files
- `src/server.js` — all routes, validation, static file serving
- `src/db.js` — MySQL connection pool (mysql2/promise)
- `src/realtime.js` — Server-Sent Events for live promotion updates
- `database/schema.sql` — schema + seed data (3 stores, 3 promotions)
- `public/` — frontend (index.html = vitrine, admin.html = admin panel)

## Admin panel
- Navigate to `/admin`. Enter the `ADMIN_API_KEY` in the form to unlock CRUD operations.
- Admin routes require `x-admin-key` header (handled by `adminOnly` middleware).

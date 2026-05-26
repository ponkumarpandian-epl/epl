# Badminton Team Event App

Monorepo starter for the EPL badminton tournament product requirements:

- `apps/web`: Next.js 16 frontend
- `apps/api`: ASP.NET Core 9 API
- Docker support for both services
- Root `npm run dev` orchestration so the frontend and API boot together

## Local Development

```bash
npm install
npm run dev
```

`npm run dev` will:

- run the Next.js app on `http://localhost:3000`
- start the API on `http://localhost:8080`
- use local `dotnet` if it exists, otherwise fall back to `docker compose up --build api`

## Stubbed vs Real Backend

The frontend proxy can switch between the seeded local API and a real external backend with one boolean:

```bash
USE_STUBBED_BACKEND=true
```

- `USE_STUBBED_BACKEND=true`: use the local seeded .NET API
- `USE_STUBBED_BACKEND=false`: skip starting the local seeded API and proxy the frontend to `ACTUAL_BACKEND_API_URL`

Environment variables:

```bash
USE_STUBBED_BACKEND=true
STUBBED_BACKEND_API_URL=http://localhost:8080/api
ACTUAL_BACKEND_API_URL=https://your-real-backend.example.com/api
```

You can either export them in the shell or place them in a root `.env` file copied from `.env.example`.

Example using a real backend:

```bash
USE_STUBBED_BACKEND=false ACTUAL_BACKEND_API_URL=https://your-real-backend.example.com/api npm run dev
```

## Full Docker Stack

```bash
npm run docker:up
```

This brings up:

- `web` on `http://localhost:3000`
- `api` on `http://localhost:8080`

## Product Scope Implemented

This repo ships an MVP slice of the supplied PRD:

- cinematic landing/feed dashboard
- tournament hub with pool standings, fixtures, rankings, and knockout preview
- live scoring console with badminton scoring rules, undo, and lineup reveal
- admin surface for court status and reveal operations
- team, player, and rules views
- seeded in-memory backend data for immediate exploration

The API is intentionally in-memory for fast iteration; restarting the backend resets the seeded tournament state.

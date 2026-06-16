# GitHub Copilot / AI Agent Instructions

Short, actionable guidance to get productive quickly in this repository.

- Architecture: Next.js 13 (App Router) TypeScript app with React 19 and Tailwind.
  - Main entry: [app/layout.tsx](app/layout.tsx#L1-L1) and pages under `app/`.
  - API routes are implemented as `route.ts` files under `app/api/*` (server functions).

- Runtime and scripts:
  - Dev server: `npm run dev` (runs `next dev`).
  - Build: `npm run build`, Start: `npm run start`, Lint: `npm run lint`.
  - See package.json for exact scripts and dependency versions.

- Key libraries and integration points:
  - Supabase is the primary backend/service: see [lib/supabaseClient.ts](lib/supabaseClient.ts#L1-L10) (client) and [lib/supabaseAdmin.ts](lib/supabaseAdmin.ts#L1-L20) (server/service role).
    - Env vars used: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
    - NEVER place service role keys into client bundles — use `supabaseAdmin()` from server code.
  - Auth helpers: `@supabase/auth-helpers-nextjs` and `@supabase/ssr` are present; follow existing patterns for SSR/auth flows.
  - Email sending uses `resend` (check API routes under `app/api/emails` / `api/emails`).

- Project layout & conventions to follow:
  - UI components live in `components/` and fractal per-feature directories (e.g., `components/communications/`).
  - Shared helpers and clients are in `lib/` (use these rather than re-creating clients).
  - Use `use client` at the top of files that import `lib/supabaseClient.ts` or use browser-only hooks.
  - Server code (API handlers, data migrations, background jobs) should import and use `supabaseAdmin()`.
  - Routes and API handlers are TypeScript `route.ts` files under `app/api/...`. They run as serverless functions — prefer returning Response or Next.js Response helpers.

- Coding patterns observed (examples):
  - Creating the client for browser use: see [lib/supabaseClient.ts](lib/supabaseClient.ts#L1-L10).
  - Creating the admin client with env checks: see [lib/supabaseAdmin.ts](lib/supabaseAdmin.ts#L1-L20).
  - Layout/branding: global layout and navigation live in [app/layout.tsx](app/layout.tsx#L1-L120).

- Safety and secrets:
  - Confirm `SUPABASE_SERVICE_ROLE_KEY` is only used in server contexts (API routes, server components).
  - Do not commit `.env` files; assume secrets are provided through CI / Vercel environment variables.

- Development notes for contributors/agents:
  - To run locally: `npm install` then `npm run dev`.
  - Run lint via `npm run lint`.
  - There are no test scripts in package.json; add tests in a feature-specific PR only if requested.

- When editing or adding endpoints:
  - Follow existing `route.ts` signature and use `supabaseAdmin()` for DB writes that require service role.
  - Mirror response shapes used by frontend pages under `app/` to avoid breaking clients.

- Where to look first (quick triage):
  - Authentication & DB helpers: [lib/supabaseClient.ts](lib/supabaseClient.ts#L1-L10) and [lib/supabaseAdmin.ts](lib/supabaseAdmin.ts#L1-L20)
  - API surface: `app/api/` (multiple subfolders like `communications`, `emails`, `preinscriptions`).
  - Top-level UI: [app/layout.tsx](app/layout.tsx#L1-L120) and `components/`.

If something in these notes is unclear or you want more detail for a particular area (auth, deployments, specific API), tell me which part to expand. After your feedback I will iterate on this file.

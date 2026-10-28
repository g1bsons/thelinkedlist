# Outreach Planner

![CI](https://github.com/OWNER/outreach-planner/actions/workflows/ci.yml/badge.svg)

A TypeScript full-stack app that turns a networking method into a weekly routine: rank target employers, organize LinkedIn connections by affinity, track each contact through an outreach pipeline, and run timed 2-hour sessions that queue the next best action.

**Live demo:** _coming soon_

## Status

Week 1 of 3. Implemented so far:

- Strict TypeScript, Next.js App Router, Tailwind
- GitHub sign-in (Auth.js, JWT sessions) with every query scoped to the signed-in user
- Companies page: add, change tier (A/B/C), delete
- Contacts page: add with company and shared affinities, change pipeline stage, delete, sorted by priority score
- Prisma schema for users, companies, contacts, outreach, sessions, and goals
- Zod validators shared by forms and Server Actions
- A tested priority score that ranks who to contact next
- CI: lint, typecheck, tests, and build on every push

Planned: Connections.csv import, outreach history and follow-ups, the session page, analytics, and AI email drafts.

## Design decisions

- **CSV import instead of scraping.** LinkedIn's API does not expose your connections and scraping violates its terms, so the app imports the `Connections.csv` file from LinkedIn's data export.
- **Pure scoring logic.** `src/lib/priority.ts` has no database or framework dependency, so it is unit tested directly.
- **Authorization inside every Server Action.** Each action calls `requireUserId()` and filters by `userId` in the query itself (`updateMany`/`deleteMany` with `where: { id, userId }`), and a submitted `companyId` is checked against the user's own companies, so a forged form cannot touch another user's data.
- **One source of truth for enums.** `src/lib/domain.ts` mirrors the Prisma enums and feeds both Zod and the scoring code.

### How the priority score works

Tier sets the base (A=30, B=20, C=10). Each shared affinity adds 8 points, capped at three. Never-contacted contacts get a +10 bonus; contacts in progress gain +1 per day since the last touch, capped at 14, so follow-ups don't slip. Thanked or referred contacts score 0 and leave the queue.

## Local setup

```bash
npm install
cp .env.example .env      # fill in DATABASE_URL, AUTH_SECRET, GitHub OAuth keys
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Create a GitHub OAuth app at https://github.com/settings/developers with callback URL `http://localhost:3000/api/auth/callback/github`, then put its client id and secret in `.env` as `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`.

## Deploy (Vercel + Neon)

1. Create a Neon (or Supabase) Postgres database and copy its connection string.
2. Push this repo to GitHub and import it in Vercel.
3. Set these environment variables in Vercel: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`.
4. Create a second GitHub OAuth app for production with callback URL `https://<your-domain>/api/auth/callback/github`.
5. Run migrations against the production database once: `DATABASE_URL="<neon url>" npx prisma migrate deploy`.
6. Set the Vercel build command to `prisma generate && next build` so the Prisma client exists at build time.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Vitest unit tests |
| `npm run build` | Production build |

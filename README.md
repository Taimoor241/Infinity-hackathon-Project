# NovaWorks Technologies — Project Manager

A hackathon MVP for role-safe project and task visibility. This strict-$0 configuration does not call an AI provider.

## Stack

Next.js App Router, TypeScript, Tailwind-free custom CSS, Prisma ORM, PostgreSQL, bcrypt password hashes, signed httpOnly JWT cookie sessions, and Zod validation.

## Features

- Login/logout with seeded demo users (no signup or password reset).
- Role-filtered dashboards: administrators see all projects, managers see projects they manage, agents see their assigned work and only the related project context.
- Project detail task tables and read-only team directory.
- Transcript-only extraction requests are disabled. They return HTTP 503; the transcript is not sent to an AI provider and no data is saved.
- Admin-supplied draft objects are still validated as a whole before one database transaction saves them.
- Persistent PostgreSQL storage.

## Requirements

Node.js 20.9+ and PostgreSQL 14+. No AI API key is required.

## Setup and run

```bash
cp .env.example .env
# Edit DATABASE_URL and set SESSION_SECRET (at least 32 characters).
npm ci
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run dev
```

Open http://localhost:3000. For a quick local PostgreSQL instance, create a database named `novaworks` and set `DATABASE_URL` to `postgresql://USER:PASSWORD@localhost:5432/novaworks?schema=public`.

### Environment variables

- `DATABASE_URL` — PostgreSQL connection string.
- `SESSION_SECRET` — random signing secret, minimum 32 characters.

Never commit `.env` or real secrets. `.gitignore` excludes `.env`.

## Demo accounts

All seeded accounts use password `Demo123!`.

| Role | Email | Name |
|---|---|---|
| Admin | admin@novaworks.example | Admin |
| Manager | ayesha@novaworks.example | Ayesha Khan |
| Manager | bilal@novaworks.example | Bilal Ahmed |
| Manager | hina@novaworks.example | Hina Malik |
| Agent | ali@novaworks.example | Ali Raza |
| Agent | hamza@novaworks.example | Hamza Shah |
| Agent | sara@novaworks.example | Sara Noor |
| Agent | usman@novaworks.example | Usman Tariq |
| Agent | zain@novaworks.example | Zain Abbas |
| Agent | maryam@novaworks.example | Maryam Asif |

`npm run seed` is idempotent (upsert by email) and hashes the demo password.

## Transcript behavior and testing

- The admin transcript workflow is intentionally not available for automated extraction in strict-$0 mode. A transcript-only POST receives a 503 response and nothing is persisted or sent to an AI service.
- The endpoint still accepts a supplied draft object and applies the existing schema, role, date, and all-or-nothing transaction validation.
- The sample transcript file is retained as a fixture, but it will not be processed by an AI provider in this configuration.
- `npm run test:access` checks protected API endpoints against a running, migrated, seeded app at `http://localhost:3000`. It creates temporary access-test projects/tasks and deletes them afterward.

Acceptance fixture target: 3 projects / 12 tasks — UrbanCart (4 tasks, 40h; deadline Oct 20), QuickServe (4, 46h; deadline Oct 24), HelpDeskPro (4, 38h; deadline Oct 22). See `data/sample-transcript.txt` for names, dates, owners, hours, and rejected features.

## Deployment (optional)

Suggested $0 personal-project setup: Vercel Hobby + Neon Free PostgreSQL. Check current limits and terms first: Vercel Hobby is for personal, non-commercial use. Configure only `DATABASE_URL` and a random `SESSION_SECRET` (32+ characters) as server-side environment variables; no AI key or model variable is needed. Before public use, point a local terminal at the hosted database and run `npx prisma migrate deploy` and `npm run seed` once; then import this GitHub repository into Vercel (root directory `/`, production branch `main`) and deploy. Later pushes to `main` deploy automatically. The transcript AI workflow remains disabled, so it incurs no model API usage and sends no transcript to a provider. This seed uses known demo credentials; treat the hosted app as a public demo and do not store private data or use it for real operations without production hardening.

## Demo video / live link

- Demo video: [placeholder]
- Live application: [placeholder]

## Known limitations

- The original sample meeting transcript PDF was not supplied; the included fixture reconstructs the requested test decisions and must not be treated as the missing source transcript.
- Automated transcript extraction is disabled in strict-$0 mode; transcript-only requests return HTTP 503 without saving or sending data.
- The transcript review editor is intentionally minimal; automated extraction is disabled in this configuration.
- Sessions expire after seven days. The UI is a demo and should receive production hardening (CSRF protections, rate limits, audit logging, monitoring, and secret rotation) before use with sensitive real data.
- `npm audit` reports three high-severity findings in the Prisma 6 configuration/deepmerge toolchain; review and upgrade that toolchain before production use.
- Demo users and password are intended only for local evaluation.

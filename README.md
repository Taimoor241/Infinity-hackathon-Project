# NovaWorks Technologies — AI Project Manager

A hackathon MVP for turning meeting transcripts into projects and assigned tasks, with role-safe project visibility.

## Stack

Next.js App Router, TypeScript, Tailwind-free custom CSS, Prisma ORM, PostgreSQL, bcrypt password hashes, signed httpOnly JWT cookie sessions, Zod validation, and Anthropic Messages API.

## Features

- Login/logout with seeded demo users (no signup or password reset).
- Role-filtered dashboards: administrators see all projects, managers see projects they manage, agents see their assigned work and only the related project context.
- Project detail task tables and read-only team directory.
- Admin-only transcript extraction: server sends the transcript and only DB directory fields `id`, `name`, `role`, `skills` to Anthropic; output is validated as a whole before a single DB transaction saves it.
- Invalid fields are surfaced for JSON review; no partial persistence on AI/validation failure.
- Persistent PostgreSQL storage.

## Requirements

Node.js 20.9+ and PostgreSQL 14+. Obtain an Anthropic API key for transcript extraction.

## Setup and run

```bash
cp .env.example .env
# Edit DATABASE_URL and set SESSION_SECRET (at least 32 characters).
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run dev
```

Open http://localhost:3000. For a quick local PostgreSQL instance, create a database named `novaworks` and set `DATABASE_URL` to `postgresql://USER:PASSWORD@localhost:5432/novaworks?schema=public`.

### Environment variables

- `DATABASE_URL` — PostgreSQL connection string.
- `SESSION_SECRET` — random signing secret, minimum 32 characters.
- `ANTHROPIC_API_KEY` — server-only API key; required for extraction.
- `AI_MODEL` — Anthropic model name, defaults to `claude-3-5-sonnet-latest`.

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

## Transcript testing

1. Sign in as `admin@novaworks.example` / `Demo123!`.
2. Choose **Create from transcript**, click **Load sample transcript**, then **Create from transcript**.
3. The extraction is a genuine Anthropic API call; it is not replaced with prefilled extraction results. Review any flagged unresolved fields before saving.
4. The sample content in `data/sample-transcript.txt` is a reconstructed acceptance fixture based on the supplied brief. The referenced PDF / original Section 7 transcript was not attached in this workspace.
5. To try the changed-input test, change QuickServe integration to 12 hours and October 23, 2026 before submitting; only that task should differ.
6. After creating the fixture, Ayesha should see only UrbanCart; Ali sees their three UrbanCart tasks; Hamza sees two tasks across UrbanCart and QuickServe. Refresh the page to check persistence.
7. `npm run test:access` checks the protected API endpoints against a running, migrated, seeded app at `http://localhost:3000`. It creates temporary access-test projects/tasks and deletes them afterward.

Acceptance fixture target: 3 projects / 12 tasks — UrbanCart (4 tasks, 40h; deadline Oct 20), QuickServe (4, 46h; deadline Oct 24), HelpDeskPro (4, 38h; deadline Oct 22). See `data/sample-transcript.txt` for names, dates, owners, hours, and rejected features.

## Deployment (optional)

Suggested platform: Vercel. Suggested hosted database: Aiven free PostgreSQL (check current availability/terms). Create the Aiven database and copy its SSL-enabled PostgreSQL URI into Vercel `DATABASE_URL`; configure `SESSION_SECRET`, `ANTHROPIC_API_KEY`, and `AI_MODEL` as encrypted environment variables. Deploy the repository to Vercel, run `npx prisma migrate deploy` against the production database, then run `npm run seed` once. Verify the deployed app and remove demo accounts before any real use. Do not expose database or AI credentials in client code.

## Demo video / live link

- Demo video: [placeholder]
- Live application: [placeholder]

## Known limitations

- The original sample meeting transcript PDF was not supplied; the included fixture reconstructs the requested test decisions and must not be treated as the missing source transcript.
- Transcript generation requires a valid Anthropic API key and network access. This session did not have an Anthropic key available, so a live provider acceptance run was not possible here.
- The review step edits the extracted JSON draft in a textarea; it is intentionally minimal.
- Sessions expire after seven days. The UI is a demo and should receive production hardening (CSRF protections, rate limits, audit logging, monitoring, and secret rotation) before use with sensitive real data.
- Demo users and password are intended only for local evaluation.

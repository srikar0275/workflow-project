# Ritora Technologies

Internal project workflow management platform for Ritora Technologies. Track projects, stages, tasks, and team assignments in one place.

## Features

- **Dashboard** — Overview of all projects, blocked tasks, and recent activity
- **Projects** — Create projects with workflow templates (SaaS, Mobile, AI/RAG, or blank)
- **Stage pipeline** — Visual progress across delivery stages
- **Kanban task board** — Manage tasks per stage with status, priority, and assignees
- **Tasks** — Add, edit, and remove tasks across all projects
- **Team** — Manage developers by role (App, Backend, Frontend, AI, DevOps)
- **Auto status rollup** — Stage and project status derived from task progress

## Tech stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM + SQLite (local) — swap to PostgreSQL for production
- NextAuth.js (credentials)

## Quick start

```bash
# Install dependencies
npm install

# Set up database and seed demo data
npm run db:setup

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo login

| Email | Password | Role |
|-------|----------|------|
| admin@ritora.tech | admin123 | Admin |
| pm@ritora.tech | dev123 | Project Manager |
| backend.dev@ritora.tech | dev123 | Backend Developer |

## Features overview

| Module | Capabilities |
|--------|----------------|
| **Dashboard** | Project stats, progress, recent activity |
| **Projects** | Create projects, workflow templates, stage pipeline (add/edit/delete) |
| **Project detail** | Kanban tasks per stage — add, edit, delete tasks |
| **Tasks** | Add, edit, and remove tasks across all projects |
| **Team** | View members, admin can add users |
| **Home** | Landing page with link back to dashboard when logged in |

## Troubleshooting

**Port 3000 in use:** Stop the old server (Ctrl+C) or open the URL shown in terminal (e.g. `http://localhost:3001`).

**Manifest / 500 errors / full page reload loops:** Stop the dev server, then run a clean restart:

```bash
npm run dev:clean
```

Or manually:

```bash
Remove-Item -Recurse -Force .next
npm run dev
```

**Slow compiling in dev:** The first visit to each route compiles once; later visits should be faster. On Windows/OneDrive, avoid `dev:turbo` unless you have moved the repo outside OneDrive — use `npm run dev` (webpack). If you see `next.config.compiled.js` cache warnings, run `npm run dev:clean`.

**Prisma schema changes:** Stop the dev server, then run `npx prisma generate` before `npm run dev`.

## Environment variables

Copy `.env.example` to `.env`:

```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="your-random-secret"
NEXTAUTH_URL="http://localhost:3000"
```

Generate a secret: `openssl rand -base64 32`

## Production (PostgreSQL)

Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then run `npx prisma migrate dev` with your PostgreSQL connection string.

## Project structure

```
src/
  app/
    (dashboard)/     # Protected pages
    api/             # REST API routes
    login/           # Auth page
  components/        # UI and feature components
  lib/               # Auth, Prisma, utilities
prisma/
  schema.prisma      # Database schema
  seed.ts            # Demo data
```

## Workflow templates

When creating a project, choose a template:

- **Full-stack SaaS** — 8 stages from discovery to handoff
- **Mobile App** — 6 stages for React Native / Flutter delivery
- **AI / RAG Project** — 6 stages for AI-powered apps
- **Blank** — Start with no predefined stages

## License

Private — Ritora Technologies

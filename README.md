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
- Prisma ORM + PostgreSQL
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

Copy `.env.example` to `.env` and set a PostgreSQL URL (free tier at [neon.tech](https://neon.tech)):

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
AUTH_SECRET="your-random-secret"
AUTH_URL="http://localhost:3000"
```

Generate a secret (Windows PowerShell):

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Deploy on Vercel

1. Create a PostgreSQL database ([Neon](https://neon.tech) recommended).
2. In **Vercel → Settings → Environment Variables**, add:

| Variable | Value |
|----------|--------|
| `AUTH_SECRET` | Output from the Node command above |
| `AUTH_URL` | `https://workflow-project-ten.vercel.app` |
| `DATABASE_URL` | Your PostgreSQL connection string |

3. Push this repo and redeploy (build runs `prisma migrate deploy` automatically).
4. Seed production once from your machine:

```powershell
$env:DATABASE_URL="postgresql://..."
npm run setup:production
```

5. Sign in at your Vercel URL with `admin@ritora.tech` / `admin123`.

Redeploy after changing env vars. Check **Runtime Logs** if auth still fails.

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

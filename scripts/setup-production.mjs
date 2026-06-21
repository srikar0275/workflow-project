#!/usr/bin/env node
/**
 * One-time production setup: apply migrations and seed demo users.
 * Usage (PowerShell):
 *   $env:DATABASE_URL="postgresql://..."
 *   $env:AUTH_SECRET="your-secret"
 *   $env:AUTH_URL="https://workflow-project-ten.vercel.app"
 *   node scripts/setup-production.mjs
 */
import { execSync } from "node:child_process";

if (!process.env.DATABASE_URL?.startsWith("postgresql")) {
  console.error("Set DATABASE_URL to your PostgreSQL connection string first.");
  process.exit(1);
}

console.log("Applying migrations...");
execSync("npx prisma migrate deploy", { stdio: "inherit" });

console.log("Seeding demo users...");
execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });

console.log("Done. Sign in with admin@ritora.tech / admin123");

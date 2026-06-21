#!/usr/bin/env node
/**
 * Configure Vercel production env vars and seed the database.
 *
 * Required env vars before running:
 *   VERCEL_TOKEN   - from https://vercel.com/account/tokens
 *   DATABASE_URL   - PostgreSQL connection string (Neon recommended)
 *
 * Optional:
 *   VERCEL_PROJECT - defaults to workflow-project-ten
 *   AUTH_URL         - defaults to https://workflow-project-ten.vercel.app
 *   AUTH_SECRET      - auto-generated if omitted
 */
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;
const PROJECT_NAME = process.env.VERCEL_PROJECT ?? "workflow-project-ten";
const AUTH_URL =
  process.env.AUTH_URL ?? "https://workflow-project-ten.vercel.app";
const AUTH_SECRET =
  process.env.AUTH_SECRET ?? randomBytes(32).toString("base64");

if (!VERCEL_TOKEN) {
  console.error("Missing VERCEL_TOKEN. Create one at https://vercel.com/account/tokens");
  process.exit(1);
}

if (!DATABASE_URL?.startsWith("postgresql")) {
  console.error("Missing DATABASE_URL (postgresql://...). Create a free DB at https://neon.tech");
  process.exit(1);
}

const api = "https://api.vercel.com";

async function vercel(path, options = {}) {
  const res = await fetch(`${api}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message ?? data.message ?? res.statusText);
  }
  return data;
}

async function upsertEnv(projectId, key, value) {
  const existing = await vercel(`/v9/projects/${projectId}/env`);
  const found = existing.envs?.find((env) => env.key === key && env.target?.includes("production"));

  if (found) {
    await vercel(`/v9/projects/${projectId}/env/${found.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        key,
        value,
        type: "encrypted",
        target: ["production", "preview"],
      }),
    });
    console.log(`Updated ${key}`);
    return;
  }

  await vercel(`/v10/projects/${projectId}/env`, {
    method: "POST",
    body: JSON.stringify({
      key,
      value,
      type: "encrypted",
      target: ["production", "preview"],
    }),
  });
  console.log(`Created ${key}`);
}

async function main() {
  console.log("Looking up Vercel project...");
  const projects = await vercel("/v9/projects");
  const project = projects.projects?.find(
    (item) => item.name === PROJECT_NAME || item.name.includes("workflow-project"),
  );

  if (!project) {
    throw new Error(`Could not find Vercel project named ${PROJECT_NAME}`);
  }

  console.log(`Project: ${project.name} (${project.id})`);

  await upsertEnv(project.id, "AUTH_SECRET", AUTH_SECRET);
  await upsertEnv(project.id, "AUTH_URL", AUTH_URL);
  await upsertEnv(project.id, "DATABASE_URL", DATABASE_URL);

  console.log("\nSeeding production database...");
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL },
  });
  execSync("npx tsx prisma/seed.ts", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL },
  });

  console.log("\nTriggering redeploy...");
  await vercel(`/v13/deployments`, {
    method: "POST",
    body: JSON.stringify({
      name: project.name,
      project: project.id,
      target: "production",
      gitSource: {
        type: "github",
        ref: "main",
        repoId: project.link?.repoId,
      },
    }),
  }).catch(() => {
    console.log("Could not auto-redeploy. Redeploy manually in Vercel dashboard.");
  });

  console.log("\nDone.");
  console.log(`AUTH_SECRET=${AUTH_SECRET}`);
  console.log(`AUTH_URL=${AUTH_URL}`);
  console.log("Sign in: admin@ritora.tech / admin123");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});

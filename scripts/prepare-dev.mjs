import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const isTurbo = process.argv.includes("--turbo");
const shouldClean = process.argv.includes("--clean");
const dbPath = path.join(projectRoot, "prisma", "dev.db");
const schemaPath = path.join(projectRoot, "prisma", "schema.prisma");
const clientPath = path.join(
  projectRoot,
  "node_modules",
  ".prisma",
  "client",
  "index.js",
);

function needsPrismaGenerate() {
  if (!fs.existsSync(clientPath)) return true;
  if (!fs.existsSync(schemaPath)) return false;
  const schemaMtime = fs.statSync(schemaPath).mtimeMs;
  const clientMtime = fs.statSync(clientPath).mtimeMs;
  return schemaMtime > clientMtime;
}

function runNpmScript(script) {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  return spawnSync(npmCmd, ["run", script], {
    cwd: projectRoot,
    stdio: "inherit",
  });
}

function runPrismaGenerate() {
  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  return spawnSync(npxCmd, ["prisma", "generate"], {
    cwd: projectRoot,
    stdio: "inherit",
  });
}

function removeDir(target, label) {
  if (!fs.existsSync(target)) return;
  try {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`Cleared ${label}.`);
  } catch {
    console.warn(
      `\nCould not clear ${label}. Stop the dev server, delete it manually, then restart.\n`,
    );
  }
}

if (!fs.existsSync(dbPath)) {
  console.log("\nDatabase not found. Running db:setup...\n");
  const result = runNpmScript("db:setup");
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
} else if (needsPrismaGenerate()) {
  const generate = runPrismaGenerate();
  if (generate.status !== 0) {
    console.warn(
      "\nPrisma generate failed. Stop the dev server (Ctrl+C), run `npx prisma generate`, then restart.\n",
    );
  }
}

if (shouldClean) {
  removeDir(path.join(projectRoot, ".next"), ".next build cache");
} else {
  // Stale webpack dev caches reference next.config.compiled.js and trigger
  // full reload loops after config or component edits on Windows/OneDrive.
  removeDir(
    path.join(projectRoot, ".next", "cache", "webpack"),
    "webpack filesystem cache",
  );
}

// Turbopack on Windows/OneDrive creates stale Prisma junctions that cause 500 errors.
const turbopackModuleCache = path.join(
  projectRoot,
  ".next",
  "dev",
  "node_modules",
);
removeDir(turbopackModuleCache, "Turbopack module cache");

if (isTurbo) {
  console.warn(
    "\nNote: dev:turbo may fail on Windows/OneDrive with Prisma. Use npm run dev (webpack) if you see 500 errors.\n",
  );
}

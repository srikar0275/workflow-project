import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const isTurbo = process.argv.includes("--turbo");
const dbPath = path.join(projectRoot, "prisma", "dev.db");

if (!fs.existsSync(dbPath)) {
  console.log("\nDatabase not found. Running db:setup...\n");
  const result = spawnSync("npm", ["run", "db:setup"], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
} else {
  const generate = spawnSync("npx", ["prisma", "generate"], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true,
  });
  if (generate.status !== 0) {
    console.warn(
      "\nPrisma generate failed. Stop the dev server (Ctrl+C), run `npx prisma generate`, then restart.\n",
    );
  }
}

// Turbopack on Windows/OneDrive can leave stale hashed junctions for Prisma/bcryptjs.
// Webpack dev does not need a full cache wipe (that causes 20s+ reloads every start).
if (isTurbo) {
  const turbopackPrismaCache = path.join(
    projectRoot,
    ".next",
    "dev",
    "node_modules",
  );
  if (fs.existsSync(turbopackPrismaCache)) {
    fs.rmSync(turbopackPrismaCache, { recursive: true, force: true });
  }
}

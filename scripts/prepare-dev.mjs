import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

// Turbopack on Windows/OneDrive leaves stale hashed junctions for Prisma/bcryptjs
// that break at runtime with "Cannot find module '@prisma/client-<hash>'".
const devCachePaths = [
  path.join(projectRoot, ".next", "dev"),
  path.join(projectRoot, ".next", "cache"),
];

for (const cachePath of devCachePaths) {
  if (fs.existsSync(cachePath)) {
    fs.rmSync(cachePath, { recursive: true, force: true });
  }
}

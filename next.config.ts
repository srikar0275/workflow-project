import path from "path";
import type { NextConfig } from "next";

const projectRoot = path.join(__dirname);
const isOneDriveProject = projectRoot.includes("OneDrive");

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "zod"],
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Do not override config.cache here. A custom filesystem cache with
      // buildDependencies on next.config.ts breaks on Next 16 (looks for
      // next.config.compiled.js) and causes repeated cache failures on
      // Windows/OneDrive, forcing slow full recompiles and full reloads.

      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/node_modules/**", "**/.git/**", "**/.next/**"],
        followSymlinks: false,
        // OneDrive sync can miss native file events; polling keeps HMR stable.
        ...(isOneDriveProject
          ? { poll: 1000, aggregateTimeout: 300 }
          : {}),
      };
      config.snapshot = {
        ...config.snapshot,
        managedPaths: [/^(.+?[\\/]node_modules[\\/])/],
      };
    }
    return config;
  },
};

export default nextConfig;

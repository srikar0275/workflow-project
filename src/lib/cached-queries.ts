import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const getCachedUserDirectory = unstable_cache(
  async () =>
    prisma.user.findMany({
      select: { id: true, name: true, email: true, devRole: true },
      orderBy: { name: "asc" },
    }),
  ["user-directory"],
  { revalidate: 60 },
);

export const getCachedProjectOptions = unstable_cache(
  async () =>
    prisma.project.findMany({
      select: {
        id: true,
        name: true,
        stages: {
          select: { id: true, name: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
  ["project-options"],
  { revalidate: 60 },
);

import { prisma } from "@/lib/prisma";
import {
  countRevenueSourcesForProject,
  sumRevenueSourcesForProject,
} from "@/lib/revenue-sources";

export async function syncProjectRevenueFromSources(projectId: string) {
  const sourceCount = await countRevenueSourcesForProject(projectId);
  const revenue =
    sourceCount > 0 ? await sumRevenueSourcesForProject(projectId) : null;

  return prisma.project.update({
    where: { id: projectId },
    data: { revenue },
    select: { id: true, revenue: true },
  });
}

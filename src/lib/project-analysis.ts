import { prisma } from "@/lib/prisma";
import { getProjectStats, getProjectStatsMap } from "@/lib/project-stats";

export async function loadProjectAnalysisItems() {
  const [projects, statsMap] = await Promise.all([
    prisma.project.findMany({
      select: {
        id: true,
        name: true,
        client: true,
        status: true,
        targetDate: true,
        startDate: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    getProjectStatsMap(),
  ]);

  return projects.map((project) => {
    const stats = getProjectStats(statsMap, project.id);

    return {
      id: project.id,
      name: project.name,
      client: project.client,
      status: project.status,
      targetDate: project.targetDate?.toISOString() ?? null,
      startDate: project.startDate?.toISOString() ?? null,
      updatedAt: project.updatedAt.toISOString(),
      stageCount: stats.stageCount,
      taskCount: stats.taskCount,
      progress: stats.progress,
    };
  });
}

import { prisma } from "@/lib/prisma";

export type ProjectStats = {
  stageCount: number;
  taskCount: number;
  doneCount: number;
  progress: number;
};

export async function getProjectStatsMap(): Promise<Map<string, ProjectStats>> {
  const [stageRows, taskRows] = await Promise.all([
    prisma.stage.groupBy({
      by: ["projectId"],
      _count: { _all: true },
    }),
    prisma.task.findMany({
      select: {
        status: true,
        stage: { select: { projectId: true } },
      },
    }),
  ]);

  const map = new Map<string, ProjectStats>();

  for (const row of stageRows) {
    map.set(row.projectId, {
      stageCount: row._count._all,
      taskCount: 0,
      doneCount: 0,
      progress: 0,
    });
  }

  for (const row of taskRows) {
    const projectId = row.stage.projectId;
    let stats = map.get(projectId);
    if (!stats) {
      stats = { stageCount: 0, taskCount: 0, doneCount: 0, progress: 0 };
      map.set(projectId, stats);
    }
    stats.taskCount += 1;
    if (row.status === "DONE") {
      stats.doneCount += 1;
    }
  }

  for (const stats of map.values()) {
    stats.progress =
      stats.taskCount > 0
        ? Math.round((stats.doneCount / stats.taskCount) * 100)
        : 0;
  }

  return map;
}

export function getProjectStats(
  map: Map<string, ProjectStats>,
  projectId: string,
): ProjectStats {
  return (
    map.get(projectId) ?? {
      stageCount: 0,
      taskCount: 0,
      doneCount: 0,
      progress: 0,
    }
  );
}

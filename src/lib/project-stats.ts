import { prisma } from "@/lib/prisma";

export type ProjectStats = {
  stageCount: number;
  taskCount: number;
  doneCount: number;
  progress: number;
};

type TaskCountRow = {
  projectId: string;
  status: string;
  count: number;
};

export async function getProjectStatsMap(): Promise<Map<string, ProjectStats>> {
  const [stageRows, taskRows] = await Promise.all([
    prisma.stage.groupBy({
      by: ["projectId"],
      _count: { _all: true },
    }),
    prisma.$queryRawUnsafe<TaskCountRow[]>(
      `SELECT s.projectId AS projectId, t.status AS status, COUNT(*) AS count
       FROM Task t
       INNER JOIN Stage s ON t.stageId = s.id
       GROUP BY s.projectId, t.status`,
    ),
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
    const count = Number(row.count);
    let stats = map.get(row.projectId);
    if (!stats) {
      stats = { stageCount: 0, taskCount: 0, doneCount: 0, progress: 0 };
      map.set(row.projectId, stats);
    }
    stats.taskCount += count;
    if (row.status === "DONE") {
      stats.doneCount += count;
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

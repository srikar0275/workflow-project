import { prisma } from "@/lib/prisma";

export async function loadTaskAnalysisItems() {
  const tasks = await prisma.task.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      updatedAt: true,
      stage: {
        select: {
          name: true,
          project: { select: { id: true, name: true } },
        },
      },
      assignments: {
        select: {
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate?.toISOString() ?? null,
    updatedAt: task.updatedAt.toISOString(),
    projectId: task.stage.project.id,
    projectName: task.stage.project.name,
    stageName: task.stage.name,
    assigneeName: task.assignments[0]?.user.name ?? null,
  }));
}

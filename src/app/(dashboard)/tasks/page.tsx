import { prisma } from "@/lib/prisma";
import { TasksView } from "./tasks-view";

export default async function TasksPage() {
  const [tasks, projects, users] = await Promise.all([
    prisma.task.findMany({
      include: {
        assignments: { include: { user: { select: { id: true, name: true } } } },
        stage: {
          include: {
            project: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
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
    prisma.user.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serialized = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate?.toISOString() ?? null,
    stageId: task.stageId,
    stage: task.stage,
    assignments: task.assignments,
  }));

  return (
    <TasksView
      initialTasks={serialized}
      projects={projects}
      users={users}
    />
  );
}

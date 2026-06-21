import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import {
  getCachedProjectOptions,
  getCachedUserDirectory,
} from "@/lib/cached-queries";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { TasksView } from "./tasks-view";

export default async function TasksPage() {
  const [tasks, projects, users] = await Promise.all([
    prisma.task.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        updatedAt: true,
        stageId: true,
        stage: {
          select: {
            id: true,
            name: true,
            project: { select: { id: true, name: true } },
          },
        },
        assignments: {
          select: {
            user: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    getCachedProjectOptions(),
    getCachedUserDirectory(),
  ]);

  const serialized = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate?.toISOString() ?? null,
    updatedAt: task.updatedAt.toISOString(),
    stageId: task.stageId,
    stage: task.stage,
    assignments: task.assignments,
  }));

  return (
    <Suspense fallback={<PageSkeleton />}>
      <TasksView
        initialTasks={serialized}
        projects={projects}
        users={users}
      />
    </Suspense>
  );
}

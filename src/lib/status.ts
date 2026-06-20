import type { ProjectStatus, StageStatus, TaskStatus } from "@prisma/client";

type TaskLike = { status: TaskStatus };

export function deriveStageStatus(tasks: TaskLike[]): StageStatus {
  if (tasks.length === 0) return "NOT_STARTED";
  if (tasks.every((t) => t.status === "DONE")) return "DONE";
  if (tasks.some((t) => t.status === "BLOCKED")) return "BLOCKED";
  if (tasks.some((t) => t.status === "REVIEW")) return "REVIEW";
  if (tasks.some((t) => t.status === "IN_PROGRESS")) return "IN_PROGRESS";
  if (tasks.every((t) => t.status === "NOT_STARTED")) return "NOT_STARTED";
  return "IN_PROGRESS";
}

export function deriveProjectStatus(
  stages: { status: StageStatus }[],
  currentStatus: ProjectStatus,
): ProjectStatus {
  if (currentStatus === "CANCELLED" || currentStatus === "ON_HOLD") {
    return currentStatus;
  }
  if (stages.length === 0) return "NOT_STARTED";
  if (stages.every((s) => s.status === "DONE")) return "COMPLETED";
  if (stages.some((s) => s.status !== "NOT_STARTED")) return "IN_PROGRESS";
  return "NOT_STARTED";
}

export function calculateProgress(tasks: TaskLike[]): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.status === "DONE").length;
  return Math.round((done / tasks.length) * 100);
}

export function countTasksByStatus(tasks: TaskLike[]) {
  return tasks.reduce(
    (acc, task) => {
      acc[task.status] = (acc[task.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<TaskStatus, number>,
  );
}

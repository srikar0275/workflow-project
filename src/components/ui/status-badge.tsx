import type {
  ProjectStatus,
  StageStatus,
  TaskPriority,
  TaskStatus,
} from "@prisma/client";
import { Badge } from "@/components/ui/badge";

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const colors: Record<ProjectStatus, "default" | "cyan" | "green" | "yellow" | "red"> = {
    NOT_STARTED: "default",
    IN_PROGRESS: "cyan",
    ON_HOLD: "yellow",
    COMPLETED: "green",
    CANCELLED: "red",
  };
  const labels: Record<ProjectStatus, string> = {
    NOT_STARTED: "Not Started",
    IN_PROGRESS: "In Progress",
    ON_HOLD: "On Hold",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };
  return <Badge color={colors[status]}>{labels[status]}</Badge>;
}

export function StageStatusBadge({ status }: { status: StageStatus }) {
  const colors: Record<StageStatus, "default" | "cyan" | "green" | "yellow" | "red" | "purple"> = {
    NOT_STARTED: "default",
    IN_PROGRESS: "cyan",
    BLOCKED: "red",
    REVIEW: "purple",
    DONE: "green",
  };
  const labels: Record<StageStatus, string> = {
    NOT_STARTED: "Not Started",
    IN_PROGRESS: "In Progress",
    BLOCKED: "Blocked",
    REVIEW: "In Review",
    DONE: "Done",
  };
  return <Badge color={colors[status]}>{labels[status]}</Badge>;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const colors: Record<TaskStatus, "default" | "cyan" | "green" | "yellow" | "red" | "purple"> = {
    NOT_STARTED: "default",
    IN_PROGRESS: "cyan",
    BLOCKED: "red",
    REVIEW: "purple",
    DONE: "green",
  };
  const labels: Record<TaskStatus, string> = {
    NOT_STARTED: "Not Started",
    IN_PROGRESS: "In Progress",
    BLOCKED: "Blocked",
    REVIEW: "In Review",
    DONE: "Done",
  };
  return <Badge color={colors[status]}>{labels[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const colors: Record<TaskPriority, "default" | "cyan" | "yellow" | "red"> = {
    LOW: "default",
    MEDIUM: "cyan",
    HIGH: "yellow",
    URGENT: "red",
  };
  return <Badge color={colors[priority]}>{priority}</Badge>;
}

import type {
  DevRole,
  ProjectStatus,
  StageStatus,
  TaskPriority,
  TaskStatus,
  UserRole,
} from "@prisma/client";

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Admin",
  PROJECT_MANAGER: "Project Manager",
  DEVELOPER: "Developer",
  VIEWER: "Viewer",
};

export const DEV_ROLE_LABELS: Record<DevRole, string> = {
  APP: "App Developer",
  BACKEND: "Backend Developer",
  FRONTEND: "Frontend Developer",
  AI: "AI Developer",
  DEVOPS: "DevOps",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const STAGE_STATUS_LABELS: Record<StageStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  BLOCKED: "Blocked",
  REVIEW: "In Review",
  DONE: "Done",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  BLOCKED: "Blocked",
  REVIEW: "In Review",
  DONE: "Done",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const KANBAN_COLUMNS: TaskStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "REVIEW",
  "BLOCKED",
  "DONE",
];

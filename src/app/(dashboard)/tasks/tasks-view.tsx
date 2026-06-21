"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  PriorityBadge,
  TaskStatusBadge,
} from "@/components/ui/status-badge";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  updatedAt: string;
  stageId: string;
  stage: {
    id: string;
    name: string;
    project: { id: string; name: string };
  };
  assignments: { user: { id: string; name: string } }[];
};

type ProjectOption = {
  id: string;
  name: string;
  stages: { id: string; name: string }[];
};

type UserOption = { id: string; name: string };

type TasksViewProps = {
  initialTasks: TaskItem[];
  projects: ProjectOption[];
  users: UserOption[];
};

export function TasksView({
  initialTasks,
  projects,
  users,
}: TasksViewProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [addProjectId, setAddProjectId] = useState(projects[0]?.id ?? "");
  const [addStageId, setAddStageId] = useState(projects[0]?.stages[0]?.id ?? "");
  const [addTitle, setAddTitle] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addPriority, setAddPriority] = useState<TaskPriority>("MEDIUM");
  const [addDueDate, setAddDueDate] = useState("");
  const [addAssigneeId, setAddAssigneeId] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<TaskStatus>("NOT_STARTED");
  const [editPriority, setEditPriority] = useState<TaskPriority>("MEDIUM");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssigneeId, setEditAssigneeId] = useState("");

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const addStages = useMemo(
    () => projects.find((p) => p.id === addProjectId)?.stages ?? [],
    [projects, addProjectId],
  );

  useEffect(() => {
    if (addStages.length > 0 && !addStages.find((s) => s.id === addStageId)) {
      setAddStageId(addStages[0].id);
    }
  }, [addStages, addStageId]);

  const searchParams = useSearchParams();

  function openEdit(task: TaskItem) {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditStatus(task.status);
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
    setEditAssigneeId(task.assignments[0]?.user.id ?? "");
    setShowAddForm(false);
  }

  function closeEdit() {
    setEditingId(null);
  }

  useEffect(() => {
    if (searchParams.get("add") === "task") {
      setShowAddForm(true);
      setEditingId(null);
    }
  }, [searchParams]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addStageId) return;
    setSaving(true);

    const assignee = users.find((u) => u.id === addAssigneeId);
    const project = projects.find((p) => p.id === addProjectId);
    const stage = addStages.find((s) => s.id === addStageId);
    const tempId = `temp-${Date.now()}`;

    const optimistic: TaskItem = {
      id: tempId,
      title: addTitle,
      description: addDescription || null,
      status: "NOT_STARTED",
      priority: addPriority,
      dueDate: addDueDate || null,
      updatedAt: new Date().toISOString(),
      stageId: addStageId,
      stage: {
        id: addStageId,
        name: stage?.name ?? "",
        project: { id: addProjectId, name: project?.name ?? "" },
      },
      assignments: assignee ? [{ user: assignee }] : [],
    };

    const previous = tasks;
    setTasks((prev) => [optimistic, ...prev]);

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stageId: addStageId,
        title: addTitle,
        description: addDescription || undefined,
        priority: addPriority,
        dueDate: addDueDate || undefined,
        assigneeIds: addAssigneeId ? [addAssigneeId] : [],
      }),
    });

    setSaving(false);

    if (res.ok) {
      const created = await res.json();
      const stageInfo = projects
        .flatMap((p) =>
          p.stages.map((s) => ({ ...s, project: { id: p.id, name: p.name } })),
        )
        .find((s) => s.id === created.stageId);

      setTasks((prev) =>
        prev.map((t) =>
          t.id === tempId
            ? {
                id: created.id,
                title: created.title,
                description: created.description,
                status: created.status,
                priority: created.priority,
                dueDate: created.dueDate
                  ? new Date(created.dueDate).toISOString()
                  : null,
                updatedAt: created.updatedAt
                  ? new Date(created.updatedAt).toISOString()
                  : new Date().toISOString(),
                stageId: created.stageId,
                stage: {
                  id: stageInfo?.id ?? addStageId,
                  name: stageInfo?.name ?? "",
                  project: stageInfo?.project ?? optimistic.stage.project,
                },
                assignments: created.assignments ?? optimistic.assignments,
              }
            : t,
        ),
      );
      setAddTitle("");
      setAddDescription("");
      setAddDueDate("");
      setAddAssigneeId("");
      setShowAddForm(false);
    } else {
      setTasks(previous);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);

    const assignee = users.find((u) => u.id === editAssigneeId);
    const previous = tasks;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === editingId
          ? {
              ...t,
              title: editTitle,
              description: editDescription || null,
              status: editStatus,
              priority: editPriority,
              dueDate: editDueDate || null,
              assignments: assignee ? [{ user: assignee }] : [],
            }
          : t,
      ),
    );

    const res = await fetch(`/api/tasks/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle,
        description: editDescription || null,
        status: editStatus,
        priority: editPriority,
        dueDate: editDueDate || null,
        assigneeIds: editAssigneeId ? [editAssigneeId] : [],
      }),
    });

    setSaving(false);

    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? {
                ...t,
                title: updated.title,
                description: updated.description,
                status: updated.status,
                priority: updated.priority,
                dueDate: updated.dueDate
                  ? new Date(updated.dueDate).toISOString()
                  : null,
                assignments: updated.assignments ?? t.assignments,
              }
            : t,
        ),
      );
      closeEdit();
    } else {
      setTasks(previous);
    }
  }

  async function handleDelete(taskId: string) {
    if (!confirm("Delete this task?")) return;

    const previous = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (editingId === taskId) closeEdit();

    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (!res.ok) setTasks(previous);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="mt-1 text-slate-400">
            Add, edit, and remove tasks across all projects.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setShowAddForm(!showAddForm);
            closeEdit();
          }}
        >
          <Plus className="h-4 w-4" />
          Add task
        </Button>
      </div>

      {showAddForm && (
        <Card className="border-cyan-800/40">
          <CardContent className="pt-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium text-white">New task</p>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-slate-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Project</label>
                <Select
                  value={addProjectId}
                  onChange={(e) => setAddProjectId(e.target.value)}
                  required
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Stage</label>
                <Select
                  value={addStageId}
                  onChange={(e) => setAddStageId(e.target.value)}
                  required
                  disabled={addStages.length === 0}
                >
                  {addStages.length === 0 ? (
                    <option value="">No stages — add stages in project</option>
                  ) : (
                    addStages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))
                  )}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-400">Title</label>
                <Input
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  placeholder="Task title"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-400">
                  Description
                </label>
                <Textarea
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Priority</label>
                <Select
                  value={addPriority}
                  onChange={(e) => setAddPriority(e.target.value as TaskPriority)}
                >
                  {Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Due date</label>
                <Input
                  type="date"
                  value={addDueDate}
                  onChange={(e) => setAddDueDate(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Assignee</label>
                <Select
                  value={addAssigneeId}
                  onChange={(e) => setAddAssigneeId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={saving || !addStageId}>
                  {saving ? "Adding..." : "Add task"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            No tasks yet. Use Add task in the analysis section above.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) =>
            editingId === task.id ? (
              <Card key={task.id} className="border-cyan-800/50">
                <CardContent className="pt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-medium text-white">Edit task</p>
                    <button
                      type="button"
                      onClick={closeEdit}
                      className="text-slate-500 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <form onSubmit={handleEdit} className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs text-slate-400">Title</label>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs text-slate-400">
                        Description
                      </label>
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">Status</label>
                      <Select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                      >
                        {Object.entries(TASK_STATUS_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">Priority</label>
                      <Select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                      >
                        {Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">Due date</label>
                      <Input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">Assignee</label>
                      <Select
                        value={editAssigneeId}
                        onChange={(e) => setEditAssigneeId(e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      <Button type="submit" size="sm" disabled={saving}>
                        {saving ? "Saving..." : "Save changes"}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={closeEdit}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        className="ml-auto"
                        onClick={() => handleDelete(task.id)}
                      >
                        Delete task
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card key={task.id} className="transition-colors hover:border-slate-700">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">{task.title}</p>
                    {task.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                        {task.description}
                      </p>
                    )}
                    <Link
                      href={`/projects/${task.stage.project.id}`}
                      className="mt-1 inline-block text-sm text-cyan-400 hover:text-cyan-300"
                    >
                      {task.stage.project.name} · {task.stage.name}
                    </Link>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={task.priority} />
                    <TaskStatusBadge status={task.status} />
                    {task.assignments.map((a) => (
                      <span
                        key={a.user.id}
                        className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
                      >
                        {a.user.name.split(" ")[0]}
                      </span>
                    ))}
                    {task.dueDate && (
                      <span className="text-xs text-slate-500">
                        Due {formatDate(task.dueDate)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(task)}
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-cyan-400"
                      title="Edit task"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(task.id)}
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-red-400"
                      title="Delete task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ),
          )}
        </div>
      )}
    </div>
  );
}

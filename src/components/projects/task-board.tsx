"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PriorityBadge } from "@/components/ui/status-badge";
import {
  KANBAN_COLUMNS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/constants";
import { formatDate } from "@/lib/utils";

type User = { id: string; name: string };
export type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignments: { user: User }[];
};

export function TaskBoard({
  stageId,
  tasks,
  users,
  embedded = false,
  onTasksChange,
}: {
  stageId: string;
  tasks: Task[];
  users: User[];
  embedded?: boolean;
  onTasksChange?: (tasks: Task[]) => void;
}) {
  const [localTasks, setLocalTasks] = useState(tasks);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<TaskStatus>("NOT_STARTED");
  const [editPriority, setEditPriority] = useState<TaskPriority>("MEDIUM");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssigneeId, setEditAssigneeId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  function syncTasks(next: Task[]) {
    setLocalTasks(next);
    onTasksChange?.(next);
  }

  function openEdit(task: Task) {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditStatus(task.status);
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
    setEditAssigneeId(task.assignments[0]?.user.id ?? "");
    setShowForm(false);
  }

  function closeEdit() {
    setEditingId(null);
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const assignee = users.find((u) => u.id === assigneeId);
    const tempId = `temp-${Date.now()}`;
    const optimistic: Task = {
      id: tempId,
      title,
      description: description || null,
      status: "NOT_STARTED",
      priority,
      dueDate: dueDate || null,
      assignments: assignee ? [{ user: assignee }] : [],
    };

    syncTasks([...localTasks, optimistic]);
    setTitle("");
    setDescription("");
    setAssigneeId("");
    setPriority("MEDIUM");
    setDueDate("");
    setShowForm(false);

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stageId,
        title: optimistic.title,
        description: description || undefined,
        priority,
        dueDate: dueDate || undefined,
        assigneeIds: assigneeId ? [assigneeId] : [],
      }),
    });

    setLoading(false);
    if (res.ok) {
      const created = await res.json();
      syncTasks(
        localTasks
          .map((t) =>
            t.id === tempId
              ? {
                  ...created,
                  dueDate: created.dueDate
                    ? new Date(created.dueDate).toISOString()
                    : null,
                }
              : t,
          ),
      );
    } else {
      syncTasks(localTasks.filter((t) => t.id !== tempId));
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setLoading(true);

    const assignee = users.find((u) => u.id === editAssigneeId);
    const previous = localTasks;
    const optimistic = localTasks.map((t) =>
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
    );
    syncTasks(optimistic);

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

    setLoading(false);
    if (res.ok) {
      const updated = await res.json();
      syncTasks(
        optimistic.map((t) =>
          t.id === editingId
            ? {
                ...t,
                ...updated,
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
      syncTasks(previous);
    }
  }

  async function updateStatus(taskId: string, status: TaskStatus) {
    const previous = localTasks;
    const next = localTasks.map((t) =>
      t.id === taskId ? { ...t, status } : t,
    );
    syncTasks(next);

    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) syncTasks(previous);
  }

  async function deleteTask(taskId: string) {
    if (!confirm("Delete this task?")) return;

    const previous = localTasks;
    const next = localTasks.filter((t) => t.id !== taskId);
    syncTasks(next);
    if (editingId === taskId) closeEdit();

    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (!res.ok) syncTasks(previous);
  }

  return (
    <div className={embedded ? "space-y-2" : "space-y-4"}>
      <div
        className={
          embedded ? "flex justify-end" : "flex items-center justify-between"
        }
      >
        {!embedded && <h3 className="font-semibold text-white">Tasks</h3>}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setShowForm(!showForm);
            closeEdit();
          }}
        >
          <Plus className="h-4 w-4" />
          Add task
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={createTask} className="space-y-3">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                required
              />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
              />
              <div className="flex flex-wrap gap-2">
                <Select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-36"
                >
                  {Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </Select>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-40"
                />
                <Select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-44"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </Select>
                <Button type="submit" size="sm" disabled={loading}>
                  Add
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {editingId && (
        <Card className="border-cyan-800/50">
          <CardContent className="pt-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-white">Edit task</p>
              <button type="button" onClick={closeEdit} className="text-slate-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={saveEdit} className="space-y-3">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
              />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                >
                  {Object.entries(TASK_STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </Select>
                <Select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                >
                  {Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </Select>
                <Input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                />
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
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? "Saving..." : "Save"}
                </Button>
                <Button type="button" size="sm" variant="danger" onClick={() => deleteTask(editingId)}>
                  Delete
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {embedded ? (
        <div className="space-y-1.5">
          {localTasks.length === 0 ? (
            <p className="text-xs text-slate-500 py-1">
              No tasks yet.
            </p>
          ) : (
            localTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => openEdit(task)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900/40 p-2 text-left hover:border-cyan-900 hover:bg-slate-900/60"
                title="Edit task"
              >
                <p className="text-xs font-medium text-white line-clamp-2">
                  {task.title}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <PriorityBadge priority={task.priority} />
                  {task.assignments.map((a) => (
                    <span
                      key={a.user.id}
                      className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
                    >
                      {a.user.name.split(" ")[0]}
                    </span>
                  ))}
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          {KANBAN_COLUMNS.map((column) => {
            const columnTasks = localTasks.filter((t) => t.status === column);
            return (
              <div
                key={column}
                className="rounded-lg border border-slate-800 bg-slate-900/30 p-3"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase text-slate-400">
                    {TASK_STATUS_LABELS[column]}
                  </span>
                  <span className="text-xs text-slate-500">
                    {columnTasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {columnTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-lg border border-slate-800 bg-slate-900 p-3"
                    >
                      <p className="text-sm font-medium text-white">
                        {task.title}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <PriorityBadge priority={task.priority} />
                        {task.assignments.map((a) => (
                          <span
                            key={a.user.id}
                            className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
                          >
                            {a.user.name.split(" ")[0]}
                          </span>
                        ))}
                      </div>
                      {task.dueDate && (
                        <p className="mt-1 text-xs text-slate-500">
                          Due {formatDate(task.dueDate)}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-1">
                        <Select
                          value={task.status}
                          onChange={(e) =>
                            updateStatus(task.id, e.target.value as TaskStatus)
                          }
                          className="h-8 flex-1 text-xs"
                        >
                          {KANBAN_COLUMNS.map((s) => (
                            <option key={s} value={s}>
                              {TASK_STATUS_LABELS[s]}
                            </option>
                          ))}
                        </Select>
                        <button
                          type="button"
                          onClick={() => openEdit(task)}
                          className="rounded p-1 text-slate-500 hover:text-cyan-400"
                          title="Edit task"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTask(task.id)}
                          className="rounded p-1 text-slate-500 hover:text-red-400"
                          title="Delete task"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!embedded && localTasks.length === 0 && !showForm && (
        <p className="text-center text-sm text-slate-500 py-8">
          No tasks in this stage. Add one to get started.
        </p>
      )}
    </div>
  );
}

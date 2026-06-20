"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import type { StageStatus } from "@prisma/client";
import { TaskBoard, type Task } from "@/components/projects/task-board";
import { StageStatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { STAGE_STATUS_LABELS } from "@/lib/constants";
import { calculateProgress } from "@/lib/status";
import { cn } from "@/lib/utils";

export type StageItem = {
  id: string;
  name: string;
  description: string | null;
  status: StageStatus;
  order: number;
  tasks: Task[];
};

type User = { id: string; name: string; email?: string; devRole?: string | null };

type StageManagerProps = {
  projectId: string;
  stages: StageItem[];
  users: User[];
  onStagesChange: (stages: StageItem[]) => void;
  onStageTasksChange: (stageId: string, tasks: Task[]) => void;
};

export function StageManager({
  projectId,
  stages,
  users,
  onStagesChange,
  onStageTasksChange,
}: StageManagerProps) {
  const [localStages, setLocalStages] = useState(stages);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [addName, setAddName] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<StageStatus>("NOT_STARTED");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalStages(stages);
  }, [stages]);

  function updateStages(next: StageItem[]) {
    setLocalStages(next);
    onStagesChange(next);
  }

  function openEdit(stage: StageItem) {
    setEditingStageId(stage.id);
    setEditName(stage.name);
    setEditDescription(stage.description ?? "");
    setEditStatus(stage.status);
    setShowAddForm(false);
  }

  function closeEdit() {
    setEditingStageId(null);
    setEditName("");
    setEditDescription("");
  }

  async function handleAddStage(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const tempId = `temp-stage-${Date.now()}`;
    const optimistic: StageItem = {
      id: tempId,
      name: addName,
      description: addDescription || null,
      status: "NOT_STARTED",
      order: localStages.length,
      tasks: [],
    };

    const previous = localStages;
    const next = [...localStages, optimistic];
    updateStages(next);

    const res = await fetch("/api/stages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        name: addName,
        description: addDescription || undefined,
      }),
    });

    setSaving(false);

    if (res.ok) {
      const created = await res.json();
      const withReal = next.map((s) =>
        s.id === tempId
          ? { ...s, id: created.id, order: created.order }
          : s,
      );
      updateStages(withReal);
      setAddName("");
      setAddDescription("");
      setShowAddForm(false);
    } else {
      updateStages(previous);
    }
  }

  async function handleEditStage(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStageId) return;

    setSaving(true);
    const previous = localStages;
    const next = localStages.map((s) =>
      s.id === editingStageId
        ? {
            ...s,
            name: editName,
            description: editDescription || null,
            status: editStatus,
          }
        : s,
    );
    updateStages(next);

    const res = await fetch(`/api/stages/${editingStageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        description: editDescription || null,
        status: editStatus,
      }),
    });

    setSaving(false);

    if (res.ok) {
      const updated = await res.json();
      updateStages(
        next.map((s) =>
          s.id === editingStageId
            ? { ...s, status: updated.status as StageStatus }
            : s,
        ),
      );
      closeEdit();
    } else {
      updateStages(previous);
    }
  }

  async function handleDeleteStage(stageId: string) {
    if (!confirm("Delete this stage and all its tasks?")) return;

    const previous = localStages;
    const next = localStages.filter((s) => s.id !== stageId);
    updateStages(next);

    if (editingStageId === stageId) closeEdit();

    const res = await fetch(`/api/stages/${stageId}`, { method: "DELETE" });
    if (!res.ok) {
      updateStages(previous);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Pipeline</h2>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setShowAddForm(!showAddForm);
            closeEdit();
          }}
        >
          <Plus className="h-4 w-4" />
          Add stage
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleAddStage} className="space-y-3">
              <p className="text-sm font-medium text-white">New stage</p>
              <Input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Stage name"
                required
              />
              <Textarea
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? "Adding..." : "Add stage"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {localStages.length === 0 ? (
        <p className="text-sm text-slate-500 py-4">
          No stages yet. Add one to build your pipeline.
        </p>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3">
            {localStages.map((stage, index) => {
              const progress = calculateProgress(stage.tasks);
              const isEditing = stage.id === editingStageId;

              return (
                <div
                  key={stage.id}
                  className={cn(
                    "flex w-72 shrink-0 flex-col rounded-lg border bg-slate-900/50",
                    isEditing
                      ? "border-cyan-800/50"
                      : "border-slate-800",
                  )}
                >
                  <div className="relative border-b border-slate-800 p-3">
                    <span className="text-xs text-slate-500">
                      Stage {index + 1}
                    </span>
                    <p className="mt-0.5 truncate text-sm font-semibold text-white">
                      {stage.name}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <StageStatusBadge status={stage.status} />
                      <span className="text-xs text-slate-500">
                        {stage.tasks.length}{" "}
                        {stage.tasks.length === 1 ? "task" : "tasks"}
                      </span>
                    </div>
                    {stage.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                        {stage.description}
                      </p>
                    )}
                    <div className="mt-2">
                      <Progress value={progress} size="sm" />
                    </div>
                    <button
                      type="button"
                      onClick={() => openEdit(stage)}
                      className="absolute right-2 top-2 rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-cyan-400"
                      title="Edit stage"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex min-h-[120px] flex-1 flex-col p-3">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-white">
                            Edit stage
                          </p>
                          <button
                            type="button"
                            onClick={closeEdit}
                            className="text-slate-500 hover:text-white"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <form onSubmit={handleEditStage} className="space-y-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            required
                          />
                          <Textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={2}
                          />
                          <Select
                            value={editStatus}
                            onChange={(e) =>
                              setEditStatus(e.target.value as StageStatus)
                            }
                          >
                            {Object.entries(STAGE_STATUS_LABELS).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ),
                            )}
                          </Select>
                          <div className="flex flex-wrap gap-2">
                            <Button type="submit" size="sm" disabled={saving}>
                              {saving ? "Saving..." : "Save"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={closeEdit}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              onClick={() => handleDeleteStage(stage.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <TaskBoard
                        stageId={stage.id}
                        tasks={stage.tasks}
                        users={users}
                        embedded
                        onTasksChange={(tasks) => {
                          setLocalStages((prev) =>
                            prev.map((s) =>
                              s.id === stage.id ? { ...s, tasks } : s,
                            ),
                          );
                          onStageTasksChange(stage.id, tasks);
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DollarSign, Pencil, Plus, Trash2 } from "lucide-react";
import type { ProjectStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectStatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/utils";

export type RevenueSourceItem = {
  id: string;
  name: string;
  amount: number;
};

export type RevenueProject = {
  id: string;
  name: string;
  client: string | null;
  status: ProjectStatus;
  revenue: number | null;
};

type SourceForm = {
  name: string;
  amount: string;
};

export function RevenueView({
  initialProjects,
  initialSources,
}: {
  initialProjects: RevenueProject[];
  initialSources: RevenueSourceItem[];
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [sources, setSources] = useState(initialSources);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSource, setNewSource] = useState<SourceForm>({
    name: "",
    amount: "",
  });
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editSource, setEditSource] = useState<SourceForm>({
    name: "",
    amount: "",
  });
  const [busySourceId, setBusySourceId] = useState<string | null>(null);

  const totalRevenue = useMemo(
    () => projects.reduce((sum, p) => sum + (p.revenue ?? 0), 0),
    [projects],
  );

  const revenueProjects = useMemo(
    () =>
      [...projects]
        .filter((p) => p.revenue != null && p.revenue > 0)
        .sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0)),
    [projects],
  );

  const sortedProjects = useMemo(
    () =>
      [...projects].sort((a, b) => {
        const aRev = a.revenue ?? 0;
        const bRev = b.revenue ?? 0;
        if (bRev !== aRev) return bRev - aRev;
        return a.name.localeCompare(b.name);
      }),
    [projects],
  );

  const sortedSources = useMemo(
    () =>
      [...sources].sort((a, b) => {
        if (b.amount !== a.amount) return b.amount - a.amount;
        return a.name.localeCompare(b.name);
      }),
    [sources],
  );

  const totalSourceAmount = useMemo(
    () => sources.reduce((sum, source) => sum + source.amount, 0),
    [sources],
  );

  function updateProject(
    projectId: string,
    updater: (project: RevenueProject) => RevenueProject,
  ) {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? updater(p) : p)),
    );
  }

  function startEdit(project: RevenueProject) {
    setEditingId(project.id);
    setEditValue(project.revenue != null ? String(project.revenue) : "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  async function saveRevenue(projectId: string) {
    const trimmed = editValue.trim();
    const revenue = trimmed === "" ? null : Number(trimmed);

    if (trimmed !== "" && (!Number.isFinite(revenue) || revenue! < 0)) {
      return;
    }

    setSavingId(projectId);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revenue }),
    });
    setSavingId(null);

    if (res.ok) {
      const updated = await res.json();
      updateProject(projectId, (p) => ({
        ...p,
        revenue: updated.revenue ?? null,
      }));
      cancelEdit();
    }
  }

  function openAddSource() {
    setShowAddSource(true);
    setNewSource({ name: "", amount: "" });
  }

  function cancelAddSource() {
    setShowAddSource(false);
    setNewSource({ name: "", amount: "" });
  }

  async function saveNewSource() {
    const name = newSource.name.trim();
    const amount = Number(newSource.amount);
    if (!name || !Number.isFinite(amount) || amount < 0) return;

    setBusySourceId("new");
    const res = await fetch("/api/revenue-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, amount }),
    });
    setBusySourceId(null);

    if (res.ok) {
      const source: RevenueSourceItem = await res.json();
      setSources((prev) => [...prev, source]);
      cancelAddSource();
    }
  }

  function startEditSource(source: RevenueSourceItem) {
    setEditingSourceId(source.id);
    setEditSource({ name: source.name, amount: String(source.amount) });
  }

  function cancelEditSource() {
    setEditingSourceId(null);
    setEditSource({ name: "", amount: "" });
  }

  async function saveEditSource(sourceId: string) {
    const name = editSource.name.trim();
    const amount = Number(editSource.amount);
    if (!name || !Number.isFinite(amount) || amount < 0) return;

    setBusySourceId(sourceId);
    const res = await fetch(`/api/revenue-sources/${sourceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, amount }),
    });
    setBusySourceId(null);

    if (res.ok) {
      const updated: RevenueSourceItem = await res.json();
      setSources((prev) =>
        prev.map((s) => (s.id === sourceId ? updated : s)),
      );
      cancelEditSource();
    }
  }

  async function deleteSource(sourceId: string) {
    setBusySourceId(sourceId);
    const res = await fetch(`/api/revenue-sources/${sourceId}`, {
      method: "DELETE",
    });
    setBusySourceId(null);

    if (res.ok) {
      setSources((prev) => prev.filter((s) => s.id !== sourceId));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Revenue</h1>
        <p className="mt-1 text-slate-400">
          Track project revenue and break it down by revenue sources.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-emerald-900/40 bg-emerald-950/20">
          <CardContent className="flex items-center gap-4 pt-5">
            <div className="rounded-lg bg-emerald-950 p-3 text-emerald-400">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(totalRevenue)}
              </p>
              <p className="text-sm text-slate-400">Total pipeline revenue</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold text-white">
              {revenueProjects.length}
            </p>
            <p className="text-sm text-slate-400">Projects with revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold text-white">{sources.length}</p>
            <p className="text-sm text-slate-400">Revenue sources</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-white">Project revenue</h2>
            <Link
              href="/projects"
              className="text-sm text-cyan-400 hover:text-cyan-300"
            >
              View all projects
            </Link>
          </div>

          {sortedProjects.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              No projects yet. Create a project first, then add revenue here.
            </p>
          ) : (
            <div className="space-y-3">
              {sortedProjects.map((project) => {
                const isEditing = editingId === project.id;
                const share =
                  totalRevenue > 0 && project.revenue
                    ? Math.round((project.revenue / totalRevenue) * 100)
                    : null;

                return (
                  <div
                    key={project.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-medium text-white hover:text-cyan-300"
                      >
                        {project.name}
                      </Link>
                      {project.client && (
                        <p className="text-sm text-slate-400">{project.client}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <ProjectStatusBadge status={project.status} />

                      {isEditing ? (
                        <>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="Amount (INR)"
                            className="w-36"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => saveRevenue(project.id)}
                            disabled={savingId === project.id}
                          >
                            {savingId === project.id ? "Saving..." : "Save"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <span
                            className={
                              project.revenue != null
                                ? "text-sm font-semibold text-emerald-400"
                                : "text-sm text-slate-500"
                            }
                          >
                            {project.revenue != null
                              ? formatCurrency(project.revenue)
                              : "Not set"}
                          </span>
                          {share != null && (
                            <span className="text-xs text-slate-500">
                              {share}% of total
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => startEdit(project)}
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-cyan-400"
                            title="Edit revenue"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">Revenue sources</h2>
              <p className="mt-0.5 text-sm text-slate-400">
                Break down revenue by source type (development, maintenance,
                licensing, etc.)
              </p>
            </div>
            {!showAddSource && (
              <Button size="sm" onClick={openAddSource}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add source
              </Button>
            )}
          </div>

          {showAddSource && (
            <div className="mb-4 space-y-3 rounded-lg border border-dashed border-slate-700 bg-slate-950/30 p-4">
              <p className="text-sm font-medium text-white">New revenue source</p>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={newSource.name}
                  onChange={(e) =>
                    setNewSource((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Source name (e.g. Development)"
                  className="min-w-[180px] flex-1"
                  autoFocus
                />
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={newSource.amount}
                  onChange={(e) =>
                    setNewSource((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  placeholder="Amount (INR)"
                  className="w-36"
                />
                <Button
                  size="sm"
                  onClick={saveNewSource}
                  disabled={busySourceId === "new"}
                >
                  {busySourceId === "new" ? "Adding..." : "Add"}
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelAddSource}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {sortedSources.length === 0 && !showAddSource ? (
            <p className="py-6 text-center text-sm text-slate-400">
              No revenue sources yet. Click &quot;Add source&quot; to add one.
            </p>
          ) : (
            <div className="space-y-3">
              {sortedSources.map((source) => {
                const isEditingSource = editingSourceId === source.id;
                const share =
                  totalSourceAmount > 0
                    ? Math.round((source.amount / totalSourceAmount) * 100)
                    : null;

                return (
                  <div
                    key={source.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3"
                  >
                    {isEditingSource ? (
                      <>
                        <Input
                          value={editSource.name}
                          onChange={(e) =>
                            setEditSource((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          placeholder="Source name"
                          className="min-w-[160px] flex-1"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={editSource.amount}
                          onChange={(e) =>
                            setEditSource((prev) => ({
                              ...prev,
                              amount: e.target.value,
                            }))
                          }
                          placeholder="Amount"
                          className="w-32"
                        />
                        <Button
                          size="sm"
                          onClick={() => saveEditSource(source.id)}
                          disabled={busySourceId === source.id}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEditSource}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="min-w-0 flex-1 font-medium text-white">
                          {source.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-emerald-400">
                            {formatCurrency(source.amount)}
                          </span>
                          {share != null && (
                            <span className="text-xs text-slate-500">
                              {share}% of sources
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => startEditSource(source)}
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-cyan-400"
                            title="Edit source"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSource(source.id)}
                            disabled={busySourceId === source.id}
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-red-400 disabled:opacity-50"
                            title="Remove source"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

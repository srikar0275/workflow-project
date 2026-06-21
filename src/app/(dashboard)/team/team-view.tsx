"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import type { DevRole, ProjectStatus, UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectStatusBadge } from "@/components/ui/status-badge";
import { DEV_ROLE_LABELS, USER_ROLE_LABELS } from "@/lib/constants";
import { cn, formatCurrency, formatDate, getInitials } from "@/lib/utils";

function parseSalary(value: FormDataEntryValue | null | string): number | null {
  const raw = typeof value === "string" ? value : value?.toString() ?? "";
  if (!raw.trim()) return null;
  const num = Number(raw);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  devRole: DevRole | null;
  salary: number | null;
  _count: { taskAssignments: number; projectMembers: number };
};

type MemberProject = {
  id: string;
  name: string;
  client: string | null;
  status: ProjectStatus;
  title: string | null;
  projectRole: UserRole;
};

type MemberDetail = TeamMember & {
  createdAt: string;
  projects: MemberProject[];
};

export function TeamView({
  initialMembers,
  isAdmin,
  currentUserId,
}: {
  initialMembers: TeamMember[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("DEVELOPER");
  const [editDevRole, setEditDevRole] = useState<string>("");
  const [editSalary, setEditSalary] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addError, setAddError] = useState("");

  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("add") === "member" && isAdmin) {
      setShowForm(true);
    }
  }, [searchParams, isAdmin]);

  async function loadMember(memberId: string) {
    setDetailLoading(true);
    const res = await fetch(`/api/team/${memberId}`);
    setDetailLoading(false);

    if (res.ok) {
      const data: MemberDetail = await res.json();
      setDetail(data);
      setEditName(data.name);
      setEditEmail(data.email);
      setEditRole(data.role);
      setEditDevRole(data.devRole ?? "");
      setEditSalary(data.salary != null ? String(data.salary) : "");
      setEditPassword("");
      return data;
    }

    setDetail(null);
    return null;
  }

  async function openMember(memberId: string) {
    if (selectedId === memberId) return;

    setSelectedId(memberId);
    setEditingId(null);
    await loadMember(memberId);
  }

  async function openEdit(memberId: string) {
    if (selectedId !== memberId || !detail) {
      setSelectedId(memberId);
      setEditingId(null);
      const data = await loadMember(memberId);
      if (data) {
        setEditingId(memberId);
      }
      return;
    }

    setEditingId(memberId);
  }

  function collapseMember() {
    setSelectedId(null);
    setDetail(null);
    setEditingId(null);
    setEditPassword("");
  }

  function cancelEdit() {
    if (detail) {
      setEditName(detail.name);
      setEditEmail(detail.email);
      setEditRole(detail.role);
      setEditDevRole(detail.devRole ?? "");
      setEditSalary(detail.salary != null ? String(detail.salary) : "");
      setEditPassword("");
    }
    setEditingId(null);
  }

  function syncMemberLists(updated: MemberDetail) {
    setDetail(updated);
    setMembers((prev) =>
      prev.map((m) =>
        m.id === updated.id
          ? {
              id: updated.id,
              name: updated.name,
              email: updated.email,
              role: updated.role,
              devRole: updated.devRole,
              salary: updated.salary,
              _count: updated._count,
            }
          : m,
      ),
    );
  }

  async function handleEditSubmit(e: React.FormEvent, memberId: string) {
    e.preventDefault();

    setEditSaving(true);
    const res = await fetch(`/api/team/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        email: editEmail,
        role: editRole,
        devRole: editDevRole || null,
        salary: parseSalary(editSalary),
        ...(editPassword ? { password: editPassword } : {}),
      }),
    });
    setEditSaving(false);

    if (res.ok) {
      const updated: MemberDetail = await res.json();
      syncMemberLists(updated);
      setEditingId(null);
      setEditPassword("");
    }
  }

  async function deleteMember(member: TeamMember) {
    if (member.id === currentUserId) return;
    if (!confirm(`Delete ${member.name}? This removes their project memberships and task assignments.`)) {
      return;
    }

    setDeletingId(member.id);
    const res = await fetch(`/api/team/${member.id}`, { method: "DELETE" });
    setDeletingId(null);

    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      if (selectedId === member.id) {
        collapseMember();
      }
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddError("");
    setLoading(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const salary = parseSalary(form.get("salary"));
    const devRole = form.get("devRole")?.toString().trim() ?? "";

    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name")?.toString().trim() ?? "",
        email: form.get("email")?.toString().trim() ?? "",
        password: form.get("password")?.toString() ?? "",
        role: form.get("role")?.toString() || "DEVELOPER",
        ...(devRole ? { devRole } : {}),
        ...(salary != null ? { salary } : {}),
      }),
    });
    setLoading(false);
    if (res.ok) {
      const created = await res.json();
      setMembers((prev) => [
        ...prev,
        {
          ...created,
          _count: { taskAssignments: 0, projectMembers: 0 },
        },
      ]);
      setShowForm(false);
      setAddError("");
      formEl.reset();
      return;
    }

    const data = await res.json().catch(() => null);
    if (typeof data?.error === "string") {
      setAddError(data.error);
    } else if (typeof data?.error === "object" && data.error !== null) {
      setAddError("Please check the member details and try again.");
    } else {
      setAddError("Could not add member. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Team</h1>
          <p className="mt-1 text-slate-400">
            App, Backend, Frontend, AI & DevOps developers.
          </p>
        </div>
        {isAdmin ? (
          <Button
            size="sm"
            onClick={() => {
              setShowForm(!showForm);
              setAddError("");
            }}
          >
            <Plus className="h-4 w-4" />
            Add member
          </Button>
        ) : null}
      </div>

      {showForm && isAdmin && (
        <Card>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
              <Input name="name" placeholder="Full name" required />
              <Input name="email" type="email" placeholder="Email" required />
              <Input name="password" type="password" placeholder="Password" required />
              <Select name="role" defaultValue="DEVELOPER">
                {Object.entries(USER_ROLE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
              <Select name="devRole" defaultValue="">
                <option value="">No dev role</option>
                {Object.entries(DEV_ROLE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
              <Input
                name="salary"
                type="number"
                min="0"
                step="1"
                placeholder="Monthly salary (INR)"
              />
              <Button type="submit" disabled={loading} className="sm:col-span-2">
                {loading ? "Adding..." : "Add member"}
              </Button>
              {addError && (
                <p className="text-sm text-red-400 sm:col-span-2">{addError}</p>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => {
          const isSelected = selectedId === member.id;
          const isEditing = editingId === member.id;

          return (
            <div
              key={member.id}
              className={cn(isSelected && "sm:col-span-2 lg:col-span-3")}
            >
              <Card
                className={cn(
                  "overflow-visible transition-colors",
                  isSelected && "border-cyan-700 bg-cyan-950/10",
                )}
              >
                <CardContent className="pt-5">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => openMember(member.id)}
                      className="flex min-w-0 flex-1 items-start gap-4 text-left"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-950 text-sm font-semibold text-cyan-300">
                        {getInitials(member.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white break-words">
                          {member.name}
                        </p>
                        <p className="text-sm text-slate-400 break-all">
                          {member.email}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                            {USER_ROLE_LABELS[member.role]}
                          </span>
                          {member.devRole && (
                            <span className="rounded-full bg-cyan-950 px-2 py-0.5 text-xs text-cyan-300">
                              {DEV_ROLE_LABELS[member.devRole]}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          {member._count.taskAssignments} tasks ·{" "}
                          {member._count.projectMembers} projects
                          {member.salary != null && (
                            <> · {formatCurrency(member.salary)}/mo</>
                          )}
                        </p>
                      </div>
                    </button>

                    <div className="flex shrink-0 items-center gap-1">
                      {isAdmin && member.id !== currentUserId && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(member.id)}
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-cyan-400"
                            title="Edit member"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMember(member)}
                            disabled={deletingId === member.id}
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-red-400 disabled:opacity-50"
                            title="Delete member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {isSelected && (
                        <button
                          type="button"
                          onClick={collapseMember}
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white"
                          title="Collapse"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-5 border-t border-slate-800 pt-5">
                      {detailLoading ? (
                        <p className="text-sm text-slate-400">
                          Loading member details...
                        </p>
                      ) : detail ? (
                        <>
                          {isEditing && isAdmin ? (
                            <form
                              onSubmit={(e) => handleEditSubmit(e, member.id)}
                              className="space-y-3"
                            >
                              <p className="text-sm font-medium text-white">
                                Edit member
                              </p>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <Input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  placeholder="Full name"
                                  required
                                />
                                <Input
                                  value={editEmail}
                                  onChange={(e) => setEditEmail(e.target.value)}
                                  type="email"
                                  placeholder="Email"
                                  required
                                />
                                <Select
                                  value={editRole}
                                  onChange={(e) =>
                                    setEditRole(e.target.value as UserRole)
                                  }
                                >
                                  {Object.entries(USER_ROLE_LABELS).map(
                                    ([v, l]) => (
                                      <option key={v} value={v}>
                                        {l}
                                      </option>
                                    ),
                                  )}
                                </Select>
                                <Select
                                  value={editDevRole}
                                  onChange={(e) => setEditDevRole(e.target.value)}
                                >
                                  <option value="">No dev role</option>
                                  {Object.entries(DEV_ROLE_LABELS).map(
                                    ([v, l]) => (
                                      <option key={v} value={v}>
                                        {l}
                                      </option>
                                    ),
                                  )}
                                </Select>
                                <Input
                                  value={editSalary}
                                  onChange={(e) => setEditSalary(e.target.value)}
                                  type="number"
                                  min="0"
                                  step="1"
                                  placeholder="Monthly salary (INR)"
                                />
                                <Input
                                  value={editPassword}
                                  onChange={(e) => setEditPassword(e.target.value)}
                                  type="password"
                                  placeholder="New password (optional)"
                                  className="sm:col-span-2"
                                />
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button type="submit" size="sm" disabled={editSaving}>
                                  {editSaving ? "Saving..." : "Save changes"}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={cancelEdit}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="danger"
                                  className="ml-auto"
                                  disabled={deletingId === member.id}
                                  onClick={() => deleteMember(member)}
                                >
                                  {deletingId === member.id ? "Deleting..." : "Delete member"}
                                </Button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                                <div>
                                  <p className="text-xs text-slate-500">Email</p>
                                  <p className="mt-1 text-sm text-white break-all">
                                    {detail.email}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500">System role</p>
                                  <p className="mt-1 text-sm text-white">
                                    {USER_ROLE_LABELS[detail.role]}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500">Dev role</p>
                                  <p className="mt-1 text-sm text-white">
                                    {detail.devRole
                                      ? DEV_ROLE_LABELS[detail.devRole]
                                      : "—"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500">Salary</p>
                                  <p className="mt-1 text-sm text-white">
                                    {detail.salary != null
                                      ? `${formatCurrency(detail.salary)}/mo`
                                      : "—"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500">Joined</p>
                                  <p className="mt-1 text-sm text-white">
                                    {formatDate(detail.createdAt)}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-6">
                                <h3 className="font-semibold text-white">
                                  Project assignments ({detail.projects.length})
                                </h3>
                                {detail.projects.length === 0 ? (
                                  <p className="mt-3 text-sm text-slate-500">
                                    Not assigned to any projects yet.
                                  </p>
                                ) : (
                                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    {detail.projects.map((project) => (
                                      <Link
                                        key={project.id}
                                        href={`/projects/${project.id}`}
                                        className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3 transition-colors hover:border-cyan-900 hover:bg-slate-900/70"
                                      >
                                        <div className="min-w-0 flex-1">
                                          <p className="font-medium text-white break-words">
                                            {project.name}
                                          </p>
                                          {project.client && (
                                            <p className="text-xs text-slate-500 break-words">
                                              {project.client}
                                            </p>
                                          )}
                                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                                            {project.title && (
                                              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                                                {project.title}
                                              </span>
                                            )}
                                            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                                              {USER_ROLE_LABELS[project.projectRole]}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="shrink-0">
                                          <ProjectStatusBadge status={project.status} />
                                        </div>
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">
                          Could not load member details.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}

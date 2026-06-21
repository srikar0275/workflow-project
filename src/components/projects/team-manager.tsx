"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { USER_ROLE_LABELS } from "@/lib/constants";

type User = {
  id: string;
  name: string;
  email: string;
  devRole: string | null;
};

export type MemberItem = {
  id: string;
  title: string | null;
  role: UserRole;
  user: User;
};

type TeamManagerProps = {
  projectId: string;
  members: MemberItem[];
  availableUsers: User[];
  onMembersChange: (members: MemberItem[]) => void;
};

export function TeamManager({
  projectId,
  members,
  availableUsers,
  onMembersChange,
}: TeamManagerProps) {
  const [localMembers, setLocalMembers] = useState(members);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [addUserId, setAddUserId] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addRole, setAddRole] = useState<UserRole | "">("");
  const [editTitle, setEditTitle] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("DEVELOPER");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    setLocalMembers(members);
  }, [members]);

  const availableToAdd = useMemo(
    () =>
      availableUsers.filter(
        (user) => !localMembers.some((member) => member.user.id === user.id),
      ),
    [availableUsers, localMembers],
  );

  useEffect(() => {
    if (availableToAdd.length === 0) {
      setAddUserId("");
      return;
    }
    if (!availableToAdd.some((user) => user.id === addUserId)) {
      setAddUserId(availableToAdd[0].id);
    }
  }, [availableToAdd, addUserId]);

  function updateMembers(next: MemberItem[]) {
    setLocalMembers(next);
    onMembersChange(next);
  }

  function openEdit(member: MemberItem) {
    setEditingMemberId(member.id);
    setEditTitle(member.title ?? "");
    setEditRole(member.role);
    setShowAddForm(false);
  }

  function closeEdit() {
    setEditingMemberId(null);
    setEditTitle("");
  }

  function resetAddForm() {
    setAddTitle("");
    setAddRole("");
    setAddError("");
    setAddUserId(availableToAdd[0]?.id ?? "");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");

    if (!addUserId || !addTitle.trim() || !addRole) {
      setAddError("Select a member, enter a title, and choose a project role.");
      return;
    }

    const user = availableUsers.find((candidate) => candidate.id === addUserId);
    if (!user) {
      setAddError("Selected member is no longer available.");
      return;
    }

    setSaving(true);
    const tempId = `temp-member-${Date.now()}`;
    const title = addTitle.trim();
    const optimistic: MemberItem = {
      id: tempId,
      title,
      role: addRole,
      user,
    };

    const previous = localMembers;
    updateMembers([...localMembers, optimistic]);

    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: addUserId,
        title,
        role: addRole,
      }),
    });

    setSaving(false);

    if (res.ok) {
      const created = await res.json();
      updateMembers([
        ...previous.filter((m) => m.id !== tempId),
        {
          id: created.id,
          title: created.title,
          role: created.role,
          user: created.user,
        },
      ]);
      setShowAddForm(false);
      resetAddForm();
    } else {
      updateMembers(previous);
      const data = await res.json().catch(() => null);
      let message = "Failed to add member. Try again.";
      if (typeof data?.error === "string") {
        message = data.error;
      } else if (data?.error === "User is already on this project team") {
        message = data.error;
      } else if (typeof data?.error === "object" && data.error !== null) {
        message = "Please check member, title, and role.";
      }
      setAddError(message);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMemberId || !editTitle.trim()) return;
    setSaving(true);

    const title = editTitle.trim();
    const previous = localMembers;
    updateMembers(
      localMembers.map((m) =>
        m.id === editingMemberId ? { ...m, title, role: editRole } : m,
      ),
    );

    const res = await fetch(
      `/api/projects/${projectId}/members/${editingMemberId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, role: editRole }),
      },
    );

    setSaving(false);

    if (res.ok) {
      const updated = await res.json();
      updateMembers(
        previous.map((m) =>
          m.id === editingMemberId
            ? {
                id: updated.id,
                title: updated.title,
                role: updated.role,
                user: updated.user,
              }
            : m,
        ),
      );
      closeEdit();
    } else {
      updateMembers(previous);
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Remove this member from the project team?")) return;

    const previous = localMembers;
    updateMembers(localMembers.filter((m) => m.id !== memberId));
    if (editingMemberId === memberId) closeEdit();

    const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
      method: "DELETE",
    });

    if (!res.ok) updateMembers(previous);
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-white">Team</h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setShowAddForm(!showAddForm);
              closeEdit();
              if (!showAddForm) resetAddForm();
            }}
            disabled={availableToAdd.length === 0 && !showAddForm}
          >
            <Plus className="h-3.5 w-3.5" />
            Add member
          </Button>
        </div>

        {showAddForm && (
          <form
            onSubmit={handleAdd}
            className="mb-4 space-y-3 rounded-lg border border-cyan-800/40 bg-slate-900/50 p-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white">Add team member</p>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-slate-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Member</label>
              <Select
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
                disabled={availableToAdd.length === 0}
              >
                {availableToAdd.length === 0 ? (
                  <option value="">
                    No team members available. Add people in Team first.
                  </option>
                ) : (
                  availableToAdd.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))
                )}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Title</label>
              <Input
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                placeholder="e.g. Tech Lead, QA Engineer"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Project role
              </label>
              <Select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as UserRole)}
                required
              >
                <option value="">Select role</option>
                {Object.entries(USER_ROLE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            {addError && <p className="text-sm text-red-400">{addError}</p>}
            <Button
              type="submit"
              size="sm"
              disabled={
                saving ||
                !addUserId ||
                !addTitle.trim() ||
                !addRole
              }
            >
              {saving ? "Adding..." : "Add to team"}
            </Button>
          </form>
        )}

        {localMembers.length === 0 ? (
          <p className="text-sm text-slate-500">No team members yet.</p>
        ) : (
          <div className="space-y-2">
            {localMembers.map((member) =>
              editingMemberId === member.id ? (
                <form
                  key={member.id}
                  onSubmit={handleEdit}
                  className="space-y-3 rounded-lg border border-cyan-800/50 bg-slate-900/50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">
                      {member.user.name}
                    </p>
                    <button
                      type="button"
                      onClick={closeEdit}
                      className="text-slate-500 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Title</label>
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="e.g. Tech Lead, QA Engineer"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">
                      Project role
                    </label>
                    <Select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as UserRole)}
                    >
                      {Object.entries(USER_ROLE_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" size="sm" disabled={saving || !editTitle.trim()}>
                      {saving ? "Saving..." : "Save"}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={closeEdit}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      className="ml-auto"
                      onClick={() => handleRemove(member.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </form>
              ) : (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200">{member.user.name}</p>
                    {member.title && (
                      <p className="text-xs text-slate-500">{member.title}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(member)}
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-cyan-400"
                      title="Edit member"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(member.id)}
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-red-400"
                      title="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { DEV_ROLE_LABELS, USER_ROLE_LABELS } from "@/lib/constants";
import type { DevRole, UserRole } from "@prisma/client";
import { getInitials } from "@/lib/utils";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  devRole: DevRole | null;
  _count: { taskAssignments: number; projectMembers: number };
};

export function TeamView({
  initialMembers,
  isAdmin,
}: {
  initialMembers: TeamMember[];
  isAdmin: boolean;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        role: form.get("role"),
        devRole: form.get("devRole") || undefined,
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
      e.currentTarget.reset();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Team</h1>
          <p className="mt-1 text-slate-400">
            App, Backend, Frontend, AI & DevOps developers.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" />
            Add member
          </Button>
        )}
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
              <Button type="submit" disabled={loading}>
                {loading ? "Adding..." : "Add member"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <Card key={member.id}>
            <CardContent className="flex items-start gap-4 pt-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-950 text-sm font-semibold text-cyan-300">
                {getInitials(member.name)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white">{member.name}</p>
                <p className="truncate text-sm text-slate-400">{member.email}</p>
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
                  {member._count.taskAssignments} tasks · {member._count.projectMembers} projects
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

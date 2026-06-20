"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WORKFLOW_TEMPLATES } from "@/lib/workflows";

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const body = {
      name: form.get("name") as string,
      client: (form.get("client") as string) || undefined,
      description: (form.get("description") as string) || undefined,
      templateId: form.get("templateId") as string,
      startDate: (form.get("startDate") as string) || undefined,
      targetDate: (form.get("targetDate") as string) || undefined,
    };

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);
    if (!res.ok) {
      setError("Failed to create project");
      return;
    }

    const project = await res.json();
    router.push(`/projects/${project.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>New Project</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-300">
                Project name *
              </label>
              <Input name="name" placeholder="e.g. Parashu Platform" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-300">Client</label>
              <Input name="client" placeholder="Client or company name" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-300">
                Description
              </label>
              <Textarea
                name="description"
                placeholder="Brief project overview..."
                rows={3}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-300">
                Workflow template
              </label>
              <Select name="templateId" defaultValue="full-stack-saas">
                {WORKFLOW_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.stages.length} stages)
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm text-slate-300">
                  Start date
                </label>
                <Input name="startDate" type="date" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-slate-300">
                  Target date
                </label>
                <Input name="targetDate" type="date" />
              </div>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create project"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

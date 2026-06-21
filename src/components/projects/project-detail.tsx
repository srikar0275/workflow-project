"use client";

import { useEffect, useState } from "react";
import type { ProjectStatus } from "@prisma/client";
import { StageManager, type StageItem } from "@/components/projects/stage-manager";
import { TeamManager, type MemberItem } from "@/components/projects/team-manager";
import type { Task } from "@/components/projects/task-board";
import { ProjectStatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { calculateProgress } from "@/lib/status";
import { formatDate } from "@/lib/utils";
import { PROJECT_STATUS_LABELS } from "@/lib/constants";

type User = { id: string; name: string; email: string; devRole: string | null };
type Stage = StageItem;
type Project = {
  id: string;
  name: string;
  client: string | null;
  description: string | null;
  status: ProjectStatus;
  targetDate: string | null;
  stages: Stage[];
  members: MemberItem[];
  activities: {
    id: string;
    action: string;
    details: string | null;
    createdAt: string;
    user: { name: string };
  }[];
};

export function ProjectDetail({ project, users }: { project: Project; users: User[] }) {
  const [localStages, setLocalStages] = useState<Stage[]>(project.stages);
  const [projectStatus, setProjectStatus] = useState(project.status);
  const [localMembers, setLocalMembers] = useState(project.members);

  useEffect(() => {
    setLocalStages(project.stages);
  }, [project.stages]);

  useEffect(() => {
    setLocalMembers(project.members);
  }, [project.members]);

  const allTasks = localStages.flatMap((s) => s.tasks);
  const progress = calculateProgress(allTasks);

  function handleStagesChange(stages: StageItem[]) {
    setLocalStages((prev) =>
      stages.map((s) => {
        const existing = prev.find((p) => p.id === s.id);
        return { ...s, tasks: existing?.tasks ?? s.tasks };
      }),
    );
  }

  function handleStageTasksChange(stageId: string, tasks: Task[]) {
    setLocalStages((prev) =>
      prev.map((s) => (s.id === stageId ? { ...s, tasks } : s)),
    );
  }

  async function updateProjectStatus(status: ProjectStatus) {
    const previous = projectStatus;
    setProjectStatus(status);

    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) setProjectStatus(previous);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          {project.client && (
            <p className="text-slate-400">{project.client}</p>
          )}
          {project.description && (
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              {project.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ProjectStatusBadge status={projectStatus} />
          <Select
            value={projectStatus}
            onChange={(e) =>
              updateProjectStatus(e.target.value as ProjectStatus)
            }
            className="w-40"
          >
            {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Overall progress</p>
              <p className="text-2xl font-bold text-white">{progress}%</p>
            </div>
            <div className="text-right text-sm text-slate-400">
              <p>{localStages.length} stages</p>
              <p>{allTasks.length} tasks</p>
              {project.targetDate && (
                <p>Target: {formatDate(project.targetDate)}</p>
              )}
            </div>
          </div>
          <div className="mt-4">
            <Progress value={progress} />
          </div>
        </CardContent>
      </Card>

      <StageManager
        projectId={project.id}
        stages={localStages}
        users={users}
        onStagesChange={handleStagesChange}
        onStageTasksChange={handleStageTasksChange}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <TeamManager
          projectId={project.id}
          members={localMembers}
          availableUsers={users}
          onMembersChange={setLocalMembers}
        />

        <Card>
          <CardContent className="pt-5">
            <h3 className="font-semibold text-white">Activity</h3>
            <div className="mt-3 space-y-3">
              {project.activities.length === 0 ? (
                <p className="text-sm text-slate-500">No activity yet.</p>
              ) : (
                project.activities.map((log) => (
                  <div key={log.id} className="text-sm">
                    <p className="text-slate-300">{log.action}</p>
                    <p className="text-xs text-slate-500">
                      {log.user.name} · {formatDate(log.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

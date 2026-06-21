import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectStatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import { getProjectStats, getProjectStatsMap } from "@/lib/project-stats";
import { formatDate } from "@/lib/utils";

export default async function ProjectsPage() {
  const [projects, statsMap] = await Promise.all([
    prisma.project.findMany({
      select: {
        id: true,
        name: true,
        client: true,
        description: true,
        status: true,
        targetDate: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    getProjectStatsMap(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="mt-1 text-slate-400">
            All client and internal projects with stage-level progress.
          </p>
        </div>
        <Link href="/projects/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-slate-400">No projects yet.</p>
            <Link href="/projects/new" className="mt-4 inline-block">
              <Button variant="secondary">Create your first project</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => {
            const stats = getProjectStats(statsMap, project.id);
            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="h-full transition-colors hover:border-cyan-800/50">
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-white">
                          {project.name}
                        </h2>
                        {project.client && (
                          <p className="text-sm text-slate-400">{project.client}</p>
                        )}
                      </div>
                      <ProjectStatusBadge status={project.status} />
                    </div>
                    {project.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                        {project.description}
                      </p>
                    )}
                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-xs text-slate-500">
                        <span>
                          {stats.stageCount} stages · {stats.taskCount} tasks
                        </span>
                        <span>{stats.progress}%</span>
                      </div>
                      <Progress value={stats.progress} size="sm" />
                    </div>
                    {project.targetDate && (
                      <p className="mt-3 text-xs text-slate-500">
                        Target: {formatDate(project.targetDate)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

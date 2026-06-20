import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateProgress } from "@/lib/status";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectStatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  FolderKanban,
  ListTodo,
  TrendingUp,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const [projects, myTasks, blockedTasks, recentActivity] = await Promise.all([
    prisma.project.findMany({
      select: {
        id: true,
        name: true,
        client: true,
        status: true,
        revenue: true,
        targetDate: true,
        stages: {
          select: {
            tasks: { select: { status: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.taskAssignment.count({ where: { userId } }),
    prisma.task.count({ where: { status: "BLOCKED" } }),
    prisma.activityLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { user: true, project: true },
    }),
  ]);

  const activeProjects = projects.filter(
    (p) => p.status === "IN_PROGRESS" || p.status === "NOT_STARTED",
  ).length;
  const completedProjects = projects.filter((p) => p.status === "COMPLETED").length;
  const totalRevenue = projects.reduce((sum, p) => sum + (p.revenue ?? 0), 0);
  const revenueProjects = [...projects]
    .filter((p) => p.revenue != null && p.revenue > 0)
    .sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0));

  const stats = [
    {
      label: "Active Projects",
      value: activeProjects,
      icon: FolderKanban,
      color: "text-cyan-400",
    },
    {
      label: "My Assigned Tasks",
      value: myTasks,
      icon: ListTodo,
      color: "text-violet-400",
    },
    {
      label: "Blocked Tasks",
      value: blockedTasks,
      icon: AlertTriangle,
      color: "text-amber-400",
    },
    {
      label: "Completed Projects",
      value: completedProjects,
      icon: CheckCircle2,
      color: "text-emerald-400",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-slate-400">
          Overview of all projects, stages, and team workload at Recursion Technologies.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 pt-5">
                <div className={`rounded-lg bg-slate-800 p-3 ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Revenue</h2>
          <Link
            href="/projects"
            className="text-sm text-cyan-400 hover:text-cyan-300"
          >
            View all projects
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>

        <Card>
          <CardContent className="pt-5">
            {revenueProjects.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                No revenue recorded yet. Add revenue values to your projects.
              </p>
            ) : (
              <div className="space-y-3">
                {revenueProjects.map((project) => {
                  const share =
                    totalRevenue > 0
                      ? Math.round(((project.revenue ?? 0) / totalRevenue) * 100)
                      : 0;
                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 transition-colors hover:border-emerald-800/50"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-white">{project.name}</p>
                        {project.client && (
                          <p className="text-sm text-slate-400">{project.client}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <ProjectStatusBadge status={project.status} />
                        <span className="text-sm font-semibold text-emerald-400">
                          {formatCurrency(project.revenue)}
                        </span>
                        <span className="text-xs text-slate-500">{share}% of total</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Projects</h2>
            <Link
              href="/projects/new"
              className="text-sm text-cyan-400 hover:text-cyan-300"
            >
              + New project
            </Link>
          </div>

          {projects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-400">
                No projects yet. Create your first project to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => {
                const allTasks = project.stages.flatMap((s) => s.tasks);
                const progress = calculateProgress(allTasks);
                return (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <Card className="transition-colors hover:border-cyan-800/50">
                      <CardContent className="pt-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-white">
                              {project.name}
                            </h3>
                            {project.client && (
                              <p className="text-sm text-slate-400">
                                {project.client}
                              </p>
                            )}
                          </div>
                          <ProjectStatusBadge status={project.status} />
                        </div>
                        <div className="mt-4">
                          <div className="mb-1.5 flex justify-between text-xs text-slate-400">
                            <span>Progress</span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} size="sm" />
                        </div>
                        <div className="mt-3 flex gap-4 text-xs text-slate-500">
                          <span>{project.stages.length} stages</span>
                          <span>{allTasks.length} tasks</span>
                          {project.targetDate && (
                            <span>Due {formatDate(project.targetDate)}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          <Card>
            <CardContent className="space-y-4 pt-5">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-slate-400">No activity yet.</p>
              ) : (
                recentActivity.map((log) => (
                  <div
                    key={log.id}
                    className="border-b border-slate-800 pb-3 last:border-0 last:pb-0"
                  >
                    <p className="text-sm text-slate-200">{log.action}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {log.user.name}
                      {log.project ? ` · ${log.project.name}` : ""}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
                Quick tip
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-400">
              Use workflow templates when creating projects to auto-generate stages
              for SaaS, mobile, or AI deliveries.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

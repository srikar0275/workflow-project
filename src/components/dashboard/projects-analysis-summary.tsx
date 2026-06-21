"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  FolderKanban,
  Layers,
} from "lucide-react";
import type { ProjectStatus } from "@prisma/client";
import { ProjectStatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import { PROJECT_STATUS_LABELS } from "@/lib/constants";
import {
  listMonthOptionsFromDates,
  matchesSelectedPeriod,
} from "@/lib/finance-monthly";
import { formatDate } from "@/lib/utils";
import { usePeriodFilter } from "@/hooks/use-period-filter";
import { PeriodFilter } from "@/components/ui/period-filter";
import {
  AnalysisBreakdownList,
  AnalysisBreakdownRow,
  AnalysisCard,
  AnalysisDetailGrid,
  AnalysisListBox,
  AnalysisPanel,
  AnalysisStat,
  AnalysisStatGrid,
} from "@/components/dashboard/analysis-ui";

const PREVIEW_COUNT = 3;

const STATUS_ORDER: ProjectStatus[] = [
  "IN_PROGRESS",
  "NOT_STARTED",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
];

type ProjectAnalysisItem = {
  id: string;
  name: string;
  client: string | null;
  status: ProjectStatus;
  targetDate: string | null;
  startDate: string | null;
  updatedAt: string;
  stageCount: number;
  taskCount: number;
  progress: number;
};

export function ProjectsAnalysisSummary({
  projects,
  headerActions,
  showModuleLink = true,
  compact = false,
}: {
  projects: ProjectAnalysisItem[];
  headerActions?: ReactNode;
  showModuleLink?: boolean;
  compact?: boolean;
}) {
  const [showAllProjects, setShowAllProjects] = useState(false);

  const monthKeys = useMemo(
    () =>
      listMonthOptionsFromDates(
        projects.flatMap((project) => [
          project.updatedAt,
          project.startDate,
          project.targetDate,
        ]),
      ),
    [projects],
  );

  const period = usePeriodFilter(monthKeys);

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) =>
        matchesSelectedPeriod(
          period.selectedMonth,
          project.updatedAt,
          project.startDate ?? project.targetDate,
        ),
      ),
    [projects, period.selectedMonth],
  );

  const stats = useMemo(() => {
    const statusCounts = STATUS_ORDER.reduce(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<ProjectStatus, number>,
    );

    let totalTasks = 0;
    let overdueProjects = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const project of filteredProjects) {
      statusCounts[project.status] += 1;
      totalTasks += project.taskCount;

      if (
        project.targetDate &&
        project.status !== "COMPLETED" &&
        project.status !== "CANCELLED"
      ) {
        const target = new Date(project.targetDate);
        if (!Number.isNaN(target.getTime()) && target < today) {
          overdueProjects += 1;
        }
      }
    }

    const averageProgress =
      filteredProjects.length > 0
        ? Math.round(
            filteredProjects.reduce((sum, project) => sum + project.progress, 0) /
              filteredProjects.length,
          )
        : 0;

    const activeProjects =
      statusCounts.IN_PROGRESS +
      statusCounts.NOT_STARTED +
      statusCounts.ON_HOLD;

    return {
      statusCounts,
      totalTasks,
      overdueProjects,
      averageProgress,
      activeProjects,
    };
  }, [filteredProjects]);

  const sortedProjects = useMemo(
    () =>
      [...filteredProjects].sort((a, b) => {
        if (a.status === "COMPLETED" && b.status !== "COMPLETED") return 1;
        if (b.status === "COMPLETED" && a.status !== "COMPLETED") return -1;
        if (b.progress !== a.progress) return b.progress - a.progress;
        return a.name.localeCompare(b.name);
      }),
    [filteredProjects],
  );

  const visibleProjects = showAllProjects
    ? sortedProjects
    : sortedProjects.slice(0, PREVIEW_COUNT);

  const periodNote = period.isAllTime
    ? ""
    : ` · ${period.selectedMonthLabel}`;

  return (
    <AnalysisCard
      compact={compact}
      title="Projects"
      subtitle={`Portfolio health and delivery${periodNote}`}
      moduleHref={showModuleLink ? "/projects" : undefined}
      moduleLabel="Projects"
      headerActions={headerActions}
    >
      <PeriodFilter
        compact={compact}
        filterYear={period.filterYear}
        filterMonth={period.filterMonth}
        viewAllTime={period.viewAllTime}
        yearOptions={period.yearOptions}
        visibleMonthOptions={period.visibleMonthOptions}
        onFilterYearChange={period.setFilterYear}
        onFilterMonthChange={period.setFilterMonth}
        onViewAllTimeChange={period.setViewAllTime}
        className={
          compact
            ? "rounded-md border border-slate-800/80 bg-slate-900/30 px-2.5 py-2"
            : "rounded-lg border border-slate-800 bg-slate-900/40 p-4"
        }
      />

      <AnalysisStatGrid compact={compact}>
        <AnalysisStat
          compact={compact}
          icon={FolderKanban}
          label="Total"
          value={filteredProjects.length}
          tone="cyan"
        />
        <AnalysisStat
          compact={compact}
          icon={Layers}
          label="Active"
          value={stats.activeProjects}
          tone="violet"
        />
        <AnalysisStat
          compact={compact}
          icon={CheckCircle2}
          label="Avg progress"
          value={`${stats.averageProgress}%`}
          tone="emerald"
        />
        <AnalysisStat
          compact={compact}
          icon={AlertTriangle}
          label="Overdue"
          value={stats.overdueProjects}
          tone="amber"
        />
      </AnalysisStatGrid>

      <AnalysisDetailGrid compact={compact}>
        <AnalysisPanel
          compact={compact}
          title="Status breakdown"
          description={
            compact
              ? `${stats.totalTasks} tasks across ${filteredProjects.length} projects`
              : "How projects are distributed across delivery states."
          }
        >
          <AnalysisBreakdownList compact={compact}>
            {STATUS_ORDER.map((status) => {
              const count = stats.statusCounts[status];
              const share =
                filteredProjects.length > 0
                  ? Math.round((count / filteredProjects.length) * 100)
                  : 0;

              return (
                <AnalysisBreakdownRow
                  key={status}
                  compact={compact}
                  left={
                    <div className="flex items-center gap-1.5">
                      <ProjectStatusBadge status={status} />
                      {!compact && (
                        <span className="text-sm text-slate-400">
                          {PROJECT_STATUS_LABELS[status]}
                        </span>
                      )}
                    </div>
                  }
                  right={
                    <>
                      <p className="text-xs font-semibold text-white">{count}</p>
                      <p className="text-[10px] text-slate-500">{share}%</p>
                    </>
                  }
                />
              );
            })}
          </AnalysisBreakdownList>
          {!compact && (
            <p className="mt-3 text-xs text-slate-500">
              {stats.totalTasks} tasks tracked across {filteredProjects.length}{" "}
              projects.
            </p>
          )}
        </AnalysisPanel>

        <AnalysisPanel
          compact={compact}
          title="Project progress"
          description={
            compact ? undefined : "Stage and task completion by project."
          }
          action={
            sortedProjects.length > PREVIEW_COUNT ? (
              <button
                type="button"
                onClick={() => setShowAllProjects((prev) => !prev)}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                {showAllProjects
                  ? "Less"
                  : `All (${sortedProjects.length})`}
              </button>
            ) : undefined
          }
        >
          <AnalysisListBox
            compact={compact}
            emptyMessage="No projects for this period."
          >
            {filteredProjects.length > 0 &&
              visibleProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className={`block rounded-md border border-slate-800 bg-slate-950/50 transition-colors hover:border-cyan-800/50 ${
                    compact ? "px-2 py-1.5" : "rounded-lg px-3 py-2.5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className={`font-medium text-white ${compact ? "text-xs" : "text-sm"}`}
                      >
                        {project.name}
                      </p>
                      {project.client && (
                        <p className="truncate text-[10px] text-slate-500">
                          {project.client}
                        </p>
                      )}
                    </div>
                    <ProjectStatusBadge status={project.status} />
                  </div>
                  <div className={compact ? "mt-1.5" : "mt-3"}>
                    <div className="mb-0.5 flex justify-between text-[10px] text-slate-500">
                      <span>
                        {project.stageCount} st · {project.taskCount} tk
                      </span>
                      <span>{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} size="sm" />
                  </div>
                  {project.targetDate && !compact && (
                    <p className="mt-2 text-xs text-slate-500">
                      Target: {formatDate(project.targetDate)}
                    </p>
                  )}
                </Link>
              ))}
          </AnalysisListBox>
        </AnalysisPanel>
      </AnalysisDetailGrid>
    </AnalysisCard>
  );
}

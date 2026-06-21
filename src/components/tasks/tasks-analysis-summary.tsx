"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  ListTodo,
} from "lucide-react";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import {
  PriorityBadge,
  TaskStatusBadge,
} from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import {
  KANBAN_COLUMNS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/constants";
import {
  listMonthOptionsFromDates,
  matchesSelectedPeriod,
} from "@/lib/finance-monthly";
import { calculateProgress } from "@/lib/status";
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
const PRIORITY_ORDER: TaskPriority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];

type TaskAnalysisItem = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  updatedAt: string;
  projectId: string;
  projectName: string;
  stageName: string;
  assigneeName: string | null;
};

export function TasksAnalysisSummary({
  tasks,
  headerActions,
  showModuleLink = true,
  compact = false,
}: {
  tasks: TaskAnalysisItem[];
  headerActions?: ReactNode;
  showModuleLink?: boolean;
  compact?: boolean;
}) {
  const [showAllTasks, setShowAllTasks] = useState(false);

  const monthKeys = useMemo(
    () =>
      listMonthOptionsFromDates(
        tasks.flatMap((task) => [task.dueDate, task.updatedAt]),
      ),
    [tasks],
  );

  const period = usePeriodFilter(monthKeys);

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) =>
        matchesSelectedPeriod(
          period.selectedMonth,
          task.dueDate,
          task.updatedAt,
        ),
      ),
    [tasks, period.selectedMonth],
  );

  const stats = useMemo(() => {
    const statusCounts = KANBAN_COLUMNS.reduce(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<TaskStatus, number>,
    );

    const priorityCounts = PRIORITY_ORDER.reduce(
      (acc, priority) => {
        acc[priority] = 0;
        return acc;
      },
      {} as Record<TaskPriority, number>,
    );

    let overdueTasks = 0;
    let unassigned = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const task of filteredTasks) {
      statusCounts[task.status] += 1;
      priorityCounts[task.priority] += 1;

      if (!task.assigneeName) unassigned += 1;

      if (task.dueDate && task.status !== "DONE") {
        const due = new Date(task.dueDate);
        if (!Number.isNaN(due.getTime()) && due < today) {
          overdueTasks += 1;
        }
      }
    }

    const completionRate = calculateProgress(filteredTasks);
    const openTasks = filteredTasks.length - statusCounts.DONE;

    return {
      statusCounts,
      priorityCounts,
      overdueTasks,
      unassigned,
      completionRate,
      openTasks,
    };
  }, [filteredTasks]);

  const openTaskList = useMemo(
    () =>
      [...filteredTasks]
        .filter((task) => task.status !== "DONE")
        .sort((a, b) => {
          const priorityDiff =
            PRIORITY_ORDER.indexOf(a.priority) -
            PRIORITY_ORDER.indexOf(b.priority);
          if (priorityDiff !== 0) return priorityDiff;

          if (a.dueDate && b.dueDate) {
            return a.dueDate.localeCompare(b.dueDate);
          }
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;
          return a.title.localeCompare(b.title);
        }),
    [filteredTasks],
  );

  const visibleTasks = showAllTasks
    ? openTaskList
    : openTaskList.slice(0, PREVIEW_COUNT);

  const periodNote = period.isAllTime
    ? ""
    : ` · ${period.selectedMonthLabel}`;

  return (
    <AnalysisCard
      compact={compact}
      title="Tasks"
      subtitle={`Workload and workflow${periodNote}`}
      moduleHref={showModuleLink ? "/tasks" : undefined}
      moduleLabel="Tasks"
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
          icon={ClipboardList}
          label="Total"
          value={filteredTasks.length}
          tone="cyan"
        />
        <AnalysisStat
          compact={compact}
          icon={ListTodo}
          label="Open"
          value={stats.openTasks}
          tone="violet"
        />
        <AnalysisStat
          compact={compact}
          icon={CheckCircle2}
          label="Complete"
          value={`${stats.completionRate}%`}
          tone="emerald"
        />
        <AnalysisStat
          compact={compact}
          icon={AlertTriangle}
          label="Overdue"
          value={stats.overdueTasks}
          tone="amber"
        />
      </AnalysisStatGrid>

      <AnalysisDetailGrid compact={compact}>
        <AnalysisPanel
          compact={compact}
          title="Status breakdown"
          description={
            compact
              ? `${stats.unassigned} unassigned · ${stats.priorityCounts.URGENT} urgent`
              : "How tasks are distributed across the workflow board."
          }
        >
          <AnalysisBreakdownList compact={compact}>
            {KANBAN_COLUMNS.map((status) => {
              const count = stats.statusCounts[status];
              const share =
                filteredTasks.length > 0
                  ? Math.round((count / filteredTasks.length) * 100)
                  : 0;

              return (
                <AnalysisBreakdownRow
                  key={status}
                  compact={compact}
                  left={
                    <div className="flex items-center gap-1.5">
                      <TaskStatusBadge status={status} />
                      {!compact && (
                        <span className="text-sm text-slate-400">
                          {TASK_STATUS_LABELS[status]}
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
              {stats.unassigned} unassigned · {stats.priorityCounts.URGENT}{" "}
              urgent
            </p>
          )}
        </AnalysisPanel>

        <AnalysisPanel
          compact={compact}
          title="Open tasks"
          description={compact ? undefined : "Active work by priority and due date."}
          action={
            openTaskList.length > PREVIEW_COUNT ? (
              <button
                type="button"
                onClick={() => setShowAllTasks((prev) => !prev)}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                {showAllTasks ? "Less" : `All (${openTaskList.length})`}
              </button>
            ) : undefined
          }
        >
          <div className={compact ? "mb-2" : "mb-4"}>
            <div className="mb-0.5 flex justify-between text-[10px] text-slate-500">
              <span>Completion</span>
              <span>{stats.completionRate}%</span>
            </div>
            <Progress value={stats.completionRate} size="sm" />
          </div>

          <AnalysisListBox
            compact={compact}
            emptyMessage="All tasks are complete."
          >
            {openTaskList.length > 0 &&
              visibleTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/projects/${task.projectId}`}
                  className={`block rounded-md border border-slate-800 bg-slate-950/50 transition-colors hover:border-cyan-800/50 ${
                    compact ? "px-2 py-1.5" : "rounded-lg px-3 py-2.5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className={`font-medium text-white ${compact ? "text-xs" : "text-sm"}`}
                      >
                        {task.title}
                      </p>
                      <p className="truncate text-[10px] text-slate-500">
                        {task.projectName} · {task.stageName}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <PriorityBadge priority={task.priority} />
                      {!compact && <TaskStatusBadge status={task.status} />}
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-2 text-[10px] text-slate-500">
                    {task.assigneeName && <span>{task.assigneeName}</span>}
                    {task.dueDate && (
                      <span>Due {formatDate(task.dueDate)}</span>
                    )}
                    {compact && (
                      <span>{TASK_PRIORITY_LABELS[task.priority]}</span>
                    )}
                  </div>
                </Link>
              ))}
          </AnalysisListBox>
        </AnalysisPanel>
      </AnalysisDetailGrid>
    </AnalysisCard>
  );
}

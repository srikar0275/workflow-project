"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { DevRole, UserRole } from "@prisma/client";
import { Briefcase, UserPlus, Users } from "lucide-react";
import { PeriodFilter } from "@/components/ui/period-filter";
import { usePeriodFilter } from "@/hooks/use-period-filter";
import { DEV_ROLE_LABELS, USER_ROLE_LABELS } from "@/lib/constants";
import {
  listMonthOptionsFromDates,
  matchesSelectedPeriod,
} from "@/lib/finance-monthly";
import { formatDate } from "@/lib/utils";
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

type TeamAnalysisMember = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  devRole: DevRole | null;
  createdAt: string;
  updatedAt: string;
  taskAssignments: number;
  projectMembers: number;
};

export function TeamAnalysisSummary({
  members,
  headerActions,
  showModuleLink = true,
  compact = false,
}: {
  members: TeamAnalysisMember[];
  headerActions?: ReactNode;
  showModuleLink?: boolean;
  compact?: boolean;
}) {
  const [showAllMembers, setShowAllMembers] = useState(false);

  const monthKeys = useMemo(
    () =>
      listMonthOptionsFromDates(
        members.flatMap((member) => [member.createdAt, member.updatedAt]),
      ),
    [members],
  );

  const period = usePeriodFilter(monthKeys);

  const filteredMembers = useMemo(
    () =>
      members.filter((member) =>
        matchesSelectedPeriod(
          period.selectedMonth,
          member.updatedAt,
          member.createdAt,
        ),
      ),
    [members, period.selectedMonth],
  );

  const stats = useMemo(() => {
    const roleCounts = Object.keys(USER_ROLE_LABELS).reduce(
      (acc, role) => {
        acc[role as UserRole] = 0;
        return acc;
      },
      {} as Record<UserRole, number>,
    );

    let totalAssignments = 0;
    let totalProjects = 0;

    for (const member of filteredMembers) {
      roleCounts[member.role] += 1;
      totalAssignments += member.taskAssignments;
      totalProjects += member.projectMembers;
    }

    const newMembers = filteredMembers.filter((member) =>
      matchesSelectedPeriod(period.selectedMonth, member.createdAt),
    ).length;

    return {
      roleCounts,
      totalAssignments,
      totalProjects,
      newMembers,
    };
  }, [filteredMembers, period.selectedMonth]);

  const sortedMembers = useMemo(
    () =>
      [...filteredMembers].sort((a, b) => {
        if (b.projectMembers !== a.projectMembers) {
          return b.projectMembers - a.projectMembers;
        }
        return a.name.localeCompare(b.name);
      }),
    [filteredMembers],
  );

  const visibleMembers = showAllMembers
    ? sortedMembers
    : sortedMembers.slice(0, PREVIEW_COUNT);

  const periodNote = period.isAllTime
    ? ""
    : ` · ${period.selectedMonthLabel}`;

  return (
    <AnalysisCard
      compact={compact}
      title="Team"
      subtitle={`Headcount and workload${periodNote}`}
      moduleHref={showModuleLink ? "/team" : undefined}
      moduleLabel="Team"
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
          icon={Users}
          label="Members"
          value={filteredMembers.length}
          tone="cyan"
        />
        <AnalysisStat
          compact={compact}
          icon={UserPlus}
          label="Joined"
          value={stats.newMembers}
          tone="violet"
        />
        <AnalysisStat
          compact={compact}
          icon={Briefcase}
          label="Projects"
          value={stats.totalProjects}
          tone="emerald"
        />
        <AnalysisStat
          compact={compact}
          icon={Users}
          label="Assignments"
          value={stats.totalAssignments}
          tone="amber"
        />
      </AnalysisStatGrid>

      <AnalysisDetailGrid compact={compact}>
        <AnalysisPanel
          compact={compact}
          title="Role breakdown"
          description={
            compact ? undefined : "How the team is distributed by access role."
          }
        >
          <AnalysisBreakdownList compact={compact}>
            {(Object.keys(USER_ROLE_LABELS) as UserRole[]).map((role) => {
              const count = stats.roleCounts[role];
              const share =
                filteredMembers.length > 0
                  ? Math.round((count / filteredMembers.length) * 100)
                  : 0;

              return (
                <AnalysisBreakdownRow
                  key={role}
                  compact={compact}
                  left={
                    <span
                      className={`text-slate-300 ${compact ? "text-[11px]" : "text-sm"}`}
                    >
                      {USER_ROLE_LABELS[role]}
                    </span>
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
        </AnalysisPanel>

        <AnalysisPanel
          compact={compact}
          title="Team members"
          description={
            compact ? undefined : "People active or added in this period."
          }
          action={
            sortedMembers.length > PREVIEW_COUNT ? (
              <button
                type="button"
                onClick={() => setShowAllMembers((prev) => !prev)}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                {showAllMembers ? "Less" : `All (${sortedMembers.length})`}
              </button>
            ) : undefined
          }
        >
          <AnalysisListBox
            compact={compact}
            emptyMessage="No team activity for this period."
          >
            {filteredMembers.length > 0 &&
              visibleMembers.map((member) => (
                <div
                  key={member.id}
                  className={`rounded-md border border-slate-800 bg-slate-950/50 ${
                    compact ? "px-2 py-1.5" : "rounded-lg px-3 py-2.5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className={`font-medium text-white ${compact ? "text-xs" : "text-sm"}`}
                      >
                        {member.name}
                      </p>
                      <p className="truncate text-[10px] text-slate-500">
                        {member.email}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {USER_ROLE_LABELS[member.role]}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-2 text-[10px] text-slate-500">
                    {member.devRole && (
                      <span>{DEV_ROLE_LABELS[member.devRole]}</span>
                    )}
                    <span>{member.projectMembers} proj</span>
                    <span>{member.taskAssignments} tasks</span>
                    {!compact && (
                      <span>Joined {formatDate(member.createdAt)}</span>
                    )}
                  </div>
                </div>
              ))}
          </AnalysisListBox>
        </AnalysisPanel>
      </AnalysisDetailGrid>
    </AnalysisCard>
  );
}

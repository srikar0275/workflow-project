"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
} from "lucide-react";
import type { ProjectStatus } from "@prisma/client";
import { ProjectStatusBadge } from "@/components/ui/status-badge";
import { PeriodFilter } from "@/components/ui/period-filter";
import { usePeriodFilter } from "@/hooks/use-period-filter";
import {
  buildMonthlyBreakdown,
  formatMonthLabel,
  listMonthOptions,
  matchesSelectedPeriod,
  parseMonthKey,
  sumMonthlyRevenue,
  sumMonthlySpent,
} from "@/lib/finance-monthly";
import { formatCurrency } from "@/lib/utils";
import {
  AnalysisCard,
  AnalysisDetailGrid,
  AnalysisListBox,
  AnalysisPanel,
  AnalysisScrollTable,
  AnalysisStat,
  AnalysisStatGrid,
} from "@/components/dashboard/analysis-ui";

const PREVIEW_COUNT = 3;

type FinanceProject = {
  id: string;
  name: string;
  client: string | null;
  status: ProjectStatus;
  revenue: number | null;
  revenueDate: string | null;
  updatedAt: string;
};

type FinanceExpense = {
  id: string;
  name: string;
  amount: number;
  category: string | null;
  projectId: string | null;
  expenseDate: string | null;
};

type OtherRevenueSource = {
  id: string;
  name: string;
  amount: number;
  category: string | null;
  receivedDate: string | null;
};

export function FinanceAccountingSummary({
  projects,
  sources,
  expenses,
  headerActions,
  showModuleLink = true,
  compact = false,
}: {
  projects: FinanceProject[];
  sources: OtherRevenueSource[];
  expenses: FinanceExpense[];
  headerActions?: ReactNode;
  showModuleLink?: boolean;
  compact?: boolean;
}) {
  const [showAllRevenue, setShowAllRevenue] = useState(false);
  const [showAllSpent, setShowAllSpent] = useState(false);

  const monthlyRevenueItems = useMemo(
    () => [
      ...projects
        .filter((project) => project.revenue != null && project.revenue > 0)
        .map((project) => ({
          amount: project.revenue ?? 0,
          date: project.revenueDate,
          fallbackDate: project.updatedAt,
          projectId: project.id,
        })),
      ...sources.map((source) => ({
        amount: source.amount,
        date: source.receivedDate,
        sourceId: source.id,
      })),
    ],
    [projects, sources],
  );

  const monthlyExpenseItems = useMemo(
    () =>
      expenses.map((expense) => ({
        amount: expense.amount,
        date: expense.expenseDate,
        expenseId: expense.id,
      })),
    [expenses],
  );

  const monthlyBreakdown = useMemo(
    () => buildMonthlyBreakdown(monthlyRevenueItems, monthlyExpenseItems),
    [monthlyRevenueItems, monthlyExpenseItems],
  );

  const monthOptions = useMemo(
    () => listMonthOptions(monthlyBreakdown),
    [monthlyBreakdown],
  );

  const period = usePeriodFilter(monthOptions);

  const totalIncome = useMemo(
    () =>
      monthlyRevenueItems.reduce((sum, item) => sum + item.amount, 0),
    [monthlyRevenueItems],
  );

  const totalSpent = useMemo(
    () => monthlyExpenseItems.reduce((sum, item) => sum + item.amount, 0),
    [monthlyExpenseItems],
  );

  const displayIncome = period.isAllTime
    ? totalIncome
    : sumMonthlyRevenue(monthlyRevenueItems, period.selectedMonth);

  const displaySpent = period.isAllTime
    ? totalSpent
    : sumMonthlySpent(monthlyExpenseItems, period.selectedMonth);

  const displayNet = displayIncome - displaySpent;

  const revenueProjects = useMemo(
    () =>
      [...projects]
        .filter(
          (project) =>
            project.revenue != null &&
            project.revenue > 0 &&
            matchesSelectedPeriod(
              period.selectedMonth,
              project.revenueDate,
              project.updatedAt,
            ),
        )
        .sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0)),
    [projects, period.selectedMonth],
  );

  const filteredSources = useMemo(
    () =>
      sources.filter((source) =>
        matchesSelectedPeriod(period.selectedMonth, source.receivedDate),
      ),
    [sources, period.selectedMonth],
  );

  const sortedExpenses = useMemo(
    () =>
      [...expenses]
        .filter((expense) =>
          matchesSelectedPeriod(period.selectedMonth, expense.expenseDate),
        )
        .sort((a, b) => {
          if (b.amount !== a.amount) return b.amount - a.amount;
          return a.name.localeCompare(b.name);
        }),
    [expenses, period.selectedMonth],
  );

  const projectNameById = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const visibleProjects = showAllRevenue
    ? revenueProjects
    : revenueProjects.slice(0, PREVIEW_COUNT);

  const visibleExpenses = showAllSpent
    ? sortedExpenses
    : sortedExpenses.slice(0, PREVIEW_COUNT);

  const revenueCount = revenueProjects.length + filteredSources.length;

  function applyMonthFilter(monthKey: string) {
    const parsed = parseMonthKey(monthKey);
    if (!parsed) return;
    period.setViewAllTime(false);
    period.setFilterYear(parsed.year);
    period.setFilterMonth(parsed.month);
  }

  const periodNote = period.isAllTime
    ? ""
    : ` · ${period.selectedMonthLabel}`;

  return (
    <AnalysisCard
      compact={compact}
      title="Finance"
      subtitle={`Revenue, spending, and net balance${periodNote}`}
      moduleHref={showModuleLink ? "/finance" : undefined}
      moduleLabel="Finance"
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

      <AnalysisStatGrid compact={compact} columns={3}>
        <AnalysisStat
          compact={compact}
          icon={ArrowDownLeft}
          label="Revenue"
          value={formatCurrency(displayIncome)}
          tone="emerald"
        />
        <AnalysisStat
          compact={compact}
          icon={ArrowUpRight}
          label="Spent"
          value={formatCurrency(displaySpent)}
          tone="red"
        />
        <AnalysisStat
          compact={compact}
          icon={Calculator}
          label="Net"
          value={formatCurrency(displayNet)}
          tone="cyan"
          valueClassName={displayNet < 0 ? "text-red-300" : undefined}
        />
      </AnalysisStatGrid>

      {monthlyBreakdown.length > 0 && (
        <AnalysisPanel
          compact={compact}
          title="Monthly overview"
          description={
            compact
              ? "Click a month to filter"
              : "Revenue and spent by month. Select a row to filter this summary."
          }
          accent="cyan"
        >
          <AnalysisScrollTable compact={compact}>
            <table className="w-full min-w-[400px] text-xs">
              <thead className="sticky top-0 bg-slate-950/95">
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="px-2 py-2 font-medium">Month</th>
                  <th className="px-2 py-2 font-medium">Revenue</th>
                  <th className="px-2 py-2 font-medium">Spent</th>
                  <th className="px-2 py-2 font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {monthlyBreakdown.map((row) => {
                  const isSelected =
                    !period.isAllTime && period.selectedMonth === row.monthKey;
                  return (
                    <tr
                      key={row.monthKey}
                      className={`border-b border-slate-800/70 last:border-0 ${
                        isSelected ? "bg-cyan-950/20" : ""
                      }`}
                    >
                      <td className="px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => applyMonthFilter(row.monthKey)}
                          className={`font-medium ${
                            isSelected
                              ? "text-cyan-300"
                              : "text-white hover:text-cyan-300"
                          }`}
                        >
                          {formatMonthLabel(row.monthKey)}
                        </button>
                      </td>
                      <td className="px-2 py-1.5 text-emerald-400">
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="px-2 py-1.5 text-red-400">
                        {formatCurrency(row.spent)}
                      </td>
                      <td
                        className={`px-2 py-1.5 font-medium ${
                          row.net >= 0 ? "text-white" : "text-red-300"
                        }`}
                      >
                        {formatCurrency(row.net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </AnalysisScrollTable>
        </AnalysisPanel>
      )}

      <AnalysisDetailGrid compact={compact}>
        <AnalysisPanel
          compact={compact}
          title="Revenue generating"
          description={
            compact ? undefined : "Projects and sources with revenue in this period."
          }
          accent="emerald"
          action={
            revenueCount > PREVIEW_COUNT ? (
              <button
                type="button"
                onClick={() => setShowAllRevenue((prev) => !prev)}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                {showAllRevenue ? "Less" : `All (${revenueCount})`}
              </button>
            ) : undefined
          }
        >
          <AnalysisListBox
            compact={compact}
            emptyMessage="No revenue recorded for this period."
          >
            {revenueCount > 0 && (
              <>
                {visibleProjects.map((project) => {
                  const share =
                    displayIncome > 0
                      ? Math.round(((project.revenue ?? 0) / displayIncome) * 100)
                      : null;

                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className={`flex items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950/50 transition-colors hover:border-emerald-800/50 ${
                        compact ? "px-2 py-1.5" : "rounded-lg px-3 py-2.5"
                      }`}
                    >
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
                      <div className="flex shrink-0 items-center gap-1.5">
                        {!compact && (
                          <ProjectStatusBadge status={project.status} />
                        )}
                        <span className="text-xs font-semibold text-emerald-400">
                          {formatCurrency(project.revenue)}
                        </span>
                        {share != null && !compact && (
                          <span className="text-[10px] text-slate-500">
                            {share}%
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
                {showAllRevenue &&
                  filteredSources.map((source) => (
                    <div
                      key={source.id}
                      className={`flex items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950/50 ${
                        compact ? "px-2 py-1.5" : "rounded-lg px-3 py-2.5"
                      }`}
                    >
                      <div className="min-w-0">
                        <p
                          className={`font-medium text-white ${compact ? "text-xs" : "text-sm"}`}
                        >
                          {source.name}
                        </p>
                        {source.category && (
                          <p className="text-[10px] text-slate-500">
                            {source.category}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-emerald-400">
                        {formatCurrency(source.amount)}
                      </span>
                    </div>
                  ))}
              </>
            )}
          </AnalysisListBox>
        </AnalysisPanel>

        <AnalysisPanel
          compact={compact}
          title="Revenue spent"
          description={
            compact ? undefined : "Salaries, tools, operations, and other spending."
          }
          accent="red"
          action={
            sortedExpenses.length > PREVIEW_COUNT ? (
              <button
                type="button"
                onClick={() => setShowAllSpent((prev) => !prev)}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                {showAllSpent ? "Less" : `All (${sortedExpenses.length})`}
              </button>
            ) : undefined
          }
        >
          <AnalysisListBox
            compact={compact}
            emptyMessage="No expenses recorded for this period."
          >
            {sortedExpenses.length > 0 &&
              visibleExpenses.map((expense) => {
                const projectName = expense.projectId
                  ? projectNameById.get(expense.projectId)
                  : null;

                return (
                  <div
                    key={expense.id}
                    className={`rounded-md border border-slate-800 bg-slate-950/50 ${
                      compact ? "px-2 py-1.5" : "rounded-lg px-3 py-2.5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className={`font-medium text-white ${compact ? "text-xs" : "text-sm"}`}
                        >
                          {expense.name}
                        </p>
                        <div className="flex flex-wrap gap-x-2 text-[10px] text-slate-500">
                          {expense.category && <span>{expense.category}</span>}
                          {projectName && <span>{projectName}</span>}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-red-400">
                        {formatCurrency(expense.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
          </AnalysisListBox>
        </AnalysisPanel>
      </AnalysisDetailGrid>
    </AnalysisCard>
  );
}

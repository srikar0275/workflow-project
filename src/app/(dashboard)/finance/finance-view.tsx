"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { ProjectStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { PeriodFilter } from "@/components/ui/period-filter";
import { ProjectStatusBadge } from "@/components/ui/status-badge";
import { usePeriodFilter } from "@/hooks/use-period-filter";
import { formatCurrency } from "@/lib/utils";
import {
  ALL_MONTHS,
  buildMonthlyBreakdown,
  clampDateToToday,
  currentDateInputValue,
  defaultFormDateForMonth,
  formatDisplayDate,
  formatMonthLabel,
  isFutureDate,
  isInMonth,
  listMonthOptions,
  monthInputToStorageDate,
  normalizeStorageDate,
  sumMonthlyRevenue,
  sumMonthlySpent,
  toDateInputValue,
  toMonthKey,
} from "@/lib/finance-monthly";

export type FinanceProject = {
  id: string;
  name: string;
  client: string | null;
  status: ProjectStatus;
  revenue: number | null;
  revenueDate: string | null;
  updatedAt: string;
};

export type FinanceExpenseItem = {
  id: string;
  projectId: string | null;
  name: string;
  amount: number;
  category: string | null;
  description: string | null;
  expenseDate: string | null;
  notes: string | null;
};

export type TeamMemberItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  devRole: string | null;
  salary: number | null;
};

export type SalaryPaymentItem = {
  id: string;
  userId: string;
  userName: string;
  monthKey: string;
  amount: number;
  status: "PAID" | "NOT_PAID";
  paidDate: string | null;
  expenseId: string | null;
};

type SalaryEntryState = {
  amount: string;
  status: "PAID" | "NOT_PAID";
  recordId?: string;
};

export type OtherRevenueSourceItem = {
  id: string;
  name: string;
  amount: number;
  category: string | null;
  description: string | null;
  receivedDate: string | null;
  notes: string | null;
};

type SourceForm = {
  name: string;
  amount: string;
  category: string;
  description: string;
  date: string;
  notes: string;
};

type ExpenseForm = {
  name: string;
  amount: string;
  category: string;
  description: string;
  date: string;
  notes: string;
  projectId: string;
};

const LIST_PREVIEW_COUNT = 2;

const SOURCE_CATEGORIES = [
  "Development",
  "Maintenance",
  "Licensing",
  "Consulting",
  "Support",
  "Partnerships",
  "Other",
] as const;

const EXPENSE_CATEGORIES = [
  "Salaries",
  "Infrastructure",
  "Marketing",
  "Operations",
  "Software",
  "Travel",
  "Other",
] as const;

const emptySourceForm = (): SourceForm => ({
  name: "",
  amount: "",
  category: "",
  description: "",
  date: currentDateInputValue(),
  notes: "",
});

const emptyExpenseForm = (): ExpenseForm => ({
  name: "",
  amount: "",
  category: "",
  description: "",
  date: currentDateInputValue(),
  notes: "",
  projectId: "",
});

function formatMemberRole(role: string) {
  return role.replace(/_/g, " ");
}

function buildSalaryEntriesForMonth(
  members: TeamMemberItem[],
  payments: SalaryPaymentItem[],
  monthKey: string | null,
): Record<string, SalaryEntryState> {
  const monthPayments = monthKey
    ? payments.filter((payment) => payment.monthKey === monthKey)
    : [];
  const byUser = new Map(monthPayments.map((payment) => [payment.userId, payment]));

  return Object.fromEntries(
    members.map((member) => {
      const existing = byUser.get(member.id);
      return [
        member.id,
        {
          amount: existing
            ? String(existing.amount)
            : member.salary != null
              ? String(member.salary)
              : "",
          status: existing?.status ?? "NOT_PAID",
          recordId: existing?.id,
        },
      ];
    }),
  );
}

export function FinanceView({
  initialProjects,
  initialSources,
  initialExpenses,
  initialTeamMembers,
  initialSalaryPayments,
}: {
  initialProjects: FinanceProject[];
  initialSources: OtherRevenueSourceItem[];
  initialExpenses: FinanceExpenseItem[];
  initialTeamMembers: TeamMemberItem[];
  initialSalaryPayments: SalaryPaymentItem[];
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [sources, setSources] = useState(initialSources);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editRevenue, setEditRevenue] = useState("");
  const [editRevenueDate, setEditRevenueDate] = useState(currentDateInputValue());
  const [savingProjectId, setSavingProjectId] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSource, setNewSource] = useState<SourceForm>(() => emptySourceForm());
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editSource, setEditSource] = useState<SourceForm>(() => emptySourceForm());
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState<ExpenseForm>(() => emptyExpenseForm());
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpense, setEditExpense] = useState<ExpenseForm>(() => emptyExpenseForm());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showAllSources, setShowAllSources] = useState(false);
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [showAllSalaryRecords, setShowAllSalaryRecords] = useState(false);
  const [teamMembers] = useState(initialTeamMembers);
  const payrollMembers = useMemo(
    () => teamMembers.filter((member) => member.role !== "ADMIN"),
    [teamMembers],
  );
  const [salaryEntries, setSalaryEntries] = useState<
    Record<string, SalaryEntryState>
  >({});
  const [selectedSalaryMemberId, setSelectedSalaryMemberId] = useState("");
  const [salaryPayments, setSalaryPayments] = useState(initialSalaryPayments);
  const todayMax = currentDateInputValue();

  function initSalaryPayrollState(date: string) {
    const monthKey = toMonthKey(date);
    setSalaryEntries(
      buildSalaryEntriesForMonth(payrollMembers, salaryPayments, monthKey),
    );
    setSelectedSalaryMemberId((current) => {
      if (current && payrollMembers.some((member) => member.id === current)) {
        return current;
      }
      return payrollMembers[0]?.id ?? "";
    });
  }

  const projectNameById = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const projectRevenueTotal = useMemo(
    () => projects.reduce((sum, project) => sum + (project.revenue ?? 0), 0),
    [projects],
  );

  const otherSourcesTotal = useMemo(
    () => sources.reduce((sum, source) => sum + source.amount, 0),
    [sources],
  );

  const totalIncome = projectRevenueTotal + otherSourcesTotal;

  const totalSpent = useMemo(
    () => expenses.reduce((sum, item) => sum + item.amount, 0),
    [expenses],
  );

  const monthlyRevenueItems = useMemo(
    () => [
      ...projects
        .filter((project) => project.revenue != null && project.revenue > 0)
        .map((project) => ({
          amount: project.revenue ?? 0,
          date: project.revenueDate,
          fallbackDate: project.updatedAt,
        })),
      ...sources.map((source) => ({
        amount: source.amount,
        date: source.receivedDate,
      })),
    ],
    [projects, sources],
  );

  const monthlyExpenseItems = useMemo(
    () =>
      expenses.map((expense) => ({
        amount: expense.amount,
        date: expense.expenseDate,
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
  const selectedMonth = period.selectedMonth;
  const isAllMonths = period.isAllTime;
  const selectedMonthLabel = period.selectedMonthLabel;

  const displayIncome = isAllMonths
    ? totalIncome
    : sumMonthlyRevenue(monthlyRevenueItems, selectedMonth);

  const filteredProjects = useMemo(() => {
    if (isAllMonths) return projects;
    return projects.filter(
      (project) =>
        project.revenue != null &&
        project.revenue > 0 &&
        (isInMonth(project.revenueDate, selectedMonth) ||
          (!project.revenueDate &&
            isInMonth(project.updatedAt, selectedMonth))),
    );
  }, [projects, isAllMonths, selectedMonth]);

  const filteredSources = useMemo(() => {
    if (isAllMonths) return sources;
    return sources.filter((source) => isInMonth(source.receivedDate, selectedMonth));
  }, [sources, isAllMonths, selectedMonth]);

  const filteredExpenses = useMemo(() => {
    if (isAllMonths) return expenses;
    return expenses.filter((expense) => isInMonth(expense.expenseDate, selectedMonth));
  }, [expenses, isAllMonths, selectedMonth]);

  const filteredSalaryPayments = useMemo(() => {
    if (isAllMonths) return salaryPayments;
    return salaryPayments.filter((payment) => payment.monthKey === selectedMonth);
  }, [salaryPayments, isAllMonths, selectedMonth]);

  const sortedProjects = useMemo(
    () =>
      [...filteredProjects].sort((a, b) => {
        const aRev = a.revenue ?? 0;
        const bRev = b.revenue ?? 0;
        if (bRev !== aRev) return bRev - aRev;
        return a.name.localeCompare(b.name);
      }),
    [filteredProjects],
  );

  const sortedExpenses = useMemo(
    () =>
      [...filteredExpenses]
        .filter((expense) => expense.category !== "Salaries")
        .sort((a, b) => {
          if (b.amount !== a.amount) return b.amount - a.amount;
          return a.name.localeCompare(b.name);
        }),
    [filteredExpenses],
  );

  const sortedSources = useMemo(
    () =>
      [...filteredSources].sort((a, b) => {
        if (b.amount !== a.amount) return b.amount - a.amount;
        return a.name.localeCompare(b.name);
      }),
    [filteredSources],
  );

  const visibleProjects = useMemo(
    () =>
      showAllProjects
        ? sortedProjects
        : sortedProjects.slice(0, LIST_PREVIEW_COUNT),
    [sortedProjects, showAllProjects],
  );

  const hiddenProjectCount = Math.max(
    0,
    sortedProjects.length - LIST_PREVIEW_COUNT,
  );

  const visibleSources = useMemo(
    () =>
      showAllSources
        ? sortedSources
        : sortedSources.slice(0, LIST_PREVIEW_COUNT),
    [sortedSources, showAllSources],
  );

  const hiddenSourceCount = Math.max(
    0,
    sortedSources.length - LIST_PREVIEW_COUNT,
  );

  const visibleExpenses = useMemo(
    () =>
      showAllExpenses
        ? sortedExpenses
        : sortedExpenses.slice(0, LIST_PREVIEW_COUNT),
    [sortedExpenses, showAllExpenses],
  );

  const hiddenExpenseCount = Math.max(
    0,
    sortedExpenses.length - LIST_PREVIEW_COUNT,
  );

  const visibleSalaryPayments = useMemo(
    () =>
      showAllSalaryRecords
        ? filteredSalaryPayments
        : filteredSalaryPayments.slice(0, LIST_PREVIEW_COUNT),
    [filteredSalaryPayments, showAllSalaryRecords],
  );

  const hiddenSalaryRecordCount = Math.max(
    0,
    filteredSalaryPayments.length - LIST_PREVIEW_COUNT,
  );

  function defaultFormDate() {
    return isAllMonths
      ? currentDateInputValue()
      : defaultFormDateForMonth(selectedMonth);
  }

  function openAddSource() {
    setNewSource({
      ...emptySourceForm(),
      date: defaultFormDate(),
    });
    setShowAddSource(true);
    setShowAddExpense(false);
    setEditingSourceId(null);
    setEditingExpenseId(null);
    setSourceError(null);
  }

  function openAddExpense() {
    setNewExpense({
      ...emptyExpenseForm(),
      date: defaultFormDate(),
    });
    setShowAddExpense(true);
    setShowAddSource(false);
    setEditingSourceId(null);
    setEditingExpenseId(null);
    setExpenseError(null);
  }

  const searchParams = useSearchParams();

  useEffect(() => {
    const add = searchParams.get("add");
    if (add === "source") {
      openAddSource();
    } else if (add === "expense") {
      openAddExpense();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function renderPeriodFilter(className?: string) {
    return (
      <PeriodFilter
        filterYear={period.filterYear}
        filterMonth={period.filterMonth}
        viewAllTime={period.viewAllTime}
        yearOptions={period.yearOptions}
        visibleMonthOptions={period.visibleMonthOptions}
        onFilterYearChange={period.setFilterYear}
        onFilterMonthChange={period.setFilterMonth}
        onViewAllTimeChange={period.setViewAllTime}
        className={className}
      />
    );
  }

  function startEditProject(project: FinanceProject) {
    setEditingProjectId(project.id);
    setEditRevenue(project.revenue != null ? String(project.revenue) : "");
    setEditRevenueDate(
      toDateInputValue(project.revenueDate) || currentDateInputValue(),
    );
    setProjectError(null);
  }

  function cancelEditProject() {
    setEditingProjectId(null);
    setEditRevenue("");
    setEditRevenueDate(currentDateInputValue());
    setProjectError(null);
  }

  async function saveProjectRevenue(projectId: string) {
    const trimmed = editRevenue.trim();
    const revenue = trimmed === "" ? null : Number(trimmed);

    if (trimmed !== "" && (!Number.isFinite(revenue) || revenue! < 0)) {
      setProjectError("Enter a valid revenue amount (zero or greater).");
      return;
    }

    if (trimmed !== "" && !editRevenueDate) {
      setProjectError("Select the date this revenue applies to.");
      return;
    }
    if (trimmed !== "" && isFutureDate(editRevenueDate)) {
      setProjectError("Revenue date cannot be in the future.");
      return;
    }

    setProjectError(null);
    setSavingProjectId(projectId);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        revenue,
        revenueDate:
          trimmed === "" ? null : normalizeStorageDate(editRevenueDate),
      }),
    });
    setSavingProjectId(null);

    if (res.ok) {
      const updated = await res.json();
      setProjects((prev) =>
        prev.map((project) =>
          project.id === projectId
            ? {
                ...project,
                revenue: updated.revenue ?? null,
                revenueDate: updated.revenueDate ?? null,
                updatedAt: updated.updatedAt ?? project.updatedAt,
              }
            : project,
        ),
      );
      cancelEditProject();
      return;
    }

    setProjectError("Could not save project revenue.");
  }

  function renderDateField(
    label: string,
    value: string,
    onChange: (date: string) => void,
  ) {
    return (
      <div>
        <label className="mb-1 block text-xs text-slate-400">{label}</label>
        <Input
          type="date"
          value={value}
          max={todayMax}
          onChange={(e) => onChange(clampDateToToday(e.target.value))}
          onBlur={(e) => onChange(clampDateToToday(e.target.value))}
        />
      </div>
    );
  }

  function renderSourceForm(
    form: SourceForm,
    onChange: (next: SourceForm) => void,
  ) {
    return (
      <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <div>
          <label className="mb-1 block text-xs text-slate-400">Source name</label>
          <Input
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder="e.g. Licensing, referrals, retainers"
            autoFocus
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Amount (INR)
            </label>
            <Input
              type="number"
              min="0"
              step="1"
              value={form.amount}
              onChange={(e) => onChange({ ...form, amount: e.target.value })}
              placeholder="Enter amount"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Category</label>
            <Select
              value={form.category}
              onChange={(e) => onChange({ ...form, category: e.target.value })}
            >
              <option value="">Select category</option>
              {SOURCE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            {renderDateField("Revenue date", form.date, (date) =>
              onChange({ ...form, date }),
            )}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">
            Description (optional)
          </label>
          <Textarea
            value={form.description}
            onChange={(e) =>
              onChange({ ...form, description: e.target.value })
            }
            rows={2}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">
            Notes (optional)
          </label>
          <Textarea
            value={form.notes}
            onChange={(e) => onChange({ ...form, notes: e.target.value })}
            rows={2}
          />
        </div>
      </div>
    );
  }

  function renderSourceItem(source: OtherRevenueSourceItem) {
    const dateLabel = formatDisplayDate(source.receivedDate);

    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-white">{source.name}</p>
              {source.category && (
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-cyan-300">
                  {source.category}
                </span>
              )}
            </div>
            {source.description && (
              <p className="text-sm text-slate-400">{source.description}</p>
            )}
            {dateLabel && (
              <p className="text-xs text-slate-500">Date: {dateLabel}</p>
            )}
            {source.notes && (
              <p className="text-xs text-slate-500">Notes: {source.notes}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-emerald-400">
              {formatCurrency(source.amount)}
            </span>
            <button
              type="button"
              onClick={() => {
                setEditingSourceId(source.id);
                setEditSource({
                  name: source.name,
                  amount: String(source.amount),
                  category: source.category ?? "",
                  description: source.description ?? "",
                  date:
                    toDateInputValue(source.receivedDate) ||
                    currentDateInputValue(),
                  notes: source.notes ?? "",
                });
                setShowAddSource(false);
                setSourceError(null);
              }}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-cyan-400"
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => deleteSource(source.id)}
              disabled={busyId === source.id}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-red-400 disabled:opacity-50"
              title="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  async function saveNewSource() {
    const name = newSource.name.trim();
    const amount = Number(newSource.amount);
    if (!name) {
      setSourceError("Source name is required.");
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setSourceError("Enter a valid amount.");
      return;
    }

    if (!newSource.date) {
      setSourceError("Select the date this revenue takes place.");
      return;
    }
    if (isFutureDate(newSource.date)) {
      setSourceError("Revenue date cannot be in the future.");
      return;
    }

    setSourceError(null);
    setBusyId("new-source");
    const res = await fetch("/api/revenue-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        amount,
        category: newSource.category || undefined,
        description: newSource.description.trim() || undefined,
        receivedDate: normalizeStorageDate(newSource.date) ?? undefined,
        notes: newSource.notes.trim() || undefined,
      }),
    });
    setBusyId(null);

    if (res.ok) {
      const source = await res.json();
      setSources((prev) => [
        ...prev,
        {
          id: source.id,
          name: source.name,
          amount: source.amount,
          category: source.category,
          description: source.description,
          receivedDate: source.receivedDate,
          notes: source.notes,
        },
      ]);
      setShowAddSource(false);
      setNewSource(emptySourceForm());
      return;
    }

    const data = await res.json().catch(() => null);
    setSourceError(
      typeof data?.error === "string" ? data.error : "Could not add source.",
    );
  }

  async function saveEditSource(sourceId: string) {
    const name = editSource.name.trim();
    const amount = Number(editSource.amount);
    if (!name || !Number.isFinite(amount) || amount < 0) {
      setSourceError("Enter a valid name and amount.");
      return;
    }
    if (!editSource.date) {
      setSourceError("Select the date this revenue takes place.");
      return;
    }
    if (isFutureDate(editSource.date)) {
      setSourceError("Revenue date cannot be in the future.");
      return;
    }

    setSourceError(null);
    setBusyId(sourceId);
    const res = await fetch(`/api/revenue-sources/${sourceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        amount,
        category: editSource.category || null,
        description: editSource.description.trim() || null,
        receivedDate: normalizeStorageDate(editSource.date),
        notes: editSource.notes.trim() || null,
      }),
    });
    setBusyId(null);

    if (res.ok) {
      const updated = await res.json();
      setSources((prev) =>
        prev.map((source) =>
          source.id === sourceId
            ? {
                id: updated.id,
                name: updated.name,
                amount: updated.amount,
                category: updated.category,
                description: updated.description,
                receivedDate: updated.receivedDate,
                notes: updated.notes,
              }
            : source,
        ),
      );
      setEditingSourceId(null);
      return;
    }

    setSourceError("Could not update source.");
  }

  async function deleteSource(sourceId: string) {
    setBusyId(sourceId);
    const res = await fetch(`/api/revenue-sources/${sourceId}`, {
      method: "DELETE",
    });
    setBusyId(null);
    if (res.ok) {
      setSources((prev) => prev.filter((s) => s.id !== sourceId));
    }
  }

  function mergeSalarySaveResult(result: {
    payments: SalaryPaymentItem[];
    expenses: {
      id: string;
      name: string;
      amount: number;
      expenseDate: string | null;
      projectId?: string | null;
      category?: string | null;
      description?: string | null;
      notes?: string | null;
    }[];
    removedExpenseIds?: string[];
  }) {
    setSalaryPayments((prev) => {
      const next = new Map(prev.map((payment) => [payment.id, payment]));
      for (const payment of result.payments) {
        next.set(payment.id, payment);
      }
      return [...next.values()].sort((a, b) => {
        if (a.monthKey !== b.monthKey) {
          return b.monthKey.localeCompare(a.monthKey);
        }
        return a.userName.localeCompare(b.userName);
      });
    });

    setExpenses((prev) => {
      const removed = new Set(result.removedExpenseIds ?? []);
      const next = new Map(
        prev
          .filter((expense) => !removed.has(expense.id))
          .map((expense) => [expense.id, expense]),
      );
      for (const expense of result.expenses) {
        next.set(expense.id, {
          id: expense.id,
          projectId: expense.projectId ?? null,
          name: expense.name,
          amount: expense.amount,
          category: expense.category ?? "Salaries",
          description: expense.description ?? null,
          expenseDate: expense.expenseDate,
          notes: expense.notes ?? null,
        });
      }
      return [...next.values()];
    });
  }

  async function saveSalaryRecords(
    form: ExpenseForm,
    entries: { userId: string; amount: number; status: "PAID" | "NOT_PAID" }[],
  ) {
    const monthKey = toMonthKey(form.date);
    if (!monthKey) {
      setExpenseError("Select a valid expense date for this salary month.");
      return false;
    }
    if (!form.date) {
      setExpenseError("Select the date these salaries take place.");
      return false;
    }
    if (isFutureDate(form.date)) {
      setExpenseError("Expense date cannot be in the future.");
      return false;
    }

    const res = await fetch("/api/salary-payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monthKey,
        expenseDate: normalizeStorageDate(form.date),
        notes: form.notes.trim() || undefined,
        entries,
      }),
    });

    if (!res.ok) {
      setExpenseError("Could not save salary records. Please try again.");
      return false;
    }

    const result = await res.json();
    mergeSalarySaveResult({
      payments: result.payments,
      expenses: result.expenses,
      removedExpenseIds: result.removedExpenseIds,
    });

    const monthKeyForEntries = monthKey;
    setSalaryEntries(
      buildSalaryEntriesForMonth(
        payrollMembers,
        result.payments,
        monthKeyForEntries,
      ),
    );
    return true;
  }

  async function paySalaryRecord(payment: SalaryPaymentItem) {
    const expenseDate =
      payment.paidDate ||
      monthInputToStorageDate(payment.monthKey) ||
      currentDateInputValue();

    setExpenseError(null);
    setBusyId(`record-pay-${payment.id}`);

    const res = await fetch(`/api/salary-payments/${payment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expenseDate }),
    });
    setBusyId(null);

    if (!res.ok) {
      setExpenseError("Could not mark salary as paid.");
      return;
    }

    const result = await res.json();
    mergeSalarySaveResult({
      payments: [result.payment],
      expenses: [result.expense],
    });
  }

  function renderExpenseForm(
    form: ExpenseForm,
    onChange: (next: ExpenseForm) => void,
    categories: readonly string[],
    options?: { salaryPayroll?: boolean },
  ) {
    const isSalaryPayroll =
      options?.salaryPayroll === true && form.category === "Salaries";

    const selectedMember = payrollMembers.find(
      (member) => member.id === selectedSalaryMemberId,
    );
    const selectedEntry = selectedMember
      ? (salaryEntries[selectedMember.id] ?? {
          amount:
            selectedMember.salary != null ? String(selectedMember.salary) : "",
          status: "NOT_PAID" as const,
        })
      : null;
    const selectedMonthPayment =
      selectedMember && form.date
        ? salaryPayments.find(
            (payment) =>
              payment.userId === selectedMember.id &&
              payment.monthKey === toMonthKey(form.date),
          )
        : undefined;
    const selectedAmount = Number(selectedEntry?.amount?.trim() || "");
    const selectedHasAmount =
      Number.isFinite(selectedAmount) && selectedAmount > 0;

    function handleCategoryChange(category: string) {
      const next = { ...form, category, projectId: category === "Salaries" ? "" : form.projectId };
      onChange(next);
      if (category === "Salaries") {
        initSalaryPayrollState(form.date);
      }
    }

    function handleExpenseDateChange(date: string) {
      onChange({ ...form, date });
      if (form.category === "Salaries") {
        initSalaryPayrollState(date);
      }
    }

    return (
      <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={isSalaryPayroll ? "sm:col-span-2" : ""}>
            <label className="mb-1 block text-xs text-slate-400">Category</label>
            <Select
              value={form.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              autoFocus={isSalaryPayroll}
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </div>

          {!isSalaryPayroll && (
            <>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-400">Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => onChange({ ...form, name: e.target.value })}
                  placeholder="What was the expense for?"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Amount (INR)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.amount}
                  onChange={(e) =>
                    onChange({ ...form, amount: e.target.value })
                  }
                  placeholder="Enter amount"
                />
              </div>
            </>
          )}

          {!isSalaryPayroll && (
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Related project (optional)
              </label>
              <Select
                value={form.projectId}
                onChange={(e) => onChange({ ...form, projectId: e.target.value })}
              >
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div>
            {renderDateField("Expense date", form.date, handleExpenseDateChange)}
          </div>
        </div>

        {isSalaryPayroll && (
          <div className="space-y-3 border-t border-slate-800 pt-4">
            <div>
              <p className="text-sm font-medium text-white">Team salaries</p>
              <p className="text-xs text-slate-400">
                Select a team member and amount, then save to record and mark the
                salary as paid.
              </p>
            </div>

            {payrollMembers.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">
                No team members yet. Add members in the Team module first.
              </p>
            ) : (
              <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    Send salary to
                  </label>
                  <Select
                    value={selectedSalaryMemberId}
                    onChange={(e) => setSelectedSalaryMemberId(e.target.value)}
                  >
                    <option value="">Select team member</option>
                    {payrollMembers.map((member) => {
                      const monthKey = toMonthKey(form.date);
                      const monthPayment = monthKey
                        ? salaryPayments.find(
                            (payment) =>
                              payment.userId === member.id &&
                              payment.monthKey === monthKey,
                          )
                        : undefined;
                      const paymentLabel =
                        monthPayment?.status === "PAID" ? " · Paid" : "";

                      return (
                        <option key={member.id} value={member.id}>
                          {member.name}
                          {member.salary != null
                            ? ` · ${formatCurrency(member.salary)}/mo`
                            : ""}
                          {paymentLabel}
                        </option>
                      );
                    })}
                  </Select>
                </div>

                {selectedMember && selectedEntry ? (
                  <div className="space-y-3 border-t border-slate-800 pt-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white">{selectedMember.name}</p>
                        <p className="text-xs text-slate-500">
                          {formatMemberRole(selectedMember.role)}
                          {selectedMember.devRole
                            ? ` · ${formatMemberRole(selectedMember.devRole)}`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          selectedEntry.status === "PAID"
                            ? "bg-emerald-950 text-emerald-400"
                            : "bg-amber-950 text-amber-400"
                        }`}
                      >
                        {selectedEntry.status === "PAID" ? "Paid" : "Not paid"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex-1 sm:max-w-xs">
                        <label className="mb-1 block text-xs text-slate-400">
                          Salary (INR)
                        </label>
                        {selectedEntry.status === "PAID" ? (
                          <p className="text-sm font-semibold text-white">
                            {selectedHasAmount
                              ? formatCurrency(selectedAmount)
                              : "—"}
                          </p>
                        ) : (
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={selectedEntry.amount}
                            onChange={(e) =>
                              setSalaryEntries((prev) => ({
                                ...prev,
                                [selectedMember.id]: {
                                  ...selectedEntry,
                                  amount: e.target.value,
                                },
                              }))
                            }
                            placeholder="Enter salary amount"
                          />
                        )}
                      </div>
                    </div>

                    {selectedEntry.status === "PAID" && selectedEntry.recordId && (
                      <p className="text-xs text-slate-500">
                        {selectedMonthPayment?.paidDate
                          ? `Paid on ${formatDisplayDate(selectedMonthPayment.paidDate)}.`
                          : "Salary for this month is already paid."}{" "}
                        Use monthly salary records below to review history.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    Choose a team member to record their salary.
                  </p>
                )}

              </div>
            )}
          </div>
        )}

        {!isSalaryPayroll && (
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Description (optional)
            </label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                onChange({ ...form, description: e.target.value })
              }
              rows={2}
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs text-slate-400">
            Notes (optional)
          </label>
          <Textarea
            value={form.notes}
            onChange={(e) => onChange({ ...form, notes: e.target.value })}
            rows={2}
          />
        </div>
      </div>
    );
  }

  function renderExpenseItem(expense: FinanceExpenseItem) {
    const projectName = expense.projectId
      ? projectNameById.get(expense.projectId)
      : null;
    const dateLabel = formatDisplayDate(expense.expenseDate);

    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-white">{expense.name}</p>
              {expense.category && (
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-cyan-300">
                  {expense.category}
                </span>
              )}
            </div>
            {expense.description && (
              <p className="text-sm text-slate-400">{expense.description}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              {projectName && expense.category !== "Salaries" && (
                <span>Project: {projectName}</span>
              )}
              {dateLabel && <span>Date: {dateLabel}</span>}
            </div>
            {expense.notes && (
              <p className="text-xs text-slate-500">Notes: {expense.notes}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-red-400">
              {formatCurrency(expense.amount)}
            </span>
            <button
              type="button"
              onClick={() => {
                setEditingExpenseId(expense.id);
                setEditExpense({
                  name: expense.name,
                  amount: String(expense.amount),
                  category: expense.category ?? "",
                  description: expense.description ?? "",
                  date:
                    toDateInputValue(expense.expenseDate) ||
                    currentDateInputValue(),
                  notes: expense.notes ?? "",
                  projectId: expense.projectId ?? "",
                });
                setShowAddExpense(false);
                setExpenseError(null);
              }}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-cyan-400"
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => deleteExpense(expense.id)}
              disabled={busyId === expense.id}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-red-400 disabled:opacity-50"
              title="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  async function saveNewExpense() {
    if (newExpense.category === "Salaries") {
      if (!selectedSalaryMemberId) {
        setExpenseError("Select a team member to send salary to.");
        return;
      }

      const entry = salaryEntries[selectedSalaryMemberId];
      if (entry?.status === "PAID") {
        setExpenseError("This member's salary is already paid for this month.");
        return;
      }

      const amount = Number(entry?.amount?.trim() || "");
      if (!Number.isFinite(amount) || amount <= 0) {
        setExpenseError("Enter a valid salary amount for the selected member.");
        return;
      }

      const payouts = [
        {
          userId: selectedSalaryMemberId,
          amount,
          status: "PAID" as const,
        },
      ];

      setExpenseError(null);
      setBusyId("new-expense");

      const saved = await saveSalaryRecords(newExpense, payouts);
      setBusyId(null);

      if (saved) {
        setShowAddExpense(false);
        setNewExpense(emptyExpenseForm());
        setSalaryEntries({});
        setSelectedSalaryMemberId("");
        setExpenseError(null);
      }
      return;
    }

    const name = newExpense.name.trim();
    const amount = Number(newExpense.amount);
    if (!name) {
      setExpenseError("Name is required.");
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setExpenseError("Enter a valid amount.");
      return;
    }
    if (!newExpense.date) {
      setExpenseError("Select the date this expense takes place.");
      return;
    }
    if (isFutureDate(newExpense.date)) {
      setExpenseError("Expense date cannot be in the future.");
      return;
    }

    setExpenseError(null);
    setBusyId("new-expense");
    const res = await fetch("/api/finance-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        amount,
        category: newExpense.category || undefined,
        description: newExpense.description.trim() || undefined,
        expenseDate: normalizeStorageDate(newExpense.date) ?? undefined,
        notes: newExpense.notes.trim() || undefined,
        projectId: newExpense.projectId || undefined,
      }),
    });
    setBusyId(null);

    if (res.ok) {
      const expense: FinanceExpenseItem = await res.json();
      setExpenses((prev) => [...prev, expense]);
      setShowAddExpense(false);
      setNewExpense(emptyExpenseForm());
      return;
    }

    const data = await res.json().catch(() => null);
    setExpenseError(
      typeof data?.error === "string" ? data.error : "Could not add expense.",
    );
  }

  async function saveEditExpense(expenseId: string) {
    const name = editExpense.name.trim();
    const amount = Number(editExpense.amount);
    if (!name || !Number.isFinite(amount) || amount < 0) {
      setExpenseError("Enter a valid name and amount.");
      return;
    }
    if (!editExpense.date) {
      setExpenseError("Select the date this expense takes place.");
      return;
    }
    if (isFutureDate(editExpense.date)) {
      setExpenseError("Expense date cannot be in the future.");
      return;
    }

    setExpenseError(null);
    setBusyId(expenseId);
    const res = await fetch(`/api/finance-expenses/${expenseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        amount,
        category: editExpense.category || null,
        description: editExpense.description.trim() || null,
        expenseDate: normalizeStorageDate(editExpense.date),
        notes: editExpense.notes.trim() || null,
      }),
    });
    setBusyId(null);

    if (res.ok) {
      const updated: FinanceExpenseItem = await res.json();
      setExpenses((prev) =>
        prev.map((e) => (e.id === expenseId ? updated : e)),
      );
      setEditingExpenseId(null);
      return;
    }

    setExpenseError("Could not update expense.");
  }

  async function deleteExpense(expenseId: string) {
    setBusyId(expenseId);
    const res = await fetch(`/api/finance-expenses/${expenseId}`, {
      method: "DELETE",
    });
    setBusyId(null);
    if (res.ok) {
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      setSalaryPayments((prev) =>
        prev.map((payment) =>
          payment.expenseId === expenseId
            ? {
                ...payment,
                status: "NOT_PAID",
                expenseId: null,
                paidDate: null,
              }
            : payment,
        ),
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Finance & Accounting</h1>
        <p className="mt-1 text-slate-400">
          Record project revenue and track spending by month, year, and date.
        </p>
      </div>

      {renderPeriodFilter("rounded-lg border border-slate-800 bg-slate-900/40 p-4")}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-emerald-900/30">
          <CardContent className="pt-5">
            <div className="mb-4">
              <h2 className="font-semibold text-white">Revenue generating</h2>
              <p className="mt-0.5 text-sm text-slate-400">
                {isAllMonths
                  ? "Set project revenue and add other sources that generate income."
                  : `Income recorded for ${selectedMonthLabel.toLowerCase()}.`}
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium text-white">Projects</h3>
                {sortedProjects.length > LIST_PREVIEW_COUNT && (
                  <button
                    type="button"
                    onClick={() => setShowAllProjects((prev) => !prev)}
                    className="text-sm text-cyan-400 hover:text-cyan-300"
                  >
                    {showAllProjects
                      ? "Show less"
                      : `See all (${sortedProjects.length})`}
                  </button>
                )}
              </div>
              <p className="mb-4 text-sm text-slate-400">
                Click the pencil icon on a project to add or update its revenue.
              </p>

              {projectError && editingProjectId && (
                <p className="mb-3 text-sm text-red-400">{projectError}</p>
              )}

              {sortedProjects.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  {isAllMonths
                    ? "No projects yet. Create a project first, then set its revenue here."
                    : `No project revenue recorded for ${selectedMonthLabel.toLowerCase()}.`}
                </p>
              ) : (
                <div className="space-y-3">
                  {visibleProjects.map((project) => {
                  const isEditing = editingProjectId === project.id;
                  const share =
                    displayIncome > 0 && project.revenue
                      ? Math.round((project.revenue / displayIncome) * 100)
                      : null;

                  return (
                    <div
                      key={project.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-medium text-white hover:text-cyan-300"
                        >
                          {project.name}
                        </Link>
                        {project.client && (
                          <p className="text-sm text-slate-400">
                            {project.client}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <ProjectStatusBadge status={project.status} />

                        {isEditing ? (
                          <>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={editRevenue}
                              onChange={(e) => setEditRevenue(e.target.value)}
                              placeholder="Revenue (INR)"
                              className="w-36"
                              autoFocus
                            />
                            <Input
                              type="date"
                              value={editRevenueDate}
                              max={todayMax}
                              onChange={(e) =>
                                setEditRevenueDate(
                                  clampDateToToday(e.target.value),
                                )
                              }
                              onBlur={(e) =>
                                setEditRevenueDate(
                                  clampDateToToday(e.target.value),
                                )
                              }
                              className="w-40"
                              title="Revenue date"
                            />
                            <Button
                              size="sm"
                              onClick={() => saveProjectRevenue(project.id)}
                              disabled={savingProjectId === project.id}
                            >
                              {savingProjectId === project.id
                                ? "Saving..."
                                : "Save"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEditProject}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <span
                              className={
                                project.revenue != null
                                  ? "text-sm font-semibold text-emerald-400"
                                  : "text-sm text-slate-500"
                              }
                            >
                              {project.revenue != null
                                ? formatCurrency(project.revenue)
                                : "Not set"}
                            </span>
                            {project.revenue != null &&
                              formatDisplayDate(project.revenueDate) && (
                                <span className="text-xs text-slate-500">
                                  {formatDisplayDate(project.revenueDate)}
                                </span>
                              )}
                            {share != null && (
                              <span className="text-xs text-slate-500">
                                {share}% of total
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => startEditProject(project)}
                              className="rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-cyan-400"
                              title={
                                project.revenue != null
                                  ? "Edit revenue"
                                  : "Add revenue"
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
              {!showAllProjects && hiddenProjectCount > 0 && (
                <p className="mt-3 text-center text-sm text-slate-500">
                  {hiddenProjectCount} more project
                  {hiddenProjectCount === 1 ? "" : "s"} — click See all to view
                  them.
                </p>
              )}
            </div>

            <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-medium text-white">Other revenue sources</h3>
                  <p className="mt-0.5 text-sm text-slate-400">
                    Additional income beyond project revenue.
                  </p>
                </div>
                {sortedSources.length > LIST_PREVIEW_COUNT && (
                  <button
                    type="button"
                    onClick={() => setShowAllSources((prev) => !prev)}
                    className="text-sm text-cyan-400 hover:text-cyan-300"
                  >
                    {showAllSources
                      ? "Show less"
                      : `See all (${sortedSources.length})`}
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {sortedSources.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-400">
                    No other revenue sources for this period.
                  </p>
                ) : (
                  visibleSources.map((source) =>
                    editingSourceId === source.id ? (
                      <div key={source.id} className="space-y-3">
                        {renderSourceForm(editSource, setEditSource)}
                        {sourceError && (
                          <p className="text-sm text-red-400">{sourceError}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => saveEditSource(source.id)}
                            disabled={busyId === source.id}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingSourceId(null);
                              setSourceError(null);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div key={source.id}>{renderSourceItem(source)}</div>
                    ),
                  )
                )}
              </div>
              {!showAllSources && hiddenSourceCount > 0 && (
                <p className="mt-3 text-center text-sm text-slate-500">
                  {hiddenSourceCount} more source
                  {hiddenSourceCount === 1 ? "" : "s"} — click See all to view them.
                </p>
              )}
            </div>

            {showAddSource && (
              <div className="mt-4 space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                {renderSourceForm(newSource, setNewSource)}
                {sourceError && (
                  <p className="text-sm text-red-400">{sourceError}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={saveNewSource}
                    disabled={busyId === "new-source"}
                  >
                    {busyId === "new-source" ? "Adding..." : "Save source"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowAddSource(false);
                      setNewSource(emptySourceForm());
                      setSourceError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-4">
              <Button size="sm" variant="secondary" onClick={openAddSource}>
                <Plus className="h-3.5 w-3.5" />
                Add source
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-900/30">
          <CardContent className="pt-5">
            <div className="mb-4">
              <h2 className="font-semibold text-white">Revenue spent</h2>
              <p className="mt-0.5 text-sm text-slate-400">
                {isAllMonths
                  ? "Record where revenue is spent — salaries, tools, ops, and more."
                  : `Expenses recorded for ${selectedMonthLabel.toLowerCase()}.`}
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-medium text-white">Expenses</h3>
                  <p className="mt-0.5 text-sm text-slate-400">
                    Spending recorded for this period.
                  </p>
                </div>
                {sortedExpenses.length > LIST_PREVIEW_COUNT && (
                  <button
                    type="button"
                    onClick={() => setShowAllExpenses((prev) => !prev)}
                    className="text-sm text-cyan-400 hover:text-cyan-300"
                  >
                    {showAllExpenses
                      ? "Show less"
                      : `See all (${sortedExpenses.length})`}
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {sortedExpenses.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">
                    {isAllMonths
                      ? "No expenses recorded yet."
                      : `No expenses recorded for ${selectedMonthLabel.toLowerCase()}.`}
                  </p>
                ) : (
                  visibleExpenses.map((expense) =>
                    editingExpenseId === expense.id ? (
                      <div key={expense.id} className="space-y-3">
                        {renderExpenseForm(
                          editExpense,
                          setEditExpense,
                          EXPENSE_CATEGORIES,
                        )}
                        {expenseError && (
                          <p className="text-sm text-red-400">{expenseError}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => saveEditExpense(expense.id)}
                            disabled={busyId === expense.id}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingExpenseId(null);
                              setExpenseError(null);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div key={expense.id}>{renderExpenseItem(expense)}</div>
                    ),
                  )
                )}
              </div>
              {!showAllExpenses && hiddenExpenseCount > 0 && (
                <p className="mt-3 text-center text-sm text-slate-500">
                  {hiddenExpenseCount} more expense
                  {hiddenExpenseCount === 1 ? "" : "s"} — click See all to view them.
                </p>
              )}
            </div>

            <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-medium text-white">Monthly salary records</h3>
                  <p className="mt-0.5 text-sm text-slate-400">
                    {isAllMonths
                      ? "Payment status for each team member by month."
                      : `Salary records for ${selectedMonthLabel.toLowerCase()}.`}
                  </p>
                </div>
                {filteredSalaryPayments.length > LIST_PREVIEW_COUNT && (
                  <button
                    type="button"
                    onClick={() => setShowAllSalaryRecords((prev) => !prev)}
                    className="text-sm text-cyan-400 hover:text-cyan-300"
                  >
                    {showAllSalaryRecords
                      ? "Show less"
                      : `See all (${filteredSalaryPayments.length})`}
                  </button>
                )}
              </div>

              {filteredSalaryPayments.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">
                  {isAllMonths
                    ? "No salary records yet. Add salaries under the Salaries category."
                    : `No salary records for ${selectedMonthLabel.toLowerCase()}.`}
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-left text-slate-400">
                          <th className="pb-3 pr-4 font-medium">Member</th>
                          <th className="pb-3 pr-4 font-medium">Month</th>
                          <th className="pb-3 pr-4 font-medium">Amount</th>
                          <th className="pb-3 pr-4 font-medium">Status</th>
                          <th className="pb-3 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleSalaryPayments.map((payment) => (
                          <tr
                            key={payment.id}
                            className="border-b border-slate-800/70 last:border-0"
                          >
                            <td className="py-3 pr-4 font-medium text-white">
                              {payment.userName}
                            </td>
                            <td className="py-3 pr-4 text-slate-300">
                              {formatMonthLabel(payment.monthKey)}
                            </td>
                            <td className="py-3 pr-4 text-red-400">
                              {formatCurrency(payment.amount)}
                            </td>
                            <td className="py-3 pr-4">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs ${
                                  payment.status === "PAID"
                                    ? "bg-emerald-950 text-emerald-400"
                                    : "bg-amber-950 text-amber-400"
                                }`}
                              >
                                {payment.status === "PAID" ? "Paid" : "Not paid"}
                              </span>
                            </td>
                            <td className="py-3">
                              {payment.status === "NOT_PAID" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  disabled={busyId === `record-pay-${payment.id}`}
                                  onClick={() => paySalaryRecord(payment)}
                                >
                                  {busyId === `record-pay-${payment.id}`
                                    ? "Marking..."
                                    : "Mark paid"}
                                </Button>
                              ) : (
                                <span className="text-xs text-slate-500">
                                  {payment.paidDate
                                    ? formatDisplayDate(payment.paidDate)
                                    : "Paid"}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!showAllSalaryRecords && hiddenSalaryRecordCount > 0 && (
                    <p className="mt-3 text-center text-sm text-slate-500">
                      {hiddenSalaryRecordCount} more record
                      {hiddenSalaryRecordCount === 1 ? "" : "s"} — click See all to
                      view them.
                    </p>
                  )}
                </>
              )}
            </div>

            {showAddExpense && (
              <div className="mt-4 space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                {renderExpenseForm(
                  newExpense,
                  setNewExpense,
                  EXPENSE_CATEGORIES,
                  { salaryPayroll: true },
                )}
                {expenseError && (
                  <p className="text-sm text-red-400">{expenseError}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={saveNewExpense}
                    disabled={
                      busyId === "new-expense" ||
                      (newExpense.category === "Salaries" &&
                        salaryEntries[selectedSalaryMemberId]?.status === "PAID")
                    }
                  >
                    {busyId === "new-expense"
                      ? "Saving..."
                      : newExpense.category === "Salaries"
                        ? "Save salary record"
                        : "Save expense"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowAddExpense(false);
                      setNewExpense(emptyExpenseForm());
                      setSalaryEntries({});
                      setSelectedSalaryMemberId("");
                      setExpenseError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-4">
              <Button size="sm" variant="secondary" onClick={openAddExpense}>
                <Plus className="h-3.5 w-3.5" />
                Add expense
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

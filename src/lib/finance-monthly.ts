export const ALL_MONTHS = "all";

export function toMonthKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function isInMonth(
  value: string | null | undefined,
  monthKey: string,
): boolean {
  return toMonthKey(value) === monthKey;
}

export function matchesSelectedPeriod(
  selectedMonth: string,
  primaryDate?: string | null,
  fallbackDate?: string | null,
): boolean {
  if (selectedMonth === ALL_MONTHS) return true;
  const itemMonth = toMonthKey(primaryDate) ?? toMonthKey(fallbackDate);
  return itemMonth === selectedMonth;
}

export function listMonthOptionsFromDates(
  dates: (string | null | undefined)[],
  includeCurrent = true,
): string[] {
  const keys = new Set<string>();
  for (const date of dates) {
    const key = toMonthKey(date);
    if (key) keys.add(key);
  }
  if (includeCurrent) keys.add(currentMonthKey());
  return [...keys].sort((a, b) => b.localeCompare(a));
}

export type MonthlyFinanceRow = {
  monthKey: string;
  revenue: number;
  spent: number;
  net: number;
};

type MonthlyRevenueInput = {
  amount: number;
  date: string | null;
  fallbackDate?: string | null;
};

type MonthlyExpenseInput = {
  amount: number;
  date: string | null;
};

export function buildMonthlyBreakdown(
  revenueItems: MonthlyRevenueInput[],
  expenseItems: MonthlyExpenseInput[],
): MonthlyFinanceRow[] {
  const byMonth = new Map<string, { revenue: number; spent: number }>();

  function add(monthKey: string, field: "revenue" | "spent", amount: number) {
    const row = byMonth.get(monthKey) ?? { revenue: 0, spent: 0 };
    row[field] += amount;
    byMonth.set(monthKey, row);
  }

  for (const item of revenueItems) {
    const monthKey = toMonthKey(item.date) ?? toMonthKey(item.fallbackDate);
    if (!monthKey) continue;
    add(monthKey, "revenue", item.amount);
  }

  for (const item of expenseItems) {
    const monthKey = toMonthKey(item.date);
    if (!monthKey) continue;
    add(monthKey, "spent", item.amount);
  }

  return [...byMonth.entries()]
    .map(([monthKey, totals]) => ({
      monthKey,
      revenue: totals.revenue,
      spent: totals.spent,
      net: totals.revenue - totals.spent,
    }))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

export function listMonthOptions(
  rows: MonthlyFinanceRow[],
  includeCurrent = true,
): string[] {
  const keys = new Set(rows.map((row) => row.monthKey));
  if (includeCurrent) keys.add(currentMonthKey());

  return [...keys].sort((a, b) => b.localeCompare(a));
}

export function sumMonthlyRevenue(
  revenueItems: MonthlyRevenueInput[],
  monthKey: string,
): number {
  return revenueItems.reduce((sum, item) => {
    const key = toMonthKey(item.date) ?? toMonthKey(item.fallbackDate);
    return key === monthKey ? sum + item.amount : sum;
  }, 0);
}

export function sumMonthlySpent(
  expenseItems: MonthlyExpenseInput[],
  monthKey: string,
): number {
  return expenseItems.reduce((sum, item) => {
    const key = toMonthKey(item.date);
    return key === monthKey ? sum + item.amount : sum;
  }, 0);
}

export function toMonthInputValue(value: string | null | undefined): string {
  return toMonthKey(value) ?? "";
}

export function monthInputToStorageDate(monthKey: string): string | null {
  const trimmed = monthKey.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-01`;
}

export function formatMonthFromDate(value: string | null): string | null {
  const key = toMonthKey(value);
  return key ? formatMonthLabel(key) : null;
}

export function currentDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const monthKey = toMonthKey(trimmed);
  return monthKey ? `${monthKey}-01` : "";
}

export function clampDateToToday(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const normalized = toDateInputValue(trimmed) || trimmed;
  const today = currentDateInputValue();
  return normalized > today ? today : normalized;
}

export function isFutureDate(value: string): boolean {
  const normalized = toDateInputValue(value.trim()) || value.trim();
  if (!normalized) return false;
  return normalized > currentDateInputValue();
}

export function formatDisplayDate(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function normalizeStorageDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return monthInputToStorageDate(trimmed);
}

export const MONTH_FILTER_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

export function monthFilterOptionsForYear(year: string | number) {
  const yearNum = Number(year);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (Number.isNaN(yearNum) || yearNum < currentYear) {
    return MONTH_FILTER_OPTIONS;
  }
  if (yearNum > currentYear) {
    return MONTH_FILTER_OPTIONS.slice(0, 0);
  }

  return MONTH_FILTER_OPTIONS.filter(
    (option) => Number(option.value) <= currentMonth,
  );
}

export function parseMonthKey(
  monthKey: string,
): { year: string; month: string } | null {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  return { year: match[1], month: match[2] };
}

export function buildYearOptions(existingMonthKeys: string[] = []): number[] {
  const years = new Set<number>();
  const currentYear = new Date().getFullYear();
  for (let year = currentYear - 3; year <= currentYear; year++) {
    years.add(year);
  }
  for (const key of existingMonthKeys) {
    const parsed = parseMonthKey(key);
    if (parsed) years.add(Number(parsed.year));
  }
  return [...years].sort((a, b) => b - a);
}

export function defaultFormDateForMonth(monthKey: string): string {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return currentDateInputValue();

  const today = currentDateInputValue();
  if (toMonthKey(today) === monthKey) return today;

  const firstOfMonth = `${parsed.year}-${parsed.month}-01`;
  return firstOfMonth > today ? today : firstOfMonth;
}

export function buildMonthPickerOptions(
  existingMonthKeys: string[] = [],
  yearsAhead = 1,
): string[] {
  const keys = new Set(existingMonthKeys);
  const now = new Date();
  const start = new Date(now.getFullYear() - 2, 0, 1);
  const end = new Date(now.getFullYear() + yearsAhead, 11, 1);

  for (
    let cursor = new Date(start);
    cursor <= end;
    cursor.setMonth(cursor.getMonth() + 1)
  ) {
    keys.add(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
    );
  }

  return [...keys].sort((a, b) => b.localeCompare(a));
}

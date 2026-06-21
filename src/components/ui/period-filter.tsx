"use client";

import { Select } from "@/components/ui/select";

type PeriodFilterProps = {
  filterYear: string;
  filterMonth: string;
  viewAllTime: boolean;
  yearOptions: number[];
  visibleMonthOptions: readonly { value: string; label: string }[];
  onFilterYearChange: (year: string) => void;
  onFilterMonthChange: (month: string) => void;
  onViewAllTimeChange: (allTime: boolean) => void;
  className?: string;
  compact?: boolean;
};

export function PeriodFilter({
  filterYear,
  filterMonth,
  viewAllTime,
  yearOptions,
  visibleMonthOptions,
  onFilterYearChange,
  onFilterMonthChange,
  onViewAllTimeChange,
  className,
  compact = false,
}: PeriodFilterProps) {
  return (
    <div
      className={`flex flex-wrap items-end ${compact ? "gap-2" : "gap-3"} ${className ?? ""}`}
    >
      <div className={compact ? "w-24" : "w-28"}>
        <label className="mb-0.5 block text-[10px] text-slate-400">Year</label>
        <Select
          value={filterYear}
          disabled={viewAllTime}
          onChange={(e) => onFilterYearChange(e.target.value)}
        >
          {yearOptions.map((year) => (
            <option key={year} value={String(year)}>
              {year}
            </option>
          ))}
        </Select>
      </div>
      <div className={compact ? "w-32" : "w-40"}>
        <label className="mb-0.5 block text-[10px] text-slate-400">Month</label>
        <Select
          value={filterMonth}
          disabled={viewAllTime}
          onChange={(e) => onFilterMonthChange(e.target.value)}
        >
          {visibleMonthOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      <label
        className={`flex items-center gap-1.5 text-slate-300 ${compact ? "pb-1.5 text-xs" : "pb-2 text-sm"}`}
      >
        <input
          type="checkbox"
          checked={viewAllTime}
          onChange={(e) => onViewAllTimeChange(e.target.checked)}
          className="rounded border-slate-600 bg-slate-900"
        />
        All time
      </label>
    </div>
  );
}

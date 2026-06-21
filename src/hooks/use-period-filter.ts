"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ALL_MONTHS,
  buildYearOptions,
  currentMonthKey,
  formatMonthLabel,
  monthFilterOptionsForYear,
} from "@/lib/finance-monthly";

export function usePeriodFilter(existingMonthKeys: string[] = []) {
  const now = new Date();
  const [viewAllTime, setViewAllTime] = useState(false);
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));
  const [filterMonth, setFilterMonth] = useState(
    String(now.getMonth() + 1).padStart(2, "0"),
  );

  const selectedMonth = viewAllTime ? ALL_MONTHS : `${filterYear}-${filterMonth}`;
  const isAllTime = viewAllTime;

  const monthKeys = useMemo(() => {
    const keys = new Set(existingMonthKeys);
    keys.add(currentMonthKey());
    return [...keys];
  }, [existingMonthKeys]);

  const yearOptions = useMemo(
    () => buildYearOptions(monthKeys),
    [monthKeys],
  );

  const visibleMonthOptions = useMemo(
    () => monthFilterOptionsForYear(filterYear),
    [filterYear],
  );

  const selectedMonthLabel = isAllTime
    ? "All time"
    : formatMonthLabel(selectedMonth);

  const handleYearChange = useCallback(
    (nextYear: string) => {
      setFilterYear(nextYear);
      const allowed = monthFilterOptionsForYear(nextYear);
      if (!allowed.some((option) => option.value === filterMonth)) {
        setFilterMonth(allowed[allowed.length - 1]?.value ?? filterMonth);
      }
    },
    [filterMonth],
  );

  return {
    viewAllTime,
    setViewAllTime,
    filterYear,
    setFilterYear: handleYearChange,
    filterMonth,
    setFilterMonth,
    selectedMonth,
    isAllTime,
    yearOptions,
    visibleMonthOptions,
    selectedMonthLabel,
  };
}

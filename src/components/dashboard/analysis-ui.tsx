"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "cyan" | "violet" | "emerald" | "amber" | "red";

const toneStyles: Record<
  Tone,
  { border: string; bg: string; icon: string }
> = {
  cyan: {
    border: "border-cyan-900/40",
    bg: "bg-cyan-950/20",
    icon: "bg-cyan-950 text-cyan-400",
  },
  violet: {
    border: "border-violet-900/40",
    bg: "bg-violet-950/20",
    icon: "bg-violet-950 text-violet-400",
  },
  emerald: {
    border: "border-emerald-900/40",
    bg: "bg-emerald-950/20",
    icon: "bg-emerald-950 text-emerald-400",
  },
  amber: {
    border: "border-amber-900/40",
    bg: "bg-amber-950/20",
    icon: "bg-amber-950 text-amber-400",
  },
  red: {
    border: "border-red-900/40",
    bg: "bg-red-950/20",
    icon: "bg-red-950 text-red-400",
  },
};

export function AnalysisCard({
  title,
  subtitle,
  moduleHref,
  moduleLabel,
  headerActions,
  compact = false,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  moduleHref?: string;
  moduleLabel?: string;
  headerActions?: ReactNode;
  compact?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card
      className={cn(
        "border-slate-800",
        compact && "h-full",
        className,
      )}
    >
      <CardContent className={cn(compact ? "space-y-3 p-4" : "space-y-6 pt-5")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              className={cn(
                "font-semibold text-white",
                compact ? "text-base" : "text-lg",
              )}
            >
              {title}
            </h2>
            {subtitle && (
              <p
                className={cn(
                  "text-slate-400",
                  compact ? "mt-0.5 text-xs" : "mt-0.5 text-sm",
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
          {(headerActions || moduleHref) && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {headerActions}
              {moduleHref && (
                <Link
                  href={moduleHref}
                  className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                >
                  {moduleLabel ?? "Open module"}
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function AnalysisStatGrid({
  compact = false,
  columns = 4,
  children,
}: {
  compact?: boolean;
  columns?: 2 | 3 | 4;
  children: ReactNode;
}) {
  const colClass =
    columns === 2
      ? "grid-cols-2"
      : columns === 3
        ? "grid-cols-2 sm:grid-cols-3"
        : "grid-cols-2 lg:grid-cols-4";

  return (
    <div className={cn("grid gap-2", colClass, !compact && "gap-4")}>
      {children}
    </div>
  );
}

export function AnalysisStat({
  icon: Icon,
  label,
  value,
  tone = "cyan",
  compact = false,
  valueClassName,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  tone?: Tone;
  compact?: boolean;
  valueClassName?: string;
}) {
  const styles = toneStyles[tone];

  if (compact) {
    return (
      <div
        className={cn(
          "rounded-md border px-2.5 py-2",
          styles.border,
          styles.bg,
        )}
      >
        <div className="flex items-center gap-2">
          <div className={cn("rounded p-1", styles.icon)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p
              className={cn(
                "truncate font-semibold text-white",
                compact ? "text-sm" : "text-2xl",
                valueClassName,
              )}
            >
              {value}
            </p>
            <p className="truncate text-[10px] text-slate-400">{label}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border p-4",
        styles.border,
        styles.bg,
      )}
    >
      <div className={cn("rounded-lg p-3", styles.icon)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p
          className={cn("text-2xl font-bold text-white", valueClassName)}
        >
          {value}
        </p>
        <p className="text-sm text-slate-400">{label}</p>
      </div>
    </div>
  );
}

export function AnalysisDetailGrid({
  compact = false,
  children,
}: {
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid gap-3",
        compact ? "lg:grid-cols-2" : "gap-6 xl:grid-cols-2",
      )}
    >
      {children}
    </div>
  );
}

export function AnalysisPanel({
  title,
  description,
  action,
  compact = false,
  accent = "cyan",
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  accent?: "cyan" | "violet" | "emerald" | "red";
  children: ReactNode;
}) {
  const accentBorder = {
    cyan: "border-cyan-900/30",
    violet: "border-violet-900/30",
    emerald: "border-emerald-900/30",
    red: "border-red-900/30",
  }[accent];

  return (
    <div
      className={cn(
        "rounded-lg border bg-slate-900/20",
        accentBorder,
        compact ? "p-3" : "p-4",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3
            className={cn(
              "font-semibold text-white",
              compact ? "text-sm" : "text-base",
            )}
          >
            {title}
          </h3>
          {description && (
            <p
              className={cn(
                "text-slate-400",
                compact ? "mt-0.5 text-[11px] leading-snug" : "mt-0.5 text-sm",
              )}
            >
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className={compact ? "mt-2.5" : "mt-4"}>{children}</div>
    </div>
  );
}

export function AnalysisBreakdownList({
  compact = false,
  children,
}: {
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        compact ? "grid gap-1.5 sm:grid-cols-2" : "space-y-2",
      )}
    >
      {children}
    </div>
  );
}

export function AnalysisBreakdownRow({
  compact = false,
  left,
  right,
}: {
  compact?: boolean;
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950/50",
        compact ? "px-2 py-1.5" : "gap-3 rounded-lg px-3 py-2.5",
      )}
    >
      <div className="min-w-0">{left}</div>
      <div className="shrink-0 text-right">{right}</div>
    </div>
  );
}

export function AnalysisListBox({
  compact = false,
  emptyMessage,
  children,
}: {
  compact?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}) {
  const isEmpty =
    !children ||
    (Array.isArray(children) && children.length === 0);

  if (isEmpty && emptyMessage) {
    return (
      <p className={cn("text-slate-400", compact ? "text-xs" : "text-sm")}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border border-slate-800 bg-slate-900/40",
        compact ? "max-h-52 overflow-y-auto p-2" : "p-4",
      )}
    >
      <div className={compact ? "space-y-1.5" : "space-y-2"}>{children}</div>
    </div>
  );
}

export function AnalysisScrollTable({
  compact = false,
  children,
}: {
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-md border border-slate-800",
        compact && "max-h-44 overflow-y-auto",
      )}
    >
      {children}
    </div>
  );
}

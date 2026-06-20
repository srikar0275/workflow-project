import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

const colorMap = {
  default: "bg-slate-800 text-slate-200",
  cyan: "bg-cyan-950 text-cyan-300 border border-cyan-800",
  green: "bg-emerald-950 text-emerald-300 border border-emerald-800",
  yellow: "bg-amber-950 text-amber-300 border border-amber-800",
  red: "bg-red-950 text-red-300 border border-red-800",
  blue: "bg-blue-950 text-blue-300 border border-blue-800",
  purple: "bg-violet-950 text-violet-300 border border-violet-800",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  color?: keyof typeof colorMap;
};

export function Badge({ className, color = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        colorMap[color],
        className,
      )}
      {...props}
    />
  );
}

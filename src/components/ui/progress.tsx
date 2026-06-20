import { cn } from "@/lib/utils";

type ProgressProps = {
  value: number;
  className?: string;
  size?: "sm" | "md";
};

export function Progress({ value, className, size = "md" }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-slate-800",
        size === "sm" ? "h-1.5" : "h-2.5",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

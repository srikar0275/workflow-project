import { CardGridSkeleton } from "@/components/ui/page-skeleton";

export default function TeamLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div>
        <div className="h-8 w-32 rounded-lg bg-slate-800" />
        <div className="mt-2 h-4 w-64 rounded bg-slate-800/70" />
      </div>
      <CardGridSkeleton />
    </div>
  );
}

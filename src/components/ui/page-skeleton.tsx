export function PageSkeleton({ title = true }: { title?: boolean }) {
  return (
    <div className="animate-pulse space-y-6">
      {title && (
        <div>
          <div className="h-8 w-48 rounded-lg bg-slate-800" />
          <div className="mt-2 h-4 w-72 rounded bg-slate-800/70" />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-slate-800 bg-slate-900/50" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border border-slate-800 bg-slate-900/50" />
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-36 rounded-xl border border-slate-800 bg-slate-900/50" />
      ))}
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { AnalysisCard } from "@/components/dashboard/analysis-ui";

export async function DashboardActivitySection() {
  const recentActivity = await prisma.activityLog.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      action: true,
      user: { select: { name: true } },
      project: { select: { name: true } },
    },
  });

  return (
    <AnalysisCard
      compact
      title="Recent activity"
      subtitle="Latest updates across the workspace"
      className="h-full"
    >
      <div className="max-h-52 space-y-2 overflow-y-auto rounded-md border border-slate-800 bg-slate-900/40 p-2">
        {recentActivity.length === 0 ? (
          <p className="px-1 py-2 text-xs text-slate-400">No activity yet.</p>
        ) : (
          recentActivity.map((log) => (
            <div
              key={log.id}
              className="rounded-md border border-slate-800/80 bg-slate-950/50 px-2 py-1.5"
            >
              <p className="text-xs text-slate-200">{log.action}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {log.user.name}
                {log.project ? ` · ${log.project.name}` : ""}
              </p>
            </div>
          ))
        )}
      </div>
    </AnalysisCard>
  );
}

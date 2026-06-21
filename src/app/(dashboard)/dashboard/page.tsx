import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { DashboardActivitySection } from "./activity-section";
import { DashboardFinanceSection } from "./finance-section";
import { DashboardProjectsSection } from "./projects-section";
import { DashboardTasksSection } from "./tasks-section";
import { DashboardTeamSection } from "./team-section";

function SectionSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div className={tall ? "min-h-[280px]" : "min-h-[220px]"}>
      <PageSkeleton title={false} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Overview of projects, finance, tasks, and team. Filter by period,
          then open a module for full details.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Suspense fallback={<SectionSkeleton />}>
          <DashboardProjectsSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <DashboardTasksSection />
        </Suspense>
      </div>

      <Suspense fallback={<SectionSkeleton tall />}>
        <DashboardFinanceSection />
      </Suspense>

      <div className="grid gap-4 xl:grid-cols-2">
        <Suspense fallback={<SectionSkeleton />}>
          <DashboardTeamSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <DashboardActivitySection />
        </Suspense>
      </div>
    </div>
  );
}

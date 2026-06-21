import dynamic from "next/dynamic";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { listAllFinanceExpenses } from "@/lib/finance-expenses";
import { listFinanceProjects } from "@/lib/finance-projects";
import { listAllRevenueSources } from "@/lib/revenue-sources";
import { listAllSalaryPayments } from "@/lib/salary-payments";
import { PageSkeleton } from "@/components/ui/page-skeleton";

const FinanceView = dynamic(
  () => import("./finance-view").then((mod) => mod.FinanceView),
  {
    loading: () => <PageSkeleton />,
  },
);

export default async function FinancePage() {
  const [projects, sources, expenses, teamMembers, salaryPayments] =
    await Promise.all([
    listFinanceProjects(),
    listAllRevenueSources(),
    listAllFinanceExpenses(),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        devRole: true,
        salary: true,
      },
      orderBy: { name: "asc" },
    }),
    listAllSalaryPayments(),
  ]);

  return (
    <Suspense fallback={<PageSkeleton />}>
      <FinanceView
      initialProjects={projects.map((project) => ({
        ...project,
        updatedAt: project.updatedAt.includes("T")
          ? project.updatedAt
          : new Date(project.updatedAt).toISOString(),
      }))}
      initialSources={sources
        .filter((source) => source.projectId == null)
        .map(
          ({
            id,
            name,
            amount,
            category,
            description,
            receivedDate,
            notes,
          }) => ({
            id,
            name,
            amount,
            category,
            description,
            receivedDate,
            notes,
          }),
        )}
      initialExpenses={expenses}
      initialTeamMembers={teamMembers}
      initialSalaryPayments={salaryPayments}
      />
    </Suspense>
  );
}

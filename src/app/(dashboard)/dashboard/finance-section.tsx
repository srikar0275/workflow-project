import { prisma } from "@/lib/prisma";
import { listAllFinanceExpenses } from "@/lib/finance-expenses";
import { listAllRevenueSources } from "@/lib/revenue-sources";
import { FinanceAccountingSummary } from "@/components/dashboard/finance-accounting-summary";

export async function DashboardFinanceSection() {
  const [projects, sources, expenses] = await Promise.all([
    prisma.project.findMany({
      select: {
        id: true,
        name: true,
        client: true,
        status: true,
        revenue: true,
        revenueDate: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    listAllRevenueSources(),
    listAllFinanceExpenses(),
  ]);

  const otherSources = sources
    .filter((source) => source.projectId == null)
    .map(({ id, name, amount, category, receivedDate }) => ({
      id,
      name,
      amount,
      category,
      receivedDate,
    }));

  return (
    <FinanceAccountingSummary
      projects={projects.map((project) => ({
        ...project,
        updatedAt: project.updatedAt.toISOString(),
      }))}
      sources={otherSources}
      expenses={expenses.map(
        ({ id, name, amount, category, projectId, expenseDate }) => ({
          id,
          name,
          amount,
          category,
          projectId,
          expenseDate,
        }),
      )}
      compact
    />
  );
}
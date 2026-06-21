type ProjectRevenue = { revenue: number | null };

type RevenueSourceAmount = {
  projectId: string | null;
  amount: number;
};

type ExpenseAmount = {
  amount: number;
};

export function computeFinanceTotals(
  projects: ProjectRevenue[],
  sources: RevenueSourceAmount[],
  expenses: ExpenseAmount[],
) {
  const projectRevenueTotal = projects.reduce(
    (sum, project) => sum + (project.revenue ?? 0),
    0,
  );
  const otherSourcesTotal = sources
    .filter((source) => source.projectId == null)
    .reduce((sum, source) => sum + source.amount, 0);
  const totalIncome = projectRevenueTotal + otherSourcesTotal;
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netBalance = totalIncome - totalSpent;

  return {
    projectRevenueTotal,
    otherSourcesTotal,
    totalIncome,
    totalSpent,
    netBalance,
  };
}

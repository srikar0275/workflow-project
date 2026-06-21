import { prisma } from "@/lib/prisma";

export type FinanceExpenseRecord = {
  id: string;
  projectId: string | null;
  name: string;
  amount: number;
  category: string | null;
  description: string | null;
  expenseDate: string | null;
  notes: string | null;
};

function mapRow(expense: {
  id: string;
  projectId: string | null;
  name: string;
  amount: number;
  category: string | null;
  description: string | null;
  expenseDate: string | null;
  notes: string | null;
}): FinanceExpenseRecord {
  return {
    id: expense.id,
    projectId: expense.projectId,
    name: expense.name,
    amount: expense.amount,
    category: expense.category,
    description: expense.description,
    expenseDate: expense.expenseDate,
    notes: expense.notes,
  };
}

export async function listAllFinanceExpenses(): Promise<FinanceExpenseRecord[]> {
  const rows = await prisma.financeExpense.findMany({
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapRow);
}

export type CreateFinanceExpenseInput = {
  projectId?: string | null;
  name: string;
  amount: number;
  category?: string | null;
  description?: string | null;
  expenseDate?: string | null;
  notes?: string | null;
};

export type UpdateFinanceExpenseInput = {
  name?: string;
  amount?: number;
  category?: string | null;
  description?: string | null;
  expenseDate?: string | null;
  notes?: string | null;
};

export async function createFinanceExpense(
  input: CreateFinanceExpenseInput,
): Promise<FinanceExpenseRecord> {
  const expense = await prisma.financeExpense.create({
    data: {
      projectId: input.projectId ?? null,
      name: input.name,
      amount: input.amount,
      category: input.category?.trim() || null,
      description: input.description?.trim() || null,
      expenseDate: input.expenseDate?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });

  return mapRow(expense);
}

export async function updateFinanceExpense(
  id: string,
  data: UpdateFinanceExpenseInput,
): Promise<FinanceExpenseRecord | null> {
  const existing = await prisma.financeExpense.findUnique({ where: { id } });
  if (!existing) return null;

  const expense = await prisma.financeExpense.update({
    where: { id },
    data: {
      name: data.name ?? existing.name,
      amount: data.amount ?? existing.amount,
      category:
        data.category !== undefined
          ? data.category?.trim() || null
          : existing.category,
      description:
        data.description !== undefined
          ? data.description?.trim() || null
          : existing.description,
      expenseDate:
        data.expenseDate !== undefined
          ? data.expenseDate?.trim() || null
          : existing.expenseDate,
      notes:
        data.notes !== undefined ? data.notes?.trim() || null : existing.notes,
    },
  });

  return mapRow(expense);
}

export async function deleteFinanceExpense(id: string): Promise<{
  id: string;
  name: string;
} | null> {
  const existing = await prisma.financeExpense.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!existing) return null;

  await prisma.financeExpense.delete({ where: { id } });
  return existing;
}

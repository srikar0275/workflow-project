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

function mapRow(row: Record<string, unknown>): FinanceExpenseRecord {
  return {
    id: String(row.id),
    projectId: row.projectId != null ? String(row.projectId) : null,
    name: String(row.name),
    amount: Number(row.amount),
    category: row.category != null ? String(row.category) : null,
    description: row.description != null ? String(row.description) : null,
    expenseDate: row.expenseDate != null ? String(row.expenseDate) : null,
    notes: row.notes != null ? String(row.notes) : null,
  };
}

const SELECT_COLUMNS = `
  id, projectId, name, amount, category, description,
  CAST(expenseDate AS TEXT) AS expenseDate, notes
`;

export async function listAllFinanceExpenses(): Promise<FinanceExpenseRecord[]> {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT ${SELECT_COLUMNS}
     FROM FinanceExpense
     ORDER BY createdAt ASC`,
  );
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
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const projectId = input.projectId ?? null;
  const category = input.category?.trim() || null;
  const description = input.description?.trim() || null;
  const expenseDate = input.expenseDate?.trim() || null;
  const notes = input.notes?.trim() || null;

  await prisma.$executeRawUnsafe(
    `INSERT INTO FinanceExpense (
       id, projectId, name, amount, category, description, expenseDate, notes, createdAt, updatedAt
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    projectId,
    input.name,
    input.amount,
    category,
    description,
    expenseDate,
    notes,
    now,
    now,
  );

  return {
    id,
    projectId,
    name: input.name,
    amount: input.amount,
    category,
    description,
    expenseDate,
    notes,
  };
}

export async function updateFinanceExpense(
  id: string,
  data: UpdateFinanceExpenseInput,
): Promise<FinanceExpenseRecord | null> {
  const existingRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT ${SELECT_COLUMNS} FROM FinanceExpense WHERE id = ? LIMIT 1`,
    id,
  );
  const existing = existingRows[0];
  if (!existing) return null;

  const name = data.name ?? String(existing.name);
  const amount = data.amount ?? Number(existing.amount);
  const category =
    data.category !== undefined
      ? data.category?.trim() || null
      : existing.category != null
        ? String(existing.category)
        : null;
  const description =
    data.description !== undefined
      ? data.description?.trim() || null
      : existing.description != null
        ? String(existing.description)
        : null;
  const expenseDate =
    data.expenseDate !== undefined
      ? data.expenseDate?.trim() || null
      : existing.expenseDate != null
        ? String(existing.expenseDate)
        : null;
  const notes =
    data.notes !== undefined
      ? data.notes?.trim() || null
      : existing.notes != null
        ? String(existing.notes)
        : null;
  const now = new Date().toISOString();

  await prisma.$executeRawUnsafe(
    `UPDATE FinanceExpense
     SET name = ?, amount = ?, category = ?, description = ?, expenseDate = ?, notes = ?, updatedAt = ?
     WHERE id = ?`,
    name,
    amount,
    category,
    description,
    expenseDate,
    notes,
    now,
    id,
  );

  return {
    id,
    projectId: existing.projectId != null ? String(existing.projectId) : null,
    name,
    amount,
    category,
    description,
    expenseDate,
    notes,
  };
}

export async function deleteFinanceExpense(id: string): Promise<{
  id: string;
  name: string;
} | null> {
  const existingRows = await prisma.$queryRawUnsafe<{ id: string; name: string }[]>(
    `SELECT id, name FROM FinanceExpense WHERE id = ? LIMIT 1`,
    id,
  );
  const existing = existingRows[0];
  if (!existing) return null;

  await prisma.$executeRawUnsafe(`DELETE FROM FinanceExpense WHERE id = ?`, id);
  return existing;
}

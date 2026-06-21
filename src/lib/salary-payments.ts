import { prisma } from "@/lib/prisma";
import {
  createFinanceExpense,
  deleteFinanceExpense,
  updateFinanceExpense,
} from "@/lib/finance-expenses";

export type SalaryPaymentStatus = "PAID" | "NOT_PAID";

export type SalaryPaymentRecord = {
  id: string;
  userId: string;
  userName: string;
  monthKey: string;
  amount: number;
  status: SalaryPaymentStatus;
  paidDate: string | null;
  expenseId: string | null;
};

function mapRow(row: Record<string, unknown>): SalaryPaymentRecord {
  return {
    id: String(row.id),
    userId: String(row.userId),
    userName: String(row.userName),
    monthKey: String(row.monthKey),
    amount: Number(row.amount),
    status: row.status === "PAID" ? "PAID" : "NOT_PAID",
    paidDate: row.paidDate != null ? String(row.paidDate) : null,
    expenseId: row.expenseId != null ? String(row.expenseId) : null,
  };
}

const SELECT_WITH_USER = `
  SELECT
    sp.id,
    sp.userId,
    u.name AS userName,
    sp.monthKey,
    sp.amount,
    sp.status,
    CAST(sp.paidDate AS TEXT) AS paidDate,
    sp.expenseId
  FROM SalaryPayment sp
  INNER JOIN User u ON u.id = sp.userId
`;

export async function listAllSalaryPayments(): Promise<SalaryPaymentRecord[]> {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `${SELECT_WITH_USER}
     ORDER BY sp.monthKey DESC, u.name ASC`,
  );
  return rows.map(mapRow);
}

async function findSalaryPaymentByUserMonth(
  userId: string,
  monthKey: string,
): Promise<SalaryPaymentRecord | null> {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `${SELECT_WITH_USER}
     WHERE sp.userId = ? AND sp.monthKey = ?
     LIMIT 1`,
    userId,
    monthKey,
  );
  const row = rows[0];
  return row ? mapRow(row) : null;
}

async function findSalaryPaymentById(
  paymentId: string,
): Promise<SalaryPaymentRecord | null> {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `${SELECT_WITH_USER}
     WHERE sp.id = ?
     LIMIT 1`,
    paymentId,
  );
  const row = rows[0];
  return row ? mapRow(row) : null;
}

async function saveSalaryPaymentRow(input: {
  id?: string;
  userId: string;
  monthKey: string;
  amount: number;
  status: SalaryPaymentStatus;
  paidDate: string | null;
  expenseId: string | null;
}): Promise<SalaryPaymentRecord> {
  const now = new Date().toISOString();
  const existing = await findSalaryPaymentByUserMonth(input.userId, input.monthKey);

  if (existing) {
    await prisma.$executeRawUnsafe(
      `UPDATE SalaryPayment
       SET amount = ?, status = ?, paidDate = ?, expenseId = ?, updatedAt = ?
       WHERE id = ?`,
      input.amount,
      input.status,
      input.paidDate,
      input.expenseId,
      now,
      existing.id,
    );
    const saved = await findSalaryPaymentById(existing.id);
    if (!saved) throw new Error("Failed to load updated salary payment");
    return saved;
  }

  const id = input.id ?? crypto.randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO SalaryPayment (
       id, userId, monthKey, amount, status, paidDate, expenseId, createdAt, updatedAt
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.userId,
    input.monthKey,
    input.amount,
    input.status,
    input.paidDate,
    input.expenseId,
    now,
    now,
  );

  const saved = await findSalaryPaymentById(id);
  if (!saved) throw new Error("Failed to load created salary payment");
  return saved;
}

export async function clearSalaryPaymentExpenseLink(expenseId: string) {
  const now = new Date().toISOString();
  await prisma.$executeRawUnsafe(
    `UPDATE SalaryPayment
     SET expenseId = NULL, status = 'NOT_PAID', paidDate = NULL, updatedAt = ?
     WHERE expenseId = ?`,
    now,
    expenseId,
  );
}

type UpsertSalaryEntry = {
  userId: string;
  amount: number;
  status: SalaryPaymentStatus;
};

export async function upsertSalaryPayments(input: {
  monthKey: string;
  expenseDate: string;
  notes?: string;
  entries: UpsertSalaryEntry[];
}): Promise<{
  payments: SalaryPaymentRecord[];
  expenses: { id: string; name: string; amount: number; expenseDate: string | null }[];
  removedExpenseIds: string[];
}> {
  const { monthKey, expenseDate, notes, entries } = input;
  const payments: SalaryPaymentRecord[] = [];
  const expenses: { id: string; name: string; amount: number; expenseDate: string | null }[] =
    [];
  const removedExpenseIds: string[] = [];

  for (const entry of entries) {
    if (!Number.isFinite(entry.amount) || entry.amount <= 0) continue;

    const users = await prisma.$queryRawUnsafe<{ id: string; name: string }[]>(
      `SELECT id, name FROM User WHERE id = ? LIMIT 1`,
      entry.userId,
    );
    const user = users[0];
    if (!user) continue;

    const existing = await findSalaryPaymentByUserMonth(entry.userId, monthKey);
    let expenseId = existing?.expenseId ?? null;

    if (entry.status === "PAID") {
      const expenseName = `${user.name} - Salary`;
      if (expenseId) {
        const updated = await updateFinanceExpense(expenseId, {
          name: expenseName,
          amount: entry.amount,
          category: "Salaries",
          expenseDate,
          notes,
        });
        if (updated) {
          expenses.push({
            id: updated.id,
            name: updated.name,
            amount: updated.amount,
            expenseDate: updated.expenseDate,
          });
        }
      } else {
        const created = await createFinanceExpense({
          name: expenseName,
          amount: entry.amount,
          category: "Salaries",
          expenseDate,
          notes,
        });
        expenseId = created.id;
        expenses.push({
          id: created.id,
          name: created.name,
          amount: created.amount,
          expenseDate: created.expenseDate,
        });
      }
    } else if (expenseId) {
      await deleteFinanceExpense(expenseId);
      removedExpenseIds.push(expenseId);
      expenseId = null;
    }

    const saved = await saveSalaryPaymentRow({
      userId: entry.userId,
      monthKey,
      amount: entry.amount,
      status: entry.status,
      paidDate: entry.status === "PAID" ? expenseDate : null,
      expenseId,
    });

    payments.push(saved);
  }

  return { payments, expenses, removedExpenseIds };
}

export async function paySalaryPayment(
  paymentId: string,
  expenseDate: string,
  notes?: string,
): Promise<{
  payment: SalaryPaymentRecord;
  expense: { id: string; name: string; amount: number; expenseDate: string | null };
} | null> {
  const existing = await findSalaryPaymentById(paymentId);
  if (!existing) return null;

  const expenseName = `${existing.userName} - Salary`;
  let expenseId = existing.expenseId;

  if (expenseId) {
    const updated = await updateFinanceExpense(expenseId, {
      name: expenseName,
      amount: existing.amount,
      category: "Salaries",
      expenseDate,
      notes,
    });
    if (!updated) return null;

    const saved = await saveSalaryPaymentRow({
      id: existing.id,
      userId: existing.userId,
      monthKey: existing.monthKey,
      amount: existing.amount,
      status: "PAID",
      paidDate: expenseDate,
      expenseId,
    });

    return {
      payment: saved,
      expense: {
        id: updated.id,
        name: updated.name,
        amount: updated.amount,
        expenseDate: updated.expenseDate,
      },
    };
  }

  const created = await createFinanceExpense({
    name: expenseName,
    amount: existing.amount,
    category: "Salaries",
    expenseDate,
    notes,
  });

  const saved = await saveSalaryPaymentRow({
    id: existing.id,
    userId: existing.userId,
    monthKey: existing.monthKey,
    amount: existing.amount,
    status: "PAID",
    paidDate: expenseDate,
    expenseId: created.id,
  });

  return {
    payment: saved,
    expense: {
      id: created.id,
      name: created.name,
      amount: created.amount,
      expenseDate: created.expenseDate,
    },
  };
}

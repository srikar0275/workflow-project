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

function mapRow(payment: {
  id: string;
  userId: string;
  monthKey: string;
  amount: number;
  status: "PAID" | "NOT_PAID";
  paidDate: string | null;
  expenseId: string | null;
  user: { name: string };
}): SalaryPaymentRecord {
  return {
    id: payment.id,
    userId: payment.userId,
    userName: payment.user.name,
    monthKey: payment.monthKey,
    amount: payment.amount,
    status: payment.status,
    paidDate: payment.paidDate,
    expenseId: payment.expenseId,
  };
}

const paymentInclude = { user: { select: { name: true } } } as const;

export async function listAllSalaryPayments(): Promise<SalaryPaymentRecord[]> {
  const rows = await prisma.salaryPayment.findMany({
    include: paymentInclude,
    orderBy: [{ monthKey: "desc" }, { user: { name: "asc" } }],
  });
  return rows.map(mapRow);
}

async function findSalaryPaymentByUserMonth(
  userId: string,
  monthKey: string,
): Promise<SalaryPaymentRecord | null> {
  const row = await prisma.salaryPayment.findUnique({
    where: { userId_monthKey: { userId, monthKey } },
    include: paymentInclude,
  });
  return row ? mapRow(row) : null;
}

async function findSalaryPaymentById(
  paymentId: string,
): Promise<SalaryPaymentRecord | null> {
  const row = await prisma.salaryPayment.findUnique({
    where: { id: paymentId },
    include: paymentInclude,
  });
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
  const existing = await findSalaryPaymentByUserMonth(input.userId, input.monthKey);

  if (existing) {
    const saved = await prisma.salaryPayment.update({
      where: { id: existing.id },
      data: {
        amount: input.amount,
        status: input.status,
        paidDate: input.paidDate,
        expenseId: input.expenseId,
      },
      include: paymentInclude,
    });
    return mapRow(saved);
  }

  const saved = await prisma.salaryPayment.create({
    data: {
      id: input.id,
      userId: input.userId,
      monthKey: input.monthKey,
      amount: input.amount,
      status: input.status,
      paidDate: input.paidDate,
      expenseId: input.expenseId,
    },
    include: paymentInclude,
  });

  return mapRow(saved);
}

export async function clearSalaryPaymentExpenseLink(expenseId: string) {
  await prisma.salaryPayment.updateMany({
    where: { expenseId },
    data: {
      expenseId: null,
      status: "NOT_PAID",
      paidDate: null,
    },
  });
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

    const user = await prisma.user.findUnique({
      where: { id: entry.userId },
      select: { id: true, name: true },
    });
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

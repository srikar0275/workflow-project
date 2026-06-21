import { auth } from "@/lib/auth";
import {
  deleteFinanceExpense,
  updateFinanceExpense,
} from "@/lib/finance-expenses";
import { clearSalaryPaymentExpenseLink } from "@/lib/salary-payments";
import { logActivity } from "@/lib/sync-status";
import { NextResponse } from "next/server";
import { z } from "zod";

const optionalText = z
  .string()
  .nullable()
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  });

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  amount: z.number().nonnegative().optional(),
  category: optionalText,
  description: optionalText,
  expenseDate: optionalText,
  notes: optionalText,
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const expense = await updateFinanceExpense(id, parsed.data);
  if (!expense) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await logActivity(
    session.user.id,
    `Updated finance expense "${expense.name}"`,
    undefined,
    expense.projectId ?? undefined,
  );

  return NextResponse.json(expense);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const removed = await deleteFinanceExpense(id);
  if (!removed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await clearSalaryPaymentExpenseLink(id);

  await logActivity(
    session.user.id,
    `Removed finance expense "${removed.name}"`,
  );

  return NextResponse.json({ success: true });
}

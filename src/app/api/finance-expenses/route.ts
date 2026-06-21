import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createFinanceExpense } from "@/lib/finance-expenses";
import { logActivity } from "@/lib/sync-status";
import { NextResponse } from "next/server";
import { z } from "zod";

const optionalText = z
  .string()
  .optional()
  .transform((value) => (value?.trim() ? value.trim() : undefined));

const createSchema = z.object({
  projectId: z.string().optional(),
  name: z.string().min(1, "Expense name is required"),
  amount: z.number().nonnegative("Amount must be zero or greater"),
  category: optionalText,
  description: optionalText,
  expenseDate: optionalText,
  notes: optionalText,
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const projectId = parsed.data.projectId;
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
  }

  try {
    const expense = await createFinanceExpense(parsed.data);

    await logActivity(
      session.user.id,
      `Added finance expense "${expense.name}"`,
      undefined,
      projectId,
    );

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Failed to create finance expense:", error);
    return NextResponse.json(
      { error: "Failed to create expense. Please try again." },
      { status: 500 },
    );
  }
}

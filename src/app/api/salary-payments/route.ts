import { auth } from "@/lib/auth";
import { listAllSalaryPayments, upsertSalaryPayments } from "@/lib/salary-payments";
import { logActivity } from "@/lib/sync-status";
import { NextResponse } from "next/server";
import { z } from "zod";

const entrySchema = z.object({
  userId: z.string().min(1),
  amount: z.number().positive(),
  status: z.enum(["PAID", "NOT_PAID"]),
});

const createSchema = z.object({
  monthKey: z.string().regex(/^\d{4}-\d{2}$/),
  expenseDate: z.string().min(1),
  notes: z.string().optional(),
  entries: z.array(entrySchema).min(1),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payments = await listAllSalaryPayments();
  return NextResponse.json(payments);
}

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

  try {
    const result = await upsertSalaryPayments({
      monthKey: parsed.data.monthKey,
      expenseDate: parsed.data.expenseDate,
      notes: parsed.data.notes,
      entries: parsed.data.entries,
    });

    await logActivity(
      session.user.id,
      `Updated salary records for ${parsed.data.monthKey}`,
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to save salary payments:", error);
    return NextResponse.json(
      { error: "Failed to save salary records. Please try again." },
      { status: 500 },
    );
  }
}

import { auth } from "@/lib/auth";
import { paySalaryPayment } from "@/lib/salary-payments";
import { logActivity } from "@/lib/sync-status";
import { NextResponse } from "next/server";
import { z } from "zod";

const paySchema = z.object({
  expenseDate: z.string().min(1),
  notes: z.string().optional(),
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = paySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await paySalaryPayment(
      id,
      parsed.data.expenseDate,
      parsed.data.notes,
    );
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await logActivity(
      session.user.id,
      `Marked salary paid for ${result.payment.userName} (${result.payment.monthKey})`,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to pay salary:", error);
    return NextResponse.json(
      { error: "Failed to mark salary as paid." },
      { status: 500 },
    );
  }
}

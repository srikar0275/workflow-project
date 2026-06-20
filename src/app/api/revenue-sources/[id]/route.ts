import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  deleteRevenueSource,
  updateRevenueSource,
} from "@/lib/revenue-sources";
import { syncProjectRevenueFromSources } from "@/lib/sync-revenue";
import { logActivity } from "@/lib/sync-status";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  amount: z.number().nonnegative().optional(),
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

  const existing = await prisma.$queryRawUnsafe<
    { id: string; projectId: string | null; name: string }[]
  >(
    `SELECT id, projectId, name FROM RevenueSource WHERE id = ? LIMIT 1`,
    id,
  );
  const row = existing[0];
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const source = await updateRevenueSource(id, parsed.data);
  if (!source) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (row.projectId) {
    await syncProjectRevenueFromSources(row.projectId);
  }

  await logActivity(
    session.user.id,
    `Updated revenue source "${source.name}"`,
    undefined,
    row.projectId ?? undefined,
  );

  return NextResponse.json(source);
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
  const existing = await prisma.$queryRawUnsafe<
    { id: string; projectId: string | null; name: string }[]
  >(
    `SELECT id, projectId, name FROM RevenueSource WHERE id = ? LIMIT 1`,
    id,
  );
  const row = existing[0];
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await deleteRevenueSource(id);
  if (row.projectId) {
    await syncProjectRevenueFromSources(row.projectId);
  }

  await logActivity(
    session.user.id,
    `Removed revenue source "${row.name}"`,
    undefined,
    row.projectId ?? undefined,
  );

  return NextResponse.json({ success: true });
}

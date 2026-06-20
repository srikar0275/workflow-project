import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity, syncProjectStatus, syncStageStatus } from "@/lib/sync-status";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z
    .enum(["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "REVIEW", "DONE"])
    .optional(),
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

  const existing = await prisma.stage.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stage = await prisma.stage.update({
    where: { id },
    data: parsed.data,
  });

  if (!parsed.data.status) {
    await syncStageStatus(id);
  } else {
    await syncProjectStatus(existing.projectId);
  }

  await logActivity(
    session.user.id,
    `Updated stage "${stage.name}"`,
    parsed.data.status ? `Status: ${parsed.data.status}` : undefined,
    existing.projectId,
  );

  const refreshed = await prisma.stage.findUnique({ where: { id } });
  return NextResponse.json(refreshed ?? stage);
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
  const existing = await prisma.stage.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.stage.delete({ where: { id } });
  await syncProjectStatus(existing.projectId);
  await logActivity(
    session.user.id,
    `Deleted stage "${existing.name}"`,
    undefined,
    existing.projectId,
  );

  return NextResponse.json({ success: true });
}

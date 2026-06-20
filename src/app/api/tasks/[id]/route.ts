import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity, syncStageStatus } from "@/lib/sync-status";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z
    .enum(["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "REVIEW", "DONE"])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().nullable().optional(),
  assigneeIds: z.array(z.string()).optional(),
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

  const existing = await prisma.task.findUnique({
    where: { id },
    include: { stage: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { assigneeIds, dueDate, ...rest } = parsed.data;

  if (assigneeIds) {
    await prisma.taskAssignment.deleteMany({ where: { taskId: id } });
    if (assigneeIds.length > 0) {
      await prisma.taskAssignment.createMany({
        data: assigneeIds.map((userId) => ({ taskId: id, userId })),
      });
    }
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...rest,
      dueDate:
        dueDate === null ? null : dueDate ? new Date(dueDate) : undefined,
    },
    include: {
      assignments: { include: { user: true } },
      stage: true,
    },
  });

  await syncStageStatus(task.stageId);
  await logActivity(
    session.user.id,
    `Updated task "${task.title}"`,
    rest.status ? `Status: ${rest.status}` : undefined,
    existing.stage.projectId,
  );

  return NextResponse.json(task);
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
  const task = await prisma.task.findUnique({
    where: { id },
    include: { stage: true },
  });
  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.task.delete({ where: { id } });
  await syncStageStatus(task.stageId);
  await logActivity(
    session.user.id,
    `Deleted task "${task.title}"`,
    undefined,
    task.stage.projectId,
  );

  return NextResponse.json({ success: true });
}

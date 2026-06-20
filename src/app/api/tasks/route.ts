import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity, syncProjectStatus } from "@/lib/sync-status";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  stageId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const stage = await prisma.stage.findUnique({
    where: { id: parsed.data.stageId },
  });
  if (!stage) {
    return NextResponse.json({ error: "Stage not found" }, { status: 404 });
  }

  const maxOrder = await prisma.task.aggregate({
    where: { stageId: parsed.data.stageId },
    _max: { order: true },
  });

  const task = await prisma.task.create({
    data: {
      stageId: parsed.data.stageId,
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority ?? "MEDIUM",
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      order: (maxOrder._max.order ?? -1) + 1,
      assignments: parsed.data.assigneeIds?.length
        ? {
            create: parsed.data.assigneeIds.map((userId) => ({ userId })),
          }
        : undefined,
    },
    include: {
      assignments: { include: { user: true } },
    },
  });

  await syncProjectStatus(stage.projectId);
  await logActivity(
    session.user.id,
    `Created task "${task.title}"`,
    undefined,
    stage.projectId,
  );

  return NextResponse.json(task, { status: 201 });
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/sync-status";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  client: z.string().optional(),
  description: z.string().optional(),
  status: z
    .enum([
      "NOT_STARTED",
      "IN_PROGRESS",
      "ON_HOLD",
      "COMPLETED",
      "CANCELLED",
    ])
    .optional(),
  startDate: z.string().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  revenue: z.number().nonnegative().nullable().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      stages: {
        orderBy: { order: "asc" },
        include: {
          tasks: {
            orderBy: { order: "asc" },
            include: {
              assignments: { include: { user: true } },
            },
          },
        },
      },
      members: { include: { user: true } },
      activities: {
        take: 20,
        orderBy: { createdAt: "desc" },
        include: { user: true },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}

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

  const data = parsed.data;
  const project = await prisma.project.update({
    where: { id },
    data: {
      ...data,
      startDate:
        data.startDate === null
          ? null
          : data.startDate
            ? new Date(data.startDate)
            : undefined,
      targetDate:
        data.targetDate === null
          ? null
          : data.targetDate
            ? new Date(data.targetDate)
            : undefined,
    },
    include: { stages: true },
  });

  await logActivity(
    session.user.id,
    `Updated project "${project.name}"`,
    undefined,
    project.id,
  );

  return NextResponse.json(project);
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
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

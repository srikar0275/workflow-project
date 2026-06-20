import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/sync-status";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z
  .object({
    title: z.string().min(1).optional(),
    role: z
      .enum(["ADMIN", "PROJECT_MANAGER", "DEVELOPER", "VIEWER"])
      .optional(),
  })
  .refine((data) => data.title !== undefined || data.role !== undefined, {
    message: "At least one field is required",
  });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, memberId } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.projectMember.findFirst({
    where: { id: memberId, projectId },
    include: { user: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const member = await prisma.projectMember.update({
    where: { id: memberId },
    data: parsed.data,
    include: { user: true },
  });

  await logActivity(
    session.user.id,
    `Updated ${existing.user.name}'s project role`,
    `Role: ${parsed.data.role}`,
    projectId,
  );

  return NextResponse.json(member);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, memberId } = await params;

  const existing = await prisma.projectMember.findFirst({
    where: { id: memberId, projectId },
    include: { user: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.projectMember.delete({ where: { id: memberId } });

  await logActivity(
    session.user.id,
    `Removed ${existing.user.name} from project team`,
    undefined,
    projectId,
  );

  return NextResponse.json({ success: true });
}

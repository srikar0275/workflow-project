import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/sync-status";
import { NextResponse } from "next/server";
import { z } from "zod";

const addSchema = z.object({
  userId: z.string(),
  title: z.string().min(1),
  role: z.enum(["ADMIN", "PROJECT_MANAGER", "DEVELOPER", "VIEWER"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const body = await request.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existing = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId: parsed.data.userId },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "User is already on this project team" },
      { status: 409 },
    );
  }

  const member = await prisma.projectMember.create({
    data: {
      projectId,
      userId: parsed.data.userId,
      title: parsed.data.title,
      role: parsed.data.role,
    },
    include: { user: true },
  });

  await logActivity(
    session.user.id,
    `Added ${user.name} to project team`,
    undefined,
    projectId,
  );

  return NextResponse.json(member, { status: 201 });
}

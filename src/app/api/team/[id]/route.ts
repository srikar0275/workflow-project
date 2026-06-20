import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "PROJECT_MANAGER", "DEVELOPER", "VIEWER"]).optional(),
  devRole: z.enum(["APP", "BACKEND", "FRONTEND", "AI", "DEVOPS"]).nullable().optional(),
  salary: z.number().nonnegative().nullable().optional(),
  password: z.string().min(6).optional(),
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

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      devRole: true,
      salary: true,
      createdAt: true,
      _count: {
        select: {
          taskAssignments: true,
          projectMembers: true,
        },
      },
      projectMembers: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              client: true,
              status: true,
            },
          },
        },
        orderBy: {
          project: { name: "asc" },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    devRole: user.devRole,
    salary: user.salary,
    createdAt: user.createdAt.toISOString(),
    _count: user._count,
    projects: user.projectMembers.map((membership) => ({
      id: membership.project.id,
      name: membership.project.name,
      client: membership.project.client,
      status: membership.project.status,
      title: membership.title,
      projectRole: membership.role,
    })),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (parsed.data.email && parsed.data.email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (emailTaken) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
  }

  const { password, devRole, salary, ...rest } = parsed.data;
  const user = await prisma.user.update({
    where: { id },
    data: {
      ...rest,
      ...(devRole !== undefined ? { devRole } : {}),
      ...(salary !== undefined ? { salary } : {}),
      ...(password ? { password: await hash(password, 10) } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      devRole: true,
      salary: true,
      createdAt: true,
      _count: {
        select: {
          taskAssignments: true,
          projectMembers: true,
        },
      },
      projectMembers: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              client: true,
              status: true,
            },
          },
        },
        orderBy: {
          project: { name: "asc" },
        },
      },
    },
  });

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    devRole: user.devRole,
    salary: user.salary,
    createdAt: user.createdAt.toISOString(),
    _count: user._count,
    projects: user.projectMembers.map((membership) => ({
      id: membership.project.id,
      name: membership.project.name,
      client: membership.project.client,
      status: membership.project.status,
      title: membership.title,
      projectRole: membership.role,
    })),
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (session.user.id === id) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

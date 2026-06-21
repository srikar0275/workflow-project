import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
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
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "PROJECT_MANAGER", "DEVELOPER", "VIEWER"]).optional(),
  devRole: z.enum(["APP", "BACKEND", "FRONTEND", "AI", "DEVOPS"]).nullable().optional(),
  salary: z.number().nonnegative().nullable().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: await hash(parsed.data.password, 10),
      role: parsed.data.role ?? "DEVELOPER",
      devRole: parsed.data.devRole,
      salary: parsed.data.salary,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      devRole: true,
      salary: true,
    },
  });

  return NextResponse.json(user, { status: 201 });
}

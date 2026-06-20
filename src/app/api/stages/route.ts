import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/sync-status";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
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

  const maxOrder = await prisma.stage.aggregate({
    where: { projectId: parsed.data.projectId },
    _max: { order: true },
  });

  const stage = await prisma.stage.create({
    data: {
      projectId: parsed.data.projectId,
      name: parsed.data.name,
      description: parsed.data.description,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  await logActivity(
    session.user.id,
    `Added stage "${stage.name}"`,
    undefined,
    parsed.data.projectId,
  );

  return NextResponse.json(stage, { status: 201 });
}

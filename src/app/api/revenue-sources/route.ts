import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRevenueSource } from "@/lib/revenue-sources";
import { syncProjectRevenueFromSources } from "@/lib/sync-revenue";
import { logActivity } from "@/lib/sync-status";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  projectId: z.string().optional(),
  name: z.string().min(1),
  amount: z.number().nonnegative(),
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

  const projectId = parsed.data.projectId;
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
  }

  const source = await createRevenueSource(parsed.data);

  if (projectId) {
    await syncProjectRevenueFromSources(projectId);
  }

  await logActivity(
    session.user.id,
    projectId
      ? `Added revenue source "${source.name}"`
      : `Added revenue source "${source.name}"`,
    undefined,
    projectId,
  );

  return NextResponse.json(source, { status: 201 });
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRevenueSource } from "@/lib/revenue-sources";
import { syncProjectRevenueFromSources } from "@/lib/sync-revenue";
import { logActivity } from "@/lib/sync-status";
import { NextResponse } from "next/server";
import { z } from "zod";

const optionalText = z
  .string()
  .optional()
  .transform((value) => (value?.trim() ? value.trim() : undefined));

const createSchema = z.object({
  projectId: z.string().optional(),
  name: z.string().min(1, "Source name is required"),
  amount: z.number().nonnegative("Amount must be zero or greater"),
  category: optionalText,
  description: optionalText,
  receivedDate: optionalText,
  notes: optionalText,
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const projectId = parsed.data.projectId;
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
  }

  try {
    const source = await createRevenueSource(parsed.data);

    if (projectId) {
      await syncProjectRevenueFromSources(projectId);
    }

    await logActivity(
      session.user.id,
      `Added revenue source "${source.name}"`,
      undefined,
      projectId,
    );

    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    console.error("Failed to create revenue source:", error);
    return NextResponse.json(
      { error: "Failed to create revenue source. Please try again." },
      { status: 500 },
    );
  }
}

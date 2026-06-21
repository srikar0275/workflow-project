import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkflowTemplate } from "@/lib/workflows";
import { logActivity } from "@/lib/sync-status";
import { isTargetDateBeforeStart } from "@/lib/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z
  .object({
    name: z.string().min(1),
    client: z.string().optional(),
    description: z.string().optional(),
    templateId: z.string().default("full-stack-saas"),
    startDate: z.string().optional(),
    targetDate: z.string().optional(),
  })
  .refine(
    (data) => !isTargetDateBeforeStart(data.startDate, data.targetDate),
    {
      message: "Target date must be on or after the start date.",
      path: ["targetDate"],
    },
  );

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    include: {
      stages: { include: { tasks: true } },
      members: { include: { user: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const message =
      fieldErrors.targetDate?.[0] ??
      fieldErrors.name?.[0] ??
      "Invalid project details.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { name, client, description, templateId, startDate, targetDate } =
    parsed.data;
  const template = getWorkflowTemplate(templateId);

  const project = await prisma.project.create({
    data: {
      name,
      client,
      description,
      startDate: startDate ? new Date(startDate) : undefined,
      targetDate: targetDate ? new Date(targetDate) : undefined,
      status: template.stages.length > 0 ? "NOT_STARTED" : "NOT_STARTED",
      members: {
        create: {
          userId: session.user.id,
          role: session.user.role,
        },
      },
      stages: {
        create: template.stages.map((stage, index) => ({
          name: stage.name,
          description: stage.description,
          order: index,
        })),
      },
    },
    include: {
      stages: true,
      members: { include: { user: true } },
    },
  });

  await logActivity(
    session.user.id,
    `Created project "${project.name}"`,
    `Template: ${template.name}`,
    project.id,
  );

  return NextResponse.json(project, { status: 201 });
}

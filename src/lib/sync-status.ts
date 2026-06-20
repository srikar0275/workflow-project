import { prisma } from "@/lib/prisma";
import { deriveProjectStatus, deriveStageStatus } from "@/lib/status";

export async function syncStageStatus(stageId: string) {
  const stage = await prisma.stage.findUnique({
    where: { id: stageId },
    include: { tasks: true, project: { include: { stages: true } } },
  });
  if (!stage) return;

  const newStatus = deriveStageStatus(stage.tasks);
  if (newStatus !== stage.status) {
    await prisma.stage.update({
      where: { id: stageId },
      data: { status: newStatus },
    });
  }

  await syncProjectStatus(stage.projectId);
}

export async function syncProjectStatus(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { stages: true },
  });
  if (!project) return;

  const stages = await prisma.stage.findMany({ where: { projectId } });
  const newStatus = deriveProjectStatus(stages, project.status);
  if (newStatus !== project.status) {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: newStatus },
    });
  }
}

export async function logActivity(
  userId: string,
  action: string,
  details?: string,
  projectId?: string,
) {
  await prisma.activityLog.create({
    data: { userId, action, details, projectId },
  });
}

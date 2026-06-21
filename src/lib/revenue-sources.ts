import { prisma } from "@/lib/prisma";

export type RevenueSourceRecord = {
  id: string;
  projectId: string | null;
  name: string;
  amount: number;
  category: string | null;
  description: string | null;
  receivedDate: string | null;
  notes: string | null;
};

function mapRow(source: {
  id: string;
  projectId: string | null;
  name: string;
  amount: number;
  category: string | null;
  description: string | null;
  receivedDate: string | null;
  notes: string | null;
}): RevenueSourceRecord {
  return {
    id: source.id,
    projectId: source.projectId,
    name: source.name,
    amount: source.amount,
    category: source.category,
    description: source.description,
    receivedDate: source.receivedDate,
    notes: source.notes,
  };
}

export async function listAllRevenueSources(): Promise<RevenueSourceRecord[]> {
  const rows = await prisma.revenueSource.findMany({
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapRow);
}

export async function listRevenueSourcesForProjects(
  projectIds: string[],
): Promise<RevenueSourceRecord[]> {
  if (projectIds.length === 0) return [];

  const rows = await prisma.revenueSource.findMany({
    where: { projectId: { in: projectIds } },
    orderBy: { createdAt: "asc" },
  });

  return rows.map(mapRow);
}

export async function sumRevenueSourcesForProject(
  projectId: string,
): Promise<number> {
  const result = await prisma.revenueSource.aggregate({
    where: { projectId },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

export type CreateRevenueSourceInput = {
  projectId?: string | null;
  name: string;
  amount: number;
  category?: string | null;
  description?: string | null;
  receivedDate?: string | null;
  notes?: string | null;
};

export type UpdateRevenueSourceInput = {
  name?: string;
  amount?: number;
  category?: string | null;
  description?: string | null;
  receivedDate?: string | null;
  notes?: string | null;
};

export async function createRevenueSource(
  input: CreateRevenueSourceInput,
): Promise<RevenueSourceRecord> {
  const source = await prisma.revenueSource.create({
    data: {
      projectId: input.projectId ?? null,
      name: input.name,
      amount: input.amount,
      category: input.category?.trim() || null,
      description: input.description?.trim() || null,
      receivedDate: input.receivedDate?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });

  return mapRow(source);
}

export async function updateRevenueSource(
  id: string,
  data: UpdateRevenueSourceInput,
): Promise<RevenueSourceRecord | null> {
  const existing = await prisma.revenueSource.findUnique({ where: { id } });
  if (!existing) return null;

  const source = await prisma.revenueSource.update({
    where: { id },
    data: {
      name: data.name ?? existing.name,
      amount: data.amount ?? existing.amount,
      category:
        data.category !== undefined
          ? data.category?.trim() || null
          : existing.category,
      description:
        data.description !== undefined
          ? data.description?.trim() || null
          : existing.description,
      receivedDate:
        data.receivedDate !== undefined
          ? data.receivedDate?.trim() || null
          : existing.receivedDate,
      notes:
        data.notes !== undefined ? data.notes?.trim() || null : existing.notes,
    },
  });

  return mapRow(source);
}

export async function deleteRevenueSource(id: string): Promise<{
  id: string;
  projectId: string | null;
  name: string;
} | null> {
  const existing = await prisma.revenueSource.findUnique({
    where: { id },
    select: { id: true, projectId: true, name: true },
  });
  if (!existing) return null;

  await prisma.revenueSource.delete({ where: { id } });
  return existing;
}

export async function countRevenueSourcesForProject(
  projectId: string,
): Promise<number> {
  return prisma.revenueSource.count({ where: { projectId } });
}

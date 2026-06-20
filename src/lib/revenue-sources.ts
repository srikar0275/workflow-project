import { prisma } from "@/lib/prisma";

export type RevenueSourceRecord = {
  id: string;
  projectId: string | null;
  name: string;
  amount: number;
};

function mapRow(row: Record<string, unknown>): RevenueSourceRecord {
  return {
    id: String(row.id),
    projectId: row.projectId != null ? String(row.projectId) : null,
    name: String(row.name),
    amount: Number(row.amount),
  };
}

export async function listAllRevenueSources(): Promise<RevenueSourceRecord[]> {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, projectId, name, amount
     FROM RevenueSource
     ORDER BY createdAt ASC`,
  );
  return rows.map(mapRow);
}

export async function listRevenueSourcesForProjects(
  projectIds: string[],
): Promise<RevenueSourceRecord[]> {
  if (projectIds.length === 0) return [];

  const placeholders = projectIds.map(() => "?").join(", ");
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, projectId, name, amount
     FROM RevenueSource
     WHERE projectId IN (${placeholders})
     ORDER BY createdAt ASC`,
    ...projectIds,
  );

  return rows.map(mapRow);
}

export async function sumRevenueSourcesForProject(
  projectId: string,
): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<{ total: number | null }[]>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM RevenueSource WHERE projectId = ?`,
    projectId,
  );
  return Number(rows[0]?.total ?? 0);
}

export async function createRevenueSource(input: {
  projectId?: string | null;
  name: string;
  amount: number;
}): Promise<RevenueSourceRecord> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const projectId = input.projectId ?? null;

  await prisma.$executeRawUnsafe(
    `INSERT INTO RevenueSource (id, projectId, name, amount, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    projectId,
    input.name,
    input.amount,
    now,
    now,
  );

  return {
    id,
    projectId,
    name: input.name,
    amount: input.amount,
  };
}

export async function updateRevenueSource(
  id: string,
  data: { name?: string; amount?: number },
): Promise<RevenueSourceRecord | null> {
  const existingRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, projectId, name, amount FROM RevenueSource WHERE id = ? LIMIT 1`,
    id,
  );
  const existing = existingRows[0];
  if (!existing) return null;

  const name = data.name ?? String(existing.name);
  const amount = data.amount ?? Number(existing.amount);
  const now = new Date().toISOString();

  await prisma.$executeRawUnsafe(
    `UPDATE RevenueSource SET name = ?, amount = ?, updatedAt = ? WHERE id = ?`,
    name,
    amount,
    now,
    id,
  );

  return {
    id,
    projectId: existing.projectId != null ? String(existing.projectId) : null,
    name,
    amount,
  };
}

export async function deleteRevenueSource(id: string): Promise<{
  id: string;
  projectId: string | null;
  name: string;
} | null> {
  const existingRows = await prisma.$queryRawUnsafe<
    { id: string; projectId: string | null; name: string }[]
  >(
    `SELECT id, projectId, name FROM RevenueSource WHERE id = ? LIMIT 1`,
    id,
  );
  const existing = existingRows[0];
  if (!existing) return null;

  await prisma.$executeRawUnsafe(`DELETE FROM RevenueSource WHERE id = ?`, id);
  return {
    id: existing.id,
    projectId: existing.projectId,
    name: existing.name,
  };
}

export async function countRevenueSourcesForProject(
  projectId: string,
): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<{ count: number }[]>(
    `SELECT COUNT(*) AS count FROM RevenueSource WHERE projectId = ?`,
    projectId,
  );
  return Number(rows[0]?.count ?? 0);
}

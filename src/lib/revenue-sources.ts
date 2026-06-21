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

function mapRow(row: Record<string, unknown>): RevenueSourceRecord {
  return {
    id: String(row.id),
    projectId: row.projectId != null ? String(row.projectId) : null,
    name: String(row.name),
    amount: Number(row.amount),
    category: row.category != null ? String(row.category) : null,
    description: row.description != null ? String(row.description) : null,
    receivedDate:
      row.receivedDate != null ? String(row.receivedDate) : null,
    notes: row.notes != null ? String(row.notes) : null,
  };
}

const SELECT_COLUMNS = `
  id, projectId, name, amount, category, description,
  CAST(receivedDate AS TEXT) AS receivedDate, notes
`;

export async function listAllRevenueSources(): Promise<RevenueSourceRecord[]> {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT ${SELECT_COLUMNS}
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
    `SELECT ${SELECT_COLUMNS}
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
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const projectId = input.projectId ?? null;
  const category = input.category?.trim() || null;
  const description = input.description?.trim() || null;
  const receivedDate = input.receivedDate?.trim() || null;
  const notes = input.notes?.trim() || null;

  await prisma.$executeRawUnsafe(
    `INSERT INTO RevenueSource (
       id, projectId, name, amount, category, description, receivedDate, notes, createdAt, updatedAt
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    projectId,
    input.name,
    input.amount,
    category,
    description,
    receivedDate,
    notes,
    now,
    now,
  );

  return {
    id,
    projectId,
    name: input.name,
    amount: input.amount,
    category,
    description,
    receivedDate,
    notes,
  };
}

export async function updateRevenueSource(
  id: string,
  data: UpdateRevenueSourceInput,
): Promise<RevenueSourceRecord | null> {
  const existingRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT ${SELECT_COLUMNS} FROM RevenueSource WHERE id = ? LIMIT 1`,
    id,
  );
  const existing = existingRows[0];
  if (!existing) return null;

  const name = data.name ?? String(existing.name);
  const amount = data.amount ?? Number(existing.amount);
  const category =
    data.category !== undefined
      ? data.category?.trim() || null
      : existing.category != null
        ? String(existing.category)
        : null;
  const description =
    data.description !== undefined
      ? data.description?.trim() || null
      : existing.description != null
        ? String(existing.description)
        : null;
  const receivedDate =
    data.receivedDate !== undefined
      ? data.receivedDate?.trim() || null
      : existing.receivedDate != null
        ? String(existing.receivedDate)
        : null;
  const notes =
    data.notes !== undefined
      ? data.notes?.trim() || null
      : existing.notes != null
        ? String(existing.notes)
        : null;
  const now = new Date().toISOString();

  await prisma.$executeRawUnsafe(
    `UPDATE RevenueSource
     SET name = ?, amount = ?, category = ?, description = ?, receivedDate = ?, notes = ?, updatedAt = ?
     WHERE id = ?`,
    name,
    amount,
    category,
    description,
    receivedDate,
    notes,
    now,
    id,
  );

  return {
    id,
    projectId: existing.projectId != null ? String(existing.projectId) : null,
    name,
    amount,
    category,
    description,
    receivedDate,
    notes,
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

import type { ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type FinanceProjectRecord = {
  id: string;
  name: string;
  client: string | null;
  status: ProjectStatus;
  revenue: number | null;
  revenueDate: string | null;
  updatedAt: string;
};

function mapRow(row: Record<string, unknown>): FinanceProjectRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    client: row.client != null ? String(row.client) : null,
    status: String(row.status) as ProjectStatus,
    revenue: row.revenue != null ? Number(row.revenue) : null,
    revenueDate: row.revenueDate != null ? String(row.revenueDate) : null,
    updatedAt: String(row.updatedAt),
  };
}

export async function listFinanceProjects(): Promise<FinanceProjectRecord[]> {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, name, client, status, revenue, revenueDate, updatedAt
     FROM Project
     ORDER BY name ASC`,
  );
  return rows.map(mapRow);
}

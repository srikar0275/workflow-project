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

export async function listFinanceProjects(): Promise<FinanceProjectRecord[]> {
  const rows = await prisma.project.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      client: true,
      status: true,
      revenue: true,
      revenueDate: true,
      updatedAt: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    client: row.client,
    status: row.status,
    revenue: row.revenue,
    revenueDate: row.revenueDate,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

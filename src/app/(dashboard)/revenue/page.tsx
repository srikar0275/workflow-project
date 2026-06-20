import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listAllRevenueSources } from "@/lib/revenue-sources";
import { redirect } from "next/navigation";
import { RevenueView } from "./revenue-view";

export default async function RevenuePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [projects, sources] = await Promise.all([
    prisma.project.findMany({
      select: {
        id: true,
        name: true,
        client: true,
        status: true,
        revenue: true,
      },
      orderBy: { name: "asc" },
    }),
    listAllRevenueSources(),
  ]);

  return (
    <RevenueView
      initialProjects={projects}
      initialSources={sources.map(({ id, name, amount }) => ({
        id,
        name,
        amount,
      }))}
    />
  );
}

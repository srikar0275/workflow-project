import { Suspense } from "react";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { TeamView } from "./team-view";

export default async function TeamPage() {
  const session = await getSession();

  const members = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      devRole: true,
      salary: true,
      _count: {
        select: {
          taskAssignments: true,
          projectMembers: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <Suspense fallback={<PageSkeleton />}>
      <TeamView
        initialMembers={members}
        isAdmin={session?.user.role === "ADMIN"}
        currentUserId={session?.user.id ?? ""}
      />
    </Suspense>
  );
}

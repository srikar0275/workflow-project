import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TeamView } from "./team-view";

export default async function TeamPage() {
  const session = await auth();

  const members = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      devRole: true,
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
    <TeamView
      initialMembers={members}
      isAdmin={session?.user.role === "ADMIN"}
    />
  );
}

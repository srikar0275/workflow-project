import { prisma } from "@/lib/prisma";
import { TeamAnalysisSummary } from "@/components/team/team-analysis-summary";

export async function DashboardTeamSection() {
  const members = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      devRole: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          taskAssignments: true,
          projectMembers: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const analysisMembers = members.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    devRole: member.devRole,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
    taskAssignments: member._count.taskAssignments,
    projectMembers: member._count.projectMembers,
  }));

  return <TeamAnalysisSummary members={analysisMembers} compact />;
}

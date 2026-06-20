import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageSkeleton } from "@/components/ui/page-skeleton";

const ProjectDetail = dynamic(
  () =>
    import("@/components/projects/project-detail").then((m) => m.ProjectDetail),
  { loading: () => <PageSkeleton title={false} /> },
);

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [project, users] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        stages: {
          orderBy: { order: "asc" },
          include: {
            tasks: {
              orderBy: { order: "asc" },
              include: {
                assignments: { include: { user: true } },
              },
            },
          },
        },
        members: { include: { user: true } },
        activities: {
          take: 15,
          orderBy: { createdAt: "desc" },
          include: { user: true },
        },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, devRole: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!project) notFound();

  const serialized = {
    ...project,
    targetDate: project.targetDate?.toISOString() ?? null,
    stages: project.stages.map((stage) => ({
      ...stage,
      tasks: stage.tasks.map((task) => ({
        ...task,
        dueDate: task.dueDate?.toISOString() ?? null,
      })),
    })),
    activities: project.activities.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
  };

  return (
    <div className="space-y-4">
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        All projects
      </Link>
      <ProjectDetail project={serialized} users={users} />
    </div>
  );
}

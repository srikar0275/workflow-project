import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@recursion.tech" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@recursion.tech",
      password,
      role: "ADMIN",
      devRole: "BACKEND",
    },
  });

  const team = await Promise.all([
    prisma.user.upsert({
      where: { email: "app.dev@recursion.tech" },
      update: {},
      create: {
        name: "App Developer",
        email: "app.dev@recursion.tech",
        password: await hash("dev123", 10),
        role: "DEVELOPER",
        devRole: "APP",
      },
    }),
    prisma.user.upsert({
      where: { email: "backend.dev@recursion.tech" },
      update: {},
      create: {
        name: "Backend Developer",
        email: "backend.dev@recursion.tech",
        password: await hash("dev123", 10),
        role: "DEVELOPER",
        devRole: "BACKEND",
      },
    }),
    prisma.user.upsert({
      where: { email: "frontend.dev@recursion.tech" },
      update: {},
      create: {
        name: "Frontend Developer",
        email: "frontend.dev@recursion.tech",
        password: await hash("dev123", 10),
        role: "DEVELOPER",
        devRole: "FRONTEND",
      },
    }),
    prisma.user.upsert({
      where: { email: "ai.dev@recursion.tech" },
      update: {},
      create: {
        name: "AI Developer",
        email: "ai.dev@recursion.tech",
        password: await hash("dev123", 10),
        role: "DEVELOPER",
        devRole: "AI",
      },
    }),
    prisma.user.upsert({
      where: { email: "pm@recursion.tech" },
      update: {},
      create: {
        name: "Project Manager",
        email: "pm@recursion.tech",
        password: await hash("dev123", 10),
        role: "PROJECT_MANAGER",
      },
    }),
  ]);

  const existingProject = await prisma.project.findFirst({
    where: { name: "Modern LMS" },
  });

  if (existingProject && existingProject.revenue == null) {
    await prisma.project.update({
      where: { id: existingProject.id },
      data: { revenue: 1250000 },
    });
  }

  if (existingProject) {
    const membersWithoutTitle = await prisma.projectMember.findMany({
      where: { projectId: existingProject.id, title: null },
      include: { user: true },
    });

    for (const member of membersWithoutTitle) {
      const titleByRole: Record<string, string> = {
        ADMIN: "Admin",
        PROJECT_MANAGER: "Project Manager",
        DEVELOPER: "Developer",
        VIEWER: "Viewer",
      };

      await prisma.projectMember.update({
        where: { id: member.id },
        data: { title: titleByRole[member.role] ?? "Team Member" },
      });
    }
  }

  if (!existingProject) {
    const project = await prisma.project.create({
      data: {
        name: "Modern LMS",
        client: "Education Client",
        description:
          "Full-stack learning management platform with courses, quizzes, and payments.",
        status: "IN_PROGRESS",
        startDate: new Date("2025-01-15"),
        targetDate: new Date("2026-06-30"),
        revenue: 1250000,
        members: {
          create: [
            { userId: admin.id, role: "ADMIN", title: "Admin" },
            { userId: team[4].id, role: "PROJECT_MANAGER", title: "Project Manager" },
            { userId: team[0].id, role: "DEVELOPER", title: "App Developer" },
            { userId: team[1].id, role: "DEVELOPER", title: "Backend Developer" },
            { userId: team[2].id, role: "DEVELOPER", title: "Frontend Developer" },
          ],
        },
        stages: {
          create: [
            {
              name: "Discovery & Requirements",
              order: 0,
              status: "DONE",
              tasks: {
                create: [
                  {
                    title: "Gather client requirements",
                    status: "DONE",
                    priority: "HIGH",
                    assignments: { create: [{ userId: team[4].id }] },
                  },
                  {
                    title: "Define MVP scope",
                    status: "DONE",
                    priority: "HIGH",
                    assignments: { create: [{ userId: admin.id }] },
                  },
                ],
              },
            },
            {
              name: "UI/UX Design",
              order: 1,
              status: "DONE",
              tasks: {
                create: [
                  {
                    title: "Design course player UI",
                    status: "DONE",
                    priority: "MEDIUM",
                    assignments: { create: [{ userId: team[2].id }] },
                  },
                ],
              },
            },
            {
              name: "Backend & APIs",
              order: 2,
              status: "IN_PROGRESS",
              tasks: {
                create: [
                  {
                    title: "Course & quiz engine APIs",
                    status: "IN_PROGRESS",
                    priority: "HIGH",
                    assignments: { create: [{ userId: team[1].id }] },
                  },
                  {
                    title: "Razorpay payment integration",
                    status: "NOT_STARTED",
                    priority: "HIGH",
                    assignments: { create: [{ userId: team[1].id }] },
                  },
                  {
                    title: "AWS S3 media upload",
                    status: "BLOCKED",
                    priority: "MEDIUM",
                    assignments: { create: [{ userId: team[1].id }] },
                    description: "Waiting for AWS credentials from client",
                  },
                ],
              },
            },
            {
              name: "Frontend Web",
              order: 3,
              status: "IN_PROGRESS",
              tasks: {
                create: [
                  {
                    title: "Student dashboard",
                    status: "IN_PROGRESS",
                    priority: "HIGH",
                    assignments: { create: [{ userId: team[2].id }] },
                  },
                  {
                    title: "Admin panel",
                    status: "NOT_STARTED",
                    priority: "MEDIUM",
                    assignments: { create: [{ userId: team[2].id }] },
                  },
                ],
              },
            },
            {
              name: "QA & UAT",
              order: 4,
              status: "NOT_STARTED",
              tasks: {
                create: [
                  {
                    title: "End-to-end testing plan",
                    status: "NOT_STARTED",
                    priority: "MEDIUM",
                    assignments: { create: [{ userId: team[4].id }] },
                  },
                ],
              },
            },
          ],
        },
      },
    });

    await prisma.activityLog.createMany({
      data: [
        {
          projectId: project.id,
          userId: admin.id,
          action: "Created project Modern LMS",
        },
        {
          projectId: project.id,
          userId: team[1].id,
          action: "Started work on Course & quiz engine APIs",
        },
        {
          projectId: project.id,
          userId: team[1].id,
          action: "Blocked AWS S3 media upload",
          details: "Waiting for AWS credentials",
        },
      ],
    });
  }

  console.log("Seed completed.");
  console.log("Login: admin@recursion.tech / admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

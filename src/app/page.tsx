import { auth } from "@/lib/auth";
import Link from "next/link";
import { Workflow, ArrowRight, FolderKanban, Users, ListTodo, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/30 via-slate-950 to-slate-950" />
      <div className="relative mx-auto max-w-5xl px-6 py-20">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-600">
              <Workflow className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold">Recursion Technologies</span>
          </div>
          {isLoggedIn && (
            <Link href="/dashboard">
              <Button variant="secondary" size="sm">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          )}
        </div>

        <div className="mt-20 max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-cyan-400">
            Workflow Hub
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">
            Manage projects, stages & tasks in one place
          </h1>
          <p className="mt-5 text-lg text-slate-400">
            Track every step of your delivery pipeline — from discovery to deployment.
            Assign work across App, Backend, Frontend, and AI teams.
          </p>
          <Link href={isLoggedIn ? "/dashboard" : "/login"} className="mt-8 inline-block">
            <Button size="lg">
              {isLoggedIn ? "Go to Dashboard" : "Get started"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-24 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: FolderKanban,
              title: "Project pipelines",
              desc: "Visualize stages and progress for every client project.",
            },
            {
              icon: ListTodo,
              title: "Task management",
              desc: "Assign, prioritize, and track tasks with status rollups.",
            },
            {
              icon: Users,
              title: "Team coordination",
              desc: "Cross-functional teams working on shared deliverables.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-6"
              >
                <Icon className="h-6 w-6 text-cyan-400" />
                <h3 className="mt-3 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

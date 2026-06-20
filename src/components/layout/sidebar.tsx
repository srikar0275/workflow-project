"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  DollarSign,
  FolderKanban,
  Home,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Users,
  Workflow,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigationPending } from "@/components/layout/navigation-pending";

const navItems = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/team", label: "Team", icon: Users },
  { href: "/revenue", label: "Revenue", icon: DollarSign },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { startNavigation } = useNavigationPending();

  useEffect(() => {
    navItems.forEach((item) => router.prefetch(item.href));
  }, [router]);

  function handleNavClick(href: string) {
    const isActive = href === "/"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
    if (!isActive) startNavigation();
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950">
      <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-600">
          <Workflow className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Recursion</p>
          <p className="text-xs text-slate-400">Workflow Hub</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={() => handleNavClick(item.href)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-cyan-950 text-cyan-300"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <p className="truncate text-sm font-medium text-white">{userName}</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start px-0"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}

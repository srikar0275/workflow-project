import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { NavigationPendingProvider } from "@/components/layout/navigation-pending";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  return (
    <NavigationPendingProvider>
      <div className="flex h-screen overflow-hidden bg-slate-950">
        <Sidebar userName={session.user.name ?? "User"} />
        <main className="relative min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </NavigationPendingProvider>
  );
}

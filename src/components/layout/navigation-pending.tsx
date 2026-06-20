"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { PageSkeleton } from "@/components/ui/page-skeleton";

type NavigationPendingContextValue = {
  startNavigation: () => void;
};

const NavigationPendingContext =
  createContext<NavigationPendingContextValue | null>(null);

export function useNavigationPending() {
  const ctx = useContext(NavigationPendingContext);
  if (!ctx) {
    return { startNavigation: () => {} };
  }
  return ctx;
}

export function NavigationPendingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [pathname]);

  const startNavigation = useCallback(() => {
    setPending(true);
  }, []);

  return (
    <NavigationPendingContext.Provider value={{ startNavigation }}>
      <div className="relative min-h-full">
        {pending && (
          <div
            className="fixed left-64 right-0 top-0 z-50 h-0.5 overflow-hidden bg-slate-800"
            aria-hidden
          >
            <div className="nav-progress-bar h-full w-1/3 bg-cyan-400" />
          </div>
        )}
        {children}
        {pending && (
          <div className="pointer-events-none fixed bottom-0 left-64 right-0 top-0 z-40 bg-slate-950/40">
            <div className="mx-auto max-w-7xl p-6 opacity-90 lg:p-8">
              <PageSkeleton />
            </div>
          </div>
        )}
      </div>
    </NavigationPendingContext.Provider>
  );
}

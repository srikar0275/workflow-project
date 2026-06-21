"use client";

import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

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

const NavigationProgressBar = memo(function NavigationProgressBar({
  pending,
}: {
  pending: boolean;
}) {
  if (!pending) return null;

  return (
    <div
      className="fixed left-64 right-0 top-0 z-50 h-0.5 overflow-hidden bg-slate-800"
      aria-hidden
    >
      <div className="nav-progress-bar h-full w-1/3 bg-cyan-400" />
    </div>
  );
});

export function NavigationPendingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [pathname]);

  const startNavigation = useCallback(() => {
    setPending(true);
  }, []);

  const value = useMemo(
    () => ({ startNavigation }),
    [startNavigation],
  );

  return (
    <NavigationPendingContext.Provider value={value}>
      <NavigationProgressBar pending={pending} />
      {children}
    </NavigationPendingContext.Provider>
  );
}

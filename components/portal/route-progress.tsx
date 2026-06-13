"use client";

import { useEffect, useState } from "react";

function isDashboardNavigation(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  if (anchor.origin !== window.location.origin) return false;
  return anchor.pathname.startsWith("/dashboard") && anchor.href !== window.location.href;
}

export function RouteProgress() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let timeout: number | undefined;
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!isDashboardNavigation(event.target)) return;
      setLoading(true);
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setLoading(false), 1200);
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return (
    <>
      <div
        className={`fixed left-0 top-0 z-[60] h-1 bg-blue-600 shadow-[0_0_18px_rgba(37,99,235,0.45)] transition-all duration-300 ${
          loading ? "w-full opacity-100" : "w-0 opacity-0"
        }`}
        aria-hidden="true"
      />
      <div
        role="status"
        aria-live="polite"
        className={`fixed right-4 top-4 z-[70] inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-lg transition-all duration-200 dark:border-blue-900 dark:bg-slate-900 dark:text-blue-200 ${
          loading ? "translate-y-0 opacity-100" : "-translate-y-2 pointer-events-none opacity-0"
        }`}
      >
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
        Loading...
      </div>
    </>
  );
}

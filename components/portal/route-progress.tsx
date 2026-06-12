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
    <div
      className={`fixed left-0 top-0 z-[60] h-1 bg-blue-600 shadow-[0_0_18px_rgba(37,99,235,0.45)] transition-all duration-300 ${
        loading ? "w-full opacity-100" : "w-0 opacity-0"
      }`}
      aria-hidden="true"
    />
  );
}

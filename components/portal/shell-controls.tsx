"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SearchItem = {
  label: string;
  description: string;
  href: string;
  type: string;
};

type ThemePreference = "system" | "light" | "dark";

function isThemePreference(value: string | null | undefined): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function getSavedTheme(initialTheme?: string | null): ThemePreference {
  const saved = window.localStorage.getItem("eor-theme");
  if (isThemePreference(saved)) return saved;
  if (isThemePreference(initialTheme)) return initialTheme;
  return "system";
}

function getEffectiveTheme(theme: ThemePreference): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export function ShellControls({ items, initialTheme }: { items: SearchItem[]; initialTheme?: string | null }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = getSavedTheme(initialTheme);
    applyTheme(saved);
    window.dispatchEvent(new CustomEvent("eor-theme-ready", { detail: saved }));
  }, [initialTheme]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<string>;
      const nextTheme = isThemePreference(custom.detail) ? custom.detail : "system";
      setTheme(nextTheme);
      setEffectiveTheme(getEffectiveTheme(nextTheme));
    };
    window.addEventListener("eor-theme-ready", handler);
    return () => window.removeEventListener("eor-theme-ready", handler);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") applyTheme("system");
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [theme]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items.slice(0, 12);
    return items
      .filter((item) => `${item.label} ${item.description} ${item.type}`.toLowerCase().includes(needle))
      .slice(0, 16);
  }, [items, query]);

  function applyTheme(nextTheme: ThemePreference) {
    const nextEffectiveTheme = getEffectiveTheme(nextTheme);
    const shouldDark = nextEffectiveTheme === "dark";
    document.documentElement.classList.toggle("dark", shouldDark);
    document.documentElement.style.colorScheme = nextEffectiveTheme;
    window.localStorage.setItem("eor-theme", nextTheme);
    setTheme(nextTheme);
    setEffectiveTheme(nextEffectiveTheme);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label="Search"
      >
        ?
      </button>
      <button
        type="button"
        onClick={() => {
          const next = effectiveTheme === "dark" ? "light" : "dark";
          applyTheme(next);
        }}
        className="flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        aria-label="Toggle theme"
        title={effectiveTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-amber-300" />
        {effectiveTheme === "dark" ? "Light" : "Dark"}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/30 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="mx-auto mt-16 max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search employees, documents, messages, pages..."
                className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold dark:border-slate-700">
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-2">
              {results.map((item) => (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-slate-100 p-3 transition hover:border-blue-200 hover:bg-blue-50 dark:border-slate-800 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950 dark:text-slate-100">{item.label}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">{item.type}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
                </Link>
              ))}
              {results.length === 0 ? <p className="p-4 text-sm text-slate-500">No results in your role scope.</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { RefIndexEntry } from "@/lib/data";

interface RefSearchProps {
  refs: RefIndexEntry[];
  refCount: number;
  dateRange: string;
}

function matchRef(query: string, ref: RefIndexEntry): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = `${ref.name} ${ref.number} ${ref.slug}`.toLowerCase();
  return haystack.includes(q);
}

export function RefSearch({ refs, refCount, dateRange }: RefSearchProps) {
  const listId = useId();
  const inputId = useId();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const sorted = useMemo(
    () => [...refs].sort((a, b) => a.name.localeCompare(b.name)),
    [refs],
  );

  const results = useMemo(() => {
    if (!query.trim()) return sorted.slice(0, 12);
    return sorted.filter((r) => matchRef(query, r)).slice(0, 12);
  }, [query, sorted]);

  const navigate = useCallback(
    (slug: string) => {
      setOpen(false);
      setQuery("");
      router.push(`/refs/${slug}`);
    },
    [router],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      navigate(results[activeIndex].slug);
    }
  }

  const placeholder = `Search ${refCount} refs (${dateRange})…`;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <label htmlFor={inputId} className="sr-only">
        Search referees by name or number
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && results[activeIndex]
            ? `${listId}-${results[activeIndex].slug}`
            : undefined
        }
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
        autoComplete="off"
      />

      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-white py-1 shadow-lg"
        >
          {results.map((ref, index) => (
            <li
              key={ref.slug}
              id={`${listId}-${ref.slug}`}
              role="option"
              aria-selected={index === activeIndex}
            >
              <button
                type="button"
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                  index === activeIndex
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-700 hover:bg-zinc-50"
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => navigate(ref.slug)}
              >
                <span>
                  {ref.name}{" "}
                  <span className="font-mono text-xs text-zinc-500">
                    #{ref.number}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && query.trim() && results.length === 0 && (
        <p className="absolute z-50 mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-zinc-500 shadow-lg">
          No refs match &ldquo;{query}&rdquo;.{" "}
          <Link href="/refs" className="font-medium text-zinc-700 hover:underline">
            Browse all
          </Link>
        </p>
      )}
    </div>
  );
}

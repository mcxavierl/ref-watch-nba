"use client";

import { Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function storageKey(kind: "ref" | "team", league: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb"): string {
  return `refwatch-favorites-${league}-${kind}`;
}

function readFavorites(kind: "ref" | "team", league: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb"): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(kind, league));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeFavorites(
  kind: "ref" | "team",
  league: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb",
  ids: string[],
): void {
  localStorage.setItem(storageKey(kind, league), JSON.stringify(ids));
}

export function FavoritesStar({
  id,
  kind,
  league,
  label,
}: {
  id: string;
  kind: "ref" | "team";
  league: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb";
  label: string;
}) {
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    setFavorited(readFavorites(kind, league).includes(id));
  }, [id, kind, league]);

  const toggle = useCallback(() => {
    const current = readFavorites(kind, league);
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    writeFavorites(kind, league, next);
    setFavorited(next.includes(id));
  }, [id, kind, league]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={favorited}
      aria-label={
        favorited
          ? `Remove ${label} from favorites`
          : `Save ${label} to favorites`
      }
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-500 hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
    >
      <Star
        className={`size-4 ${favorited ? "fill-amber-400 text-amber-500" : "text-zinc-400"}`}
        aria-hidden
      />
      {favorited ? "Saved" : "Save"}
    </button>
  );
}

export function useFavorites(kind: "ref" | "team", league: "nba" | "nhl" | "nfl" | "epl" | "laliga" | "cbb" | "cfb"): string[] {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(readFavorites(kind, league));
  }, [kind, league]);

  return ids;
}

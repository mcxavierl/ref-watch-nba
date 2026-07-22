"use client";

import { SiteNavLink as Link } from "@/components/SiteNavLink";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, Grid3x3, Lightbulb, Search } from "lucide-react";
import { NBA_TEAMS } from "@/lib/teams";

export type SlateQuickLookupRef = {
  slug: string;
  name: string;
  games: number;
  href?: string;
  leagueLabel?: string;
};

export type SlateQuickLookupTeam = {
  abbr: string;
  label: string;
  detail: string;
  href: string;
};

type LookupResult =
  | {
      kind: "ref";
      slug: string;
      label: string;
      detail: string;
      href: string;
      leagueLabel?: string;
    }
  | { kind: "team"; abbr: string; label: string; detail: string; href: string }
  | { kind: "shortcut"; label: string; detail: string; href: string };

type SlateQuickLookupProps = {
  refs: SlateQuickLookupRef[];
  teams?: SlateQuickLookupTeam[];
  sampleRefSlugs?: string[];
  placeholder?: string;
  heading?: string;
  lead?: string;
  includeTeams?: boolean;
  includeShortcuts?: boolean;
  showSampleChips?: boolean;
  matrixHref?: string;
  insightsHref?: string;
};

function buildResults(
  query: string,
  refs: SlateQuickLookupRef[],
  teams: SlateQuickLookupTeam[],
  shortcuts: LookupResult[],
): LookupResult[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const refMatches = refs
    .filter(
      (ref) =>
        ref.name.toLowerCase().includes(trimmed) ||
        ref.slug.toLowerCase().includes(trimmed),
    )
    .slice(0, 6)
    .map(
      (ref): LookupResult => ({
        kind: "ref",
        slug: ref.slug,
        label: ref.name,
        detail: `${ref.games.toLocaleString()} games logged`,
        href: ref.href ?? `/refs/${ref.slug}`,
        leagueLabel: ref.leagueLabel,
      }),
    );

  const teamMatches = teams
    .filter(
      (team) =>
        team.abbr.toLowerCase().includes(trimmed) ||
        team.label.toLowerCase().includes(trimmed) ||
        team.detail.toLowerCase().includes(trimmed),
    )
    .slice(0, 6)
    .map(
      (team): LookupResult => ({
        kind: "team",
        abbr: team.abbr,
        label: team.label,
        detail: team.detail,
        href: team.href,
      }),
    );

  const shortcutMatches = shortcuts.filter(
    (item) =>
      item.label.toLowerCase().includes(trimmed) ||
      item.detail.toLowerCase().includes(trimmed),
  );

  return [...shortcutMatches, ...refMatches, ...teamMatches].slice(0, 8);
}

export function SlateQuickLookup({
  refs,
  teams,
  sampleRefSlugs = [],
  placeholder = "Search refs, teams, or tools...",
  heading = "Predictive Spotlight",
  lead = "Search for officials, teams, or whistle-heavy matchups...",
  includeTeams = true,
  includeShortcuts = true,
  showSampleChips = true,
  matrixHref = "/matrix",
  insightsHref = "/insights",
}: SlateQuickLookupProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const shortcutItems = includeShortcuts
    ? [
        {
          kind: "shortcut" as const,
          label: "Ref×team matrix",
          detail: "Every ref and team pairing",
          href: matrixHref,
        },
        {
          kind: "shortcut" as const,
          label: "Insights hub",
          detail: "Tendencies, trends, and findings",
          href: insightsHref,
        },
      ]
    : [];

  const teamItems =
    teams ??
    (includeTeams
      ? NBA_TEAMS.map((team) => ({
          abbr: team.abbr,
          label: `${team.city} ${team.name}`,
          detail: `${team.abbr} · ${team.conference}`,
          href: `/teams/${team.abbr}`,
        }))
      : []);

  const results = useMemo(
    () => buildResults(query, refs, teamItems, shortcutItems),
    [query, refs, teamItems, shortcutItems],
  );

  const sampleRefs = useMemo(() => {
    const bySlug = new Map(refs.map((ref) => [ref.slug, ref]));
    const picked = sampleRefSlugs
      .map((slug) => bySlug.get(slug))
      .filter((ref): ref is SlateQuickLookupRef => ref != null);
    if (picked.length >= 3) return picked.slice(0, 3);
    return [...refs]
      .sort((a, b) => b.games - a.games)
      .slice(0, 3);
  }, [refs, sampleRefSlugs]);

  const resetActive = useCallback(() => setActiveIndex(-1), []);

  useEffect(() => {
    resetActive();
  }, [query, resetActive]);

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.querySelector<HTMLElement>(
      `[data-lookup-index="${activeIndex}"]`,
    );
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      window.location.href = results[activeIndex].href;
    }

    if (event.key === "Escape") {
      setQuery("");
      resetActive();
      inputRef.current?.blur();
    }
  };

  return (
    <section className="slate-quick-lookup slate-quick-lookup--spotlight section-block" aria-labelledby="slate-quick-lookup-heading">
      <div className="slate-quick-lookup-header">
        <h2 className="section-title" id="slate-quick-lookup-heading">
          {heading}
        </h2>
        <p className="section-lead">{lead}</p>
      </div>

      <div className="slate-quick-lookup-search-wrap">
        <label className="slate-quick-lookup-label" htmlFor="slate-quick-lookup-input">
          Search refs and teams
        </label>
        <div className="slate-quick-lookup-input-row">
          <Search className="slate-quick-lookup-icon" aria-hidden />
          <input
            ref={inputRef}
            id="slate-quick-lookup-input"
            type="search"
            className="slate-quick-lookup-input"
            placeholder={placeholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="slate-quick-lookup-results"
            aria-activedescendant={
              activeIndex >= 0 ? `lookup-result-${activeIndex}` : undefined
            }
          />
        </div>

        {results.length > 0 && (
          <ul
            ref={listRef}
            id="slate-quick-lookup-results"
            className="slate-quick-lookup-results"
            role="listbox"
          >
            {results.map((result, index) => (
              <li key={`${result.kind}-${result.href}-${result.label}`} role="presentation">
                <Link
                  id={`lookup-result-${index}`}
                  href={result.href}
                  role="option"
                  aria-selected={index === activeIndex}
                  data-lookup-index={index}
                  className={`slate-quick-lookup-result${index === activeIndex ? " slate-quick-lookup-result-active" : ""}`}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <span className="slate-quick-lookup-result-main">
                    {result.kind === "ref" && result.leagueLabel ? (
                      <span className="slate-quick-lookup-league-badge">{result.leagueLabel}</span>
                    ) : null}
                    <span className="slate-quick-lookup-result-label">{result.label}</span>
                  </span>
                  <span className="slate-quick-lookup-result-detail">{result.detail}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showSampleChips ? (
        <div className="slate-quick-lookup-shortcuts">
          {includeShortcuts ? (
            <>
              <Link href={matrixHref} className="slate-quick-lookup-chip">
                <Grid3x3 aria-hidden />
                Matrix
              </Link>
              <Link href={insightsHref} className="slate-quick-lookup-chip">
                <Lightbulb aria-hidden />
                Insights
              </Link>
            </>
          ) : null}
          {sampleRefs.map((ref) => (
            <Link
              key={ref.slug}
              href={ref.href ?? `/refs/${ref.slug}`}
              className="slate-quick-lookup-chip slate-quick-lookup-chip-ref"
            >
              {ref.leagueLabel ? (
                <span className="slate-quick-lookup-chip-badge">{ref.leagueLabel}</span>
              ) : null}
              {ref.name}
              <ArrowRight className="slate-quick-lookup-chip-arrow" aria-hidden />
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { TeamImpactSnapshot } from "@/lib/ref-intelligence-profile";
import { ClinicalCard } from "@/components/hub/ClinicalCard";
import { formatPct, formatSigned } from "@/lib/stats-utils";

export function RefTeamImpactSearch({
  teams,
}: {
  teams: TeamImpactSnapshot[];
}) {
  const [query, setQuery] = useState("");
  const [selectedAbbr, setSelectedAbbr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toUpperCase();
    if (!needle) return teams.slice(0, 8);
    return teams.filter((team) => team.abbr.includes(needle)).slice(0, 12);
  }, [query, teams]);

  const selected =
    teams.find((team) => team.abbr === selectedAbbr) ??
    (filtered.length === 1 ? filtered[0] : null);

  return (
    <ClinicalCard
      as="section"
      className="ref-profile-section ref-team-impact-search"
      aria-labelledby="ref-team-impact-title"
    >
      <div className="ref-table-section-header">
        <p className="ref-profile-section-kicker">Historical impact</p>
        <h2 id="ref-team-impact-title" className="ref-profile-section-title m-0">
          Team Impact Matrix
        </h2>
      </div>

      <label className="ref-team-impact-search-label" htmlFor="ref-team-impact-input">
        Search franchise
      </label>
      <input
        id="ref-team-impact-input"
        className="ref-team-impact-input"
        type="search"
        placeholder="Type team abbr (e.g. BOS, LAL)"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setSelectedAbbr(null);
        }}
        autoComplete="off"
        spellCheck={false}
      />

      {filtered.length > 0 ? (
        <ul className="ref-team-impact-options" role="listbox" aria-label="Matching teams">
          {filtered.map((team) => (
            <li key={team.abbr}>
              <button
                type="button"
                className={`ref-team-impact-option${selected?.abbr === team.abbr ? " is-selected" : ""}`}
                onClick={() => setSelectedAbbr(team.abbr)}
              >
                <span className="font-semibold">{team.abbr}</span>
                <span className="tabular-nums text-muted">
                  {team.games} games · {(team.winRate * 100).toFixed(1)}% win
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No teams match that search.</p>
      )}

      {selected ? (
        <dl className="ref-team-impact-result">
          <div>
            <dt>Win rate</dt>
            <dd className="tabular-nums">{(selected.winRate * 100).toFixed(1)}%</dd>
          </div>
          <div>
            <dt>Foul delta</dt>
            <dd className="tabular-nums">{formatSigned(selected.foulDelta, 1)}</dd>
          </div>
          <div>
            <dt>Total O/U trend</dt>
            <dd className="tabular-nums">
              {formatPct(selected.overRate)} · {selected.overTrendLabel}
            </dd>
          </div>
          <div>
            <dt>Sample</dt>
            <dd className="tabular-nums">{selected.games} games</dd>
          </div>
        </dl>
      ) : (
        <p className="ref-team-impact-hint text-sm text-muted">
          Select a team to view win rate, foul delta, and total over/under trend.
        </p>
      )}
    </ClinicalCard>
  );
}

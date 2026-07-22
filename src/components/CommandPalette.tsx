"use client";

import { navigateToHref } from "@/lib/hard-navigation";
import { Command } from "cmdk";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, UserRound, Users } from "lucide-react";
import { ModalPortal } from "@/components/ModalPortal";
import {
  commandPaletteRefValue,
  commandPaletteTeamValue,
  loadCommandPaletteIndex,
  type CommandPaletteIndex,
} from "@/lib/command-palette-index";
import { COMMAND_PALETTE_OPEN_EVENT } from "@/lib/command-palette-events";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState<CommandPaletteIndex | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "k" || !(event.metaKey || event.ctrlKey)) return;
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      setOpen((current) => !current);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(COMMAND_PALETTE_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(COMMAND_PALETTE_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open || index) return;
    let cancelled = false;
    setLoading(true);
    void loadCommandPaletteIndex().then((loaded) => {
      if (cancelled) return;
      setIndex(loaded);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, index]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const navigate = useCallback((href: string) => {
    setOpen(false);
    navigateToHref(href);
  }, []);

  const refGroups = useMemo(() => {
    if (!index) return [];
    const byLeague = new Map<string, CommandPaletteIndex["refs"]>();
    for (const ref of index.refs) {
      const list = byLeague.get(ref.leagueLabel) ?? [];
      list.push(ref);
      byLeague.set(ref.leagueLabel, list);
    }
    return [...byLeague.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [index]);

  const teamGroups = useMemo(() => {
    if (!index) return [];
    const byLeague = new Map<string, CommandPaletteIndex["teams"]>();
    for (const team of index.teams) {
      const list = byLeague.get(team.leagueLabel) ?? [];
      list.push(team);
      byLeague.set(team.leagueLabel, list);
    }
    return [...byLeague.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [index]);

  if (!open) return null;

  return (
    <ModalPortal>
      <div
        className="command-palette-backdrop"
        role="presentation"
        onMouseDown={() => setOpen(false)}
      >
        <Command
          className="command-palette"
          label="RefWatch command palette"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="command-palette-input-row">
            <Search className="command-palette-input-icon" aria-hidden strokeWidth={2.1} />
            <Command.Input
              className="command-palette-input"
              placeholder="Search officials and teams..."
              autoFocus
            />
            <kbd className="command-palette-kbd">Esc</kbd>
          </div>

          <Command.List className="command-palette-list">
            {loading ? (
              <Command.Loading className="command-palette-empty">
                Loading search index...
              </Command.Loading>
            ) : null}

            {!loading && !index ? (
              <Command.Empty className="command-palette-empty">
                Search index unavailable. Run a data build to regenerate.
              </Command.Empty>
            ) : null}

            {!loading && index && index.refs.length === 0 && index.teams.length === 0 ? (
              <Command.Empty className="command-palette-empty">
                No officials or teams found in the index.
              </Command.Empty>
            ) : null}

            {refGroups.map(([leagueLabel, refs]) => (
              <Command.Group
                key={`refs-${leagueLabel}`}
                heading={`Officials · ${leagueLabel}`}
                className="command-palette-group"
              >
                {refs.map((ref) => (
                  <Command.Item
                    key={`${ref.leagueId}-${ref.slug}`}
                    value={commandPaletteRefValue(ref)}
                    className="command-palette-item"
                    onSelect={() => navigate(ref.href)}
                  >
                    <span className="command-palette-item-icon" aria-hidden>
                      <UserRound strokeWidth={2.1} />
                    </span>
                    <span className="command-palette-item-copy">
                      <span className="command-palette-item-label">{ref.name}</span>
                      <span className="command-palette-item-detail">
                        {ref.leagueLabel} · {ref.games.toLocaleString()} games
                      </span>
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}

            {teamGroups.map(([leagueLabel, teams]) => (
              <Command.Group
                key={`teams-${leagueLabel}`}
                heading={`Teams · ${leagueLabel}`}
                className="command-palette-group"
              >
                {teams.map((team) => (
                  <Command.Item
                    key={`${team.leagueId}-${team.abbr}`}
                    value={commandPaletteTeamValue(team)}
                    className="command-palette-item"
                    onSelect={() => navigate(team.href)}
                  >
                    <span className="command-palette-item-icon" aria-hidden>
                      <Users strokeWidth={2.1} />
                    </span>
                    <span className="command-palette-item-copy">
                      <span className="command-palette-item-label">{team.label}</span>
                      <span className="command-palette-item-detail">
                        {team.leagueLabel} · {team.abbr}
                      </span>
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>

          <div className="command-palette-footer">
            <span>Navigate with ↑ ↓</span>
            <span>Select with Enter</span>
            <span>
              <kbd className="command-palette-kbd">⌘</kbd>
              <kbd className="command-palette-kbd">K</kbd>
            </span>
          </div>
        </Command>
      </div>
    </ModalPortal>
  );
}

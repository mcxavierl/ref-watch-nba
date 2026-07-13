"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { MatrixSplitShareBar } from "@/components/MatrixSplitShareBar";
import { RefCompareControls } from "@/components/RefCompareControls";
import { RefCompareView } from "@/components/RefCompareView";
import {
  buildCompareShareText,
  buildCompareShareUrl,
  parseCompareRef,
  type CompareRefBundle,
  type CompareRefKey,
  type CompareRefPickerEntry,
} from "@/lib/ref-compare";
import {
  loadCompareRefPickerEntries,
  resolveCompareRefBundle,
} from "@/lib/ref-compare-client";
import type { LeagueId } from "@/lib/leagues";
import {
  readSeasonScopeParam,
  seasonScopeLabel,
  type SeasonScopeMode,
} from "@/lib/season-scope";

function leagueFromKey(key: string): LeagueId | null {
  return parseCompareRef(key)?.leagueId ?? null;
}

function entriesForLeague(
  entries: CompareRefPickerEntry[],
  leagueId: LeagueId | null,
): CompareRefPickerEntry[] {
  if (!leagueId) return entries;
  return entries.filter((entry) => entry.leagueId === leagueId);
}

function readCompareStateFromUrl(): {
  leftKey: string;
  rightKey: string;
  scopeMode: SeasonScopeMode;
} {
  if (typeof window === "undefined") {
    return { leftKey: "", rightKey: "", scopeMode: "last10" };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    leftKey: params.get("a") ?? "",
    rightKey: params.get("b") ?? "",
    scopeMode: readSeasonScopeParam(params.get("scope")),
  };
}

export function RefComparePageClient({ siteUrl }: { siteUrl: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [entries, setEntries] = useState<CompareRefPickerEntry[]>([]);
  const [pickerReady, setPickerReady] = useState(false);
  const [leftKey, setLeftKey] = useState(() => searchParams.get("a") ?? "");
  const [rightKey, setRightKey] = useState(() => searchParams.get("b") ?? "");
  const [scopeMode, setScopeMode] = useState<SeasonScopeMode>(() =>
    readSeasonScopeParam(searchParams.get("scope")),
  );
  const [left, setLeft] = useState<CompareRefBundle | null>(null);
  const [right, setRight] = useState<CompareRefBundle | null>(null);
  const [bundlesReady, setBundlesReady] = useState(false);

  const syncUrl = useCallback(
    (next: { a?: string; b?: string; scope?: SeasonScopeMode }) => {
      const params = new URLSearchParams();
      const a = next.a ?? "";
      const b = next.b ?? "";
      const scope = next.scope ?? scopeMode;
      if (a) params.set("a", a);
      if (b) params.set("b", b);
      if (scope !== "last10") params.set("scope", scope);
      const query = params.toString();
      const href = query ? `${pathname}?${query}` : pathname;
      window.history.replaceState(window.history.state, "", href);
    },
    [pathname, scopeMode],
  );

  useEffect(() => {
    let cancelled = false;
    loadCompareRefPickerEntries()
      .then((loaded) => {
        if (!cancelled) setEntries(loaded);
      })
      .finally(() => {
        if (!cancelled) setPickerReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const leftLeague = leagueFromKey(leftKey);
  const rightLeague = leagueFromKey(rightKey);

  const leftEntries = useMemo(
    () => entriesForLeague(entries, rightLeague),
    [entries, rightLeague],
  );
  const rightEntries = useMemo(
    () => entriesForLeague(entries, leftLeague),
    [entries, leftLeague],
  );

  useEffect(() => {
    if (!pickerReady || !leftLeague || !rightLeague || leftLeague === rightLeague) {
      return;
    }
    setRightKey("");
    syncUrl({ a: leftKey, b: "", scope: scopeMode });
  }, [pickerReady, leftKey, leftLeague, rightLeague, scopeMode, syncUrl]);

  useEffect(() => {
    function onPopState() {
      const state = readCompareStateFromUrl();
      setLeftKey(state.leftKey);
      setRightKey(state.rightKey);
      setScopeMode(state.scopeMode);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setBundlesReady(false);

    Promise.all([
      leftKey ? resolveCompareRefBundle(leftKey, scopeMode) : Promise.resolve(null),
      rightKey ? resolveCompareRefBundle(rightKey, scopeMode) : Promise.resolve(null),
    ])
      .then(([leftBundle, rightBundle]) => {
        if (cancelled) return;
        setLeft(leftBundle);
        setRight(rightBundle);
      })
      .finally(() => {
        if (!cancelled) setBundlesReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [leftKey, rightKey, scopeMode]);

  const handleLeftChange = useCallback(
    (key: string) => {
      const nextLeague = leagueFromKey(key);
      let nextRightKey = rightKey;
      if (key && rightKey && nextLeague && rightLeague && nextLeague !== rightLeague) {
        nextRightKey = "";
        setRightKey("");
      }
      setLeftKey(key);
      syncUrl({ a: key, b: nextRightKey, scope: scopeMode });
    },
    [rightKey, rightLeague, scopeMode, syncUrl],
  );

  const handleRightChange = useCallback(
    (key: string) => {
      const nextLeague = leagueFromKey(key);
      let nextLeftKey = leftKey;
      if (key && leftKey && nextLeague && leftLeague && nextLeague !== leftLeague) {
        nextLeftKey = "";
        setLeftKey("");
      }
      setRightKey(key);
      syncUrl({ a: nextLeftKey, b: key, scope: scopeMode });
    },
    [leftKey, leftLeague, scopeMode, syncUrl],
  );

  const handleScopeChange = useCallback(
    (mode: SeasonScopeMode) => {
      setScopeMode(mode);
      syncUrl({ a: leftKey, b: rightKey, scope: mode });
    },
    [leftKey, rightKey, syncUrl],
  );

  const swapRefs = useCallback(() => {
    setLeftKey(rightKey);
    setRightKey(leftKey);
    syncUrl({ a: rightKey, b: leftKey, scope: scopeMode });
  }, [leftKey, rightKey, scopeMode, syncUrl]);

  const shareText = useMemo(
    () => buildCompareShareText(left, right, seasonScopeLabel(scopeMode)),
    [left, right, scopeMode],
  );
  const shareUrl = useMemo(
    () =>
      buildCompareShareUrl(
        siteUrl,
        (leftKey || null) as CompareRefKey | null,
        (rightKey || null) as CompareRefKey | null,
        scopeMode,
      ),
    [leftKey, rightKey, scopeMode, siteUrl],
  );
  const linkShareText = useMemo(() => {
    if (!left || !right) return shareUrl;
    return [
      `⚖️ Ref Watch Official Compare (${seasonScopeLabel(scopeMode)})`,
      `🔗 ${left.profile.name} (${left.config.shortLabel}) vs ${right.profile.name} (${right.config.shortLabel}): ${shareUrl}`,
    ].join("\n");
  }, [left, right, scopeMode, shareUrl]);

  const crossLeague =
    Boolean(left && right) && left!.leagueId !== right!.leagueId;

  return (
    <div className="ref-compare-page">
      <RefCompareControls
        leftEntries={leftEntries}
        rightEntries={rightEntries}
        leftKey={leftKey}
        rightKey={rightKey}
        scopeMode={scopeMode}
        onLeftChange={handleLeftChange}
        onRightChange={handleRightChange}
        onScopeChange={handleScopeChange}
        onSwap={swapRefs}
      />

      {!pickerReady ? (
        <p className="ref-compare-loading text-sm text-zinc-500">
          Loading official directory…
        </p>
      ) : null}

      <RefCompareView
        left={bundlesReady ? left : null}
        right={bundlesReady ? right : null}
        crossLeagueHint={crossLeague}
        loading={!bundlesReady && Boolean(leftKey || rightKey)}
      />

      {left && right ? (
        <MatrixSplitShareBar
          title="Share this comparison"
          preview={`${left.profile.name} (${left.config.shortLabel}) vs ${right.profile.name} (${right.config.shortLabel})`}
          shareText={shareText}
          linkShareText={linkShareText}
          pageUrl={shareUrl}
        />
      ) : null}
    </div>
  );
}

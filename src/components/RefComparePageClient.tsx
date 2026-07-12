"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MatrixSplitShareBar } from "@/components/MatrixSplitShareBar";
import { RefComparePicker } from "@/components/RefComparePicker";
import { RefCompareView } from "@/components/RefCompareView";
import {
  buildCompareShareText,
  buildCompareShareUrl,
  encodeCompareRef,
  type CompareRefBundle,
  type CompareRefPickerEntry,
} from "@/lib/ref-compare";
import {
  SEASON_SCOPE_MODES,
  seasonScopeLabel,
  type SeasonScopeMode,
} from "@/lib/season-scope";

export function RefComparePageClient({
  allRefs,
  left,
  right,
  scopeMode,
  siteUrl,
}: {
  allRefs: CompareRefPickerEntry[];
  left: CompareRefBundle | null;
  right: CompareRefBundle | null;
  scopeMode: SeasonScopeMode;
  siteUrl: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const leftKey = left ? encodeCompareRef(left.leagueId, left.slug) : "";
  const rightKey = right ? encodeCompareRef(right.leagueId, right.slug) : "";

  const replaceParams = useCallback(
    (next: { a?: string; b?: string; scope?: SeasonScopeMode }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.a) params.set("a", next.a);
      else params.delete("a");
      if (next.b) params.set("b", next.b);
      else params.delete("b");
      if (next.scope && next.scope !== "last10") params.set("scope", next.scope);
      else if (next.scope === "last10") params.delete("scope");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleLeftChange = useCallback(
    (key: string) => {
      replaceParams({ a: key || undefined, b: rightKey || undefined, scope: scopeMode });
    },
    [replaceParams, rightKey, scopeMode],
  );

  const handleRightChange = useCallback(
    (key: string) => {
      replaceParams({ a: leftKey || undefined, b: key || undefined, scope: scopeMode });
    },
    [leftKey, replaceParams, scopeMode],
  );

  const handleScopeChange = useCallback(
    (mode: SeasonScopeMode) => {
      replaceParams({
        a: leftKey || undefined,
        b: rightKey || undefined,
        scope: mode,
      });
    },
    [leftKey, replaceParams, rightKey],
  );

  const swapRefs = useCallback(() => {
    replaceParams({
      a: rightKey || undefined,
      b: leftKey || undefined,
      scope: scopeMode,
    });
  }, [leftKey, replaceParams, rightKey, scopeMode]);

  const shareText = useMemo(
    () => buildCompareShareText(left, right, seasonScopeLabel(scopeMode)),
    [left, right, scopeMode],
  );
  const shareUrl = useMemo(
    () =>
      buildCompareShareUrl(
        siteUrl,
        leftKey || null,
        rightKey || null,
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

  return (
    <div className="ref-compare-page">
      <div className="ref-compare-controls data-card px-4 py-4 sm:px-5">
        <div className="ref-compare-controls-grid">
          <RefComparePicker
            id="compare-ref-a"
            label="Official A"
            entries={allRefs}
            value={leftKey}
            onChange={handleLeftChange}
          />
          <div className="ref-compare-swap-wrap">
            <button
              type="button"
              className="btn-secondary ref-compare-swap-btn"
              onClick={swapRefs}
              disabled={!leftKey && !rightKey}
              aria-label="Swap officials"
            >
              Swap
            </button>
          </div>
          <RefComparePicker
            id="compare-ref-b"
            label="Official B"
            entries={allRefs}
            value={rightKey}
            onChange={handleRightChange}
          />
        </div>

        <div
          className="ref-compare-scope"
          role="group"
          aria-label="Season scope"
        >
          {SEASON_SCOPE_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              className={`ref-compare-scope-btn${
                scopeMode === mode ? " ref-compare-scope-btn--active" : ""
              }`}
              aria-pressed={scopeMode === mode}
              onClick={() => handleScopeChange(mode)}
            >
              {seasonScopeLabel(mode)}
            </button>
          ))}
        </div>
      </div>

      <RefCompareView left={left} right={right} />

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

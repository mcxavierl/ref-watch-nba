# Ref Watch Design System — Accessibility Guide

This document covers semantic tokens, Tailwind utilities, live regions, and theme handling for the Ref Watch analytics dashboard.

## Semantic color tokens

Tokens live in `src/styles/theme-tokens.css` and use **purpose-based naming**, not hue-based naming:

| Token | Purpose |
|-------|---------|
| `--bg-surface-0` … `--bg-surface-3` | Elevation layers (page → raised panels) |
| `--text-primary` / `--text-secondary` / `--text-muted` | Body copy hierarchy (≥ 4.5:1 on `--bg-surface-1`) |
| `--border-subtle` / `--border-default` / `--border-strong` | Dividers and card edges (≥ 3:1 against adjacent surface) |
| `--accent-positive` / `--accent-negative` | Directional metrics (cover %, foul drift) |
| `--accent-brand` | Links, primary actions |
| `--focus-ring` / `--focus-ring-offset` | Keyboard focus indicator |

**Light mode:** `:root`, `[data-theme="light"]`, `html[data-color="light"]`  
**Dark mode:** `[data-theme="dark"]`, `html[data-color="dark"]`, `html.dark`

High-contrast overrides apply when `html[data-contrast="high"]` is set from the accessibility panel.

## Tailwind semantic utilities

Imported via `src/styles/a11y-utilities.css`. Prefer these over raw zinc/emerald classes for new work:

```tsx
<p className="text-primary">Headline</p>
<p className="text-secondary">Supporting copy</p>
<span className="text-muted">Sample size · updated date</span>

<div className="bg-surface-1 border border-subtle rounded-xl">
  <span className="text-accent-positive">+4.2 pp ATS</span>
</div>

<button className="rw-ring text-primary">Filter</button>
```

Mapped `@theme` colors in `globals.css` also expose `bg-bg-surface-1`, `text-text-primary`, `ring-focus-ring`, etc.

## Data Card component

Use `DataCard` and sub-components from `@/components/design-system` for dense analytics layouts (League Stories, findings, metric strips):

```tsx
import {
  DataCard,
  DataCardHeader,
  DataCardHero,
  DataCardBody,
  DataCardStats,
  DataCardFooter,
} from "@/components/design-system";

<DataCard dataLeague="nba" interactive density="comfortable">
  <DataCardHeader kicker="Pace outlier">NBA</DataCardHeader>
  <DataCardHero value="58.2%" label="Home cover" tone="positive" />
  <DataCardBody headline="Scott Foster × BOS">
    <p className="text-secondary">…</p>
  </DataCardBody>
  <DataCardStats stats={[{ label: "Games", value: "24" }]} />
  <DataCardFooter>{/* actions */}</DataCardFooter>
</DataCard>
```

Interactive cards use `.rw-focus-visible` for a **high-contrast keyboard focus ring** (2px ring + offset).

## Lucide icon wrapper

Use `Icon` from `@/components/design-system` instead of raw `lucide-react` imports:

```tsx
import { Icon } from "@/components/design-system";
import { ArrowRight, Filter } from "lucide-react";

{/* Decorative — hidden from AT */}
<Icon icon={ArrowRight} tone="brand" size="1rem" />

{/* Meaningful / interactive */}
<button aria-label="Filter findings">
  <Icon icon={Filter} label="Filter findings" tone="primary" />
</button>
```

- Omit `label` → `aria-hidden="true"` (decorative).
- Pass `label` → `role="img"` + `aria-label` (meaningful).
- `tone` maps stroke colour to semantic tokens.

## Theme provider

`ThemeProvider` wraps the app in `layout.tsx`. Use `useTheme()` for preference and resolved appearance:

```tsx
import { useTheme } from "@/lib/theme/ThemeProvider";

const { mode, resolvedMode, followsSystem, setMode, toggleMode } = useTheme();

setMode("system"); // follow OS
setMode("dark");   // manual override (persisted to localStorage)
```

Preferences are stored in `localStorage` under `refwatch-a11y-settings` (shared with contrast, text size, and font settings). A blocking script in `<head>` applies the resolved theme before first paint to avoid flash.

## `aria-live` for dynamic dashboard updates

When filters, sorts, or async refreshes change visible data, **announce the new state** to screen reader users without moving focus.

### When to use `polite` vs `assertive`

| Politeness | Use for |
|------------|---------|
| `polite` | Filter results, sort changes, pagination, chart data refresh |
| `assertive` | Errors, data-source warnings, failed loads |
| `off` | Decorative counters that duplicate visible text |

### Pattern 1: `FilterResultsAnnouncer` (drop-in)

```tsx
import { FilterResultsAnnouncer } from "@/lib/a11y/LiveRegion";

<FilterResultsAnnouncer
  resultCount={filtered.length}
  totalCount={findings.length}
  filterLabel={FINDING_FILTER_LABELS[categoryFilter]}
  entityLabel="findings"
/>
```

Place **once per filtered container**, typically immediately after the filter bar. The announcer is visually hidden (`.sr-live`) but exposed to assistive technology.

### Pattern 2: `useLiveAnnouncement` (custom copy)

```tsx
import { LiveRegion, useLiveAnnouncement } from "@/lib/a11y/LiveRegion";

const message = loading
  ? "Loading referee matrix."
  : `Matrix updated. ${rows.length} crew rows for ${season}.`;
const announcement = useLiveAnnouncement(message);

return (
  <>
    <LiveRegion politeness="polite">{announcement}</LiveRegion>
    <table>…</table>
  </>
);
```

### Implementation rules

1. **One live region per logical update** — avoid multiple regions competing.
2. **Set `aria-atomic="true"`** when the whole summary should be read (default in `LiveRegion`).
3. **Do not put live regions inside buttons** or other interactive controls.
4. **Announce outcomes, not every keystroke** — debounce search; announce after filter apply.
5. **Keep messages concise** — e.g. “Filter Coach friction: showing 3 of 47 findings.”
6. **Mirror visible state** — if the UI shows “0 results”, the live region must say so.

### Example: Research findings filter

See `ResearchHubFindings.tsx` — `FilterResultsAnnouncer` runs whenever `categoryFilter` or `confidenceFilter` changes.

## WCAG 2.2 checklist (dashboard-specific)

- [ ] Body text uses `text-primary` / `text-secondary` on `bg-surface-1` (verified ≥ 4.5:1).
- [ ] Focus indicators visible on all interactive cards and chips (`rw-ring` / `rw-focus-visible`).
- [ ] Icons beside text are decorative (`aria-hidden`) unless they convey unique meaning.
- [ ] Filtered lists announce result counts via `aria-live="polite"`.
- [ ] Theme respects `prefers-color-scheme` when user selects System.
- [ ] `prefers-reduced-motion` honored for non-essential animation (existing site styles).

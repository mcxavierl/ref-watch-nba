import type { FoulBreakdownFilter } from "@/lib/ref-profile-fouls";

export type FoulView = FoulBreakdownFilter;

export const FOUL_VIEW_MODES = {
  ALL: "all",
  SUBJECTIVE: "subjective",
  ADMIN: "admin",
} as const satisfies Record<string, FoulView>;

export const FOUL_VIEW_OPTIONS: { id: FoulView; label: string }[] = [
  { id: FOUL_VIEW_MODES.ALL, label: "All" },
  { id: FOUL_VIEW_MODES.SUBJECTIVE, label: "Subjective" },
  { id: FOUL_VIEW_MODES.ADMIN, label: "Admin" },
];

const FOUL_VIEW_SET = new Set<FoulView>(["all", "subjective", "admin"]);

/** Parse `?view=` deep-link values for foul breakdown filtering. */
export function parseFoulViewParam(raw: string | null | undefined): FoulView {
  const normalized = raw?.trim().toLowerCase();
  if (!normalized || normalized === "all") return "all";
  if (normalized === "administrative" || normalized === "admin") return "admin";
  if (normalized === "subjective") return "subjective";
  if (FOUL_VIEW_SET.has(normalized as FoulView)) {
    return normalized as FoulView;
  }
  return "all";
}

export function foulViewQueryValue(view: FoulView): string | null {
  if (view === "all") return null;
  return view;
}

export function foulViewAriaLabel(view: FoulView): string {
  if (view === "admin") return "Administrative fouls";
  if (view === "subjective") return "Subjective fouls";
  return "All fouls";
}

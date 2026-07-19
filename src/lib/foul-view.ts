import type { FoulBreakdownFilter } from "@/lib/ref-profile-fouls";

export type FoulView = FoulBreakdownFilter;

export const FOUL_VIEW_OPTIONS: { id: FoulView; label: string }[] = [
  { id: "all", label: "All" },
  { id: "subjective", label: "Subjective" },
  { id: "admin", label: "Administrative" },
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

import type { RefOfficial } from "@/lib/types";
import { getRefIndex, resolveWnbaRefProfile } from "@/lib/wnba/data";

const SUMMARY_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/summary";

type SummaryOfficial = { fullName: string; positionName?: string };

function roleFromPosition(
  positionName: string | undefined,
  index: number,
): RefOfficial["role"] {
  const normalized = (positionName ?? "").toLowerCase();
  if (normalized.includes("crew")) return "crew_chief";
  if (normalized.includes("umpire")) return "umpire";
  if (normalized.includes("referee")) return "referee";
  const fallback: RefOfficial["role"][] = [
    "crew_chief",
    "referee",
    "umpire",
    "alternate",
  ];
  return fallback[index] ?? "alternate";
}

export async function fetchWnbaEspnOfficials(
  eventId: string,
): Promise<SummaryOfficial[]> {
  const res = await fetch(`${SUMMARY_BASE}?event=${eventId}`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];

  const body = (await res.json()) as {
    gameInfo?: {
      officials?: {
        fullName?: string;
        displayName?: string;
        position?: { name?: string; displayName?: string };
      }[];
    };
  };

  return (body.gameInfo?.officials ?? [])
    .map((official) => ({
      fullName: (official.fullName ?? official.displayName ?? "").trim(),
      positionName: official.position?.displayName ?? official.position?.name,
    }))
    .filter((official) => official.fullName.length > 0);
}

export function mapWnbaEspnOfficials(
  officials: SummaryOfficial[],
): RefOfficial[] {
  const roster = new Map(
    getRefIndex().map((entry) => [
      entry.name
        .toLowerCase()
        .replace(/[^a-z\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
      entry.number,
    ]),
  );

  return officials.map((official, index) => {
    const name = official.fullName.trim();
    const normalized = name
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const profile = resolveWnbaRefProfile(name, roster.get(normalized) ?? 0);
    return {
      name,
      number: profile?.number ?? roster.get(normalized) ?? 0,
      role: roleFromPosition(official.positionName, index),
    };
  });
}

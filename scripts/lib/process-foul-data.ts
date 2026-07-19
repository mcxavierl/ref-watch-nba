import {
  classifyFoulName,
  FoulCategory,
  getFoulCategory,
  type FoulClassificationLeague,
} from "../../src/lib/types/foul-categories";

/** Raw foul row before ingest enrichment. */
export type IngestFoulRecord = {
  foulName?: string;
  rawType?: string;
  type?: string;
  category?: FoulCategory;
};

/** Foul row after ingest enrichment (category required when a name is present). */
export type TaggedIngestFoul<T extends IngestFoulRecord> = T & {
  category: FoulCategory;
};

function resolveFoulName(foul: IngestFoulRecord): string {
  return (foul.foulName ?? foul.rawType ?? foul.type ?? "").trim();
}

/**
 * Classify and tag one foul during ingest. Unknown labels default to SUBJECTIVE
 * and emit a warning so the taxonomy map can be extended later.
 */
export function tagIngestFoul<T extends IngestFoulRecord>(
  league: FoulClassificationLeague,
  foul: T,
): T | TaggedIngestFoul<T> {
  if (foul.category !== undefined) {
    return foul;
  }

  const foulName = resolveFoulName(foul);
  if (!foulName) {
    return foul;
  }

  const mapped = getFoulCategory(league, foulName);
  const category = mapped ?? classifyFoulName(league, foulName);

  if (mapped === undefined) {
    console.warn(
      `[foul-ingest] Unrecognized ${league.toUpperCase()} foul "${foulName}" - defaulting to SUBJECTIVE. Add it to FOUL_CLASSIFICATION_MAP.`,
    );
  }

  console.log("Enriching Foul:", foulName, "-> Category:", category);

  return {
    ...foul,
    category,
  };
}

/** Tag each foul with category during the initial parsing phase. */
export function processFoulData<T extends IngestFoulRecord>(
  league: FoulClassificationLeague,
  fouls: readonly T[],
): Array<T | TaggedIngestFoul<T>> {
  return fouls.map((foul) => tagIngestFoul(league, foul));
}

export function classifyFoulForLeague(
  league: FoulClassificationLeague,
  foulName: string,
): FoulCategory {
  return classifyFoulName(league, foulName);
}

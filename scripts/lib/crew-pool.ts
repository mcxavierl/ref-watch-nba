import { crewKey } from "./slug";

/** Build a fixed pool of recurring officiating crews (real crews work many games together). */
export function buildCrewPool<T extends { name: string; number: number }>(
  rng: () => number,
  roster: T[],
  crewSize: number,
  poolSize: number,
): T[][] {
  const pool: T[][] = [];
  const seen = new Set<string>();
  let attempts = 0;
  const maxAttempts = poolSize * 100;

  while (pool.length < poolSize && attempts < maxAttempts) {
    attempts++;
    const copy = [...roster];
    const crew: T[] = [];
    for (let i = 0; i < crewSize; i++) {
      if (copy.length === 0) break;
      const idx = Math.floor(rng() * copy.length);
      crew.push(copy.splice(idx, 1)[0]);
    }
    if (crew.length !== crewSize) continue;

    const key = crewKey(crew);
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push(crew);
  }

  return pool;
}

export function pickCrewFromPool<T>(rng: () => number, pool: T[][]): T[] {
  if (pool.length === 0) {
    throw new Error("Crew pool is empty");
  }
  return pool[Math.floor(rng() * pool.length)];
}

export function buildNhlCrewPool(
  rng: () => number,
  roster: { name: string; number: number; role: "referee" | "linesman" }[],
  poolSize: number,
): { name: string; number: number; role: "referee" | "linesman" }[][] {
  const refs = roster.filter((o) => o.role === "referee");
  const lines = roster.filter((o) => o.role === "linesman");
  const pool: { name: string; number: number; role: "referee" | "linesman" }[][] =
    [];
  const seen = new Set<string>();
  let attempts = 0;
  const maxAttempts = poolSize * 100;

  while (pool.length < poolSize && attempts < maxAttempts) {
    attempts++;
    const refPool = [...refs];
    const linePool = [...lines];
    const crew: { name: string; number: number; role: "referee" | "linesman" }[] =
      [];

    for (let i = 0; i < 2; i++) {
      if (refPool.length === 0) break;
      const idx = Math.floor(rng() * refPool.length);
      crew.push(refPool.splice(idx, 1)[0]);
    }
    for (let i = 0; i < 2; i++) {
      if (linePool.length === 0) break;
      const idx = Math.floor(rng() * linePool.length);
      crew.push(linePool.splice(idx, 1)[0]);
    }
    if (crew.length !== 4) continue;

    const key = crewKey(crew);
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push(crew);
  }

  return pool;
}

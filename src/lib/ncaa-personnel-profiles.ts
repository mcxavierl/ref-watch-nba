import * as fs from "node:fs";
import * as path from "node:path";
import type { NcaaPersonnelProfileFile } from "@/lib/ncaa-personnel-types";
import { allowNodeDataFs } from "@/lib/production-data-guard";
import { registerWorkerIsolateEndCallback } from "@/lib/worker-isolate-store";

const RELATIVE_PATH = path.join("data", "ncaa", "personnel-profiles.json");

let cache: NcaaPersonnelProfileFile | null | undefined;

function personnelPath(): string {
  return path.join(process.cwd(), RELATIVE_PATH);
}

export function loadNcaaPersonnelProfiles(): NcaaPersonnelProfileFile | null {
  if (cache !== undefined) return cache;
  if (!allowNodeDataFs()) {
    cache = null;
    return null;
  }

  const filePath = personnelPath();
  if (!fs.existsSync(filePath)) {
    cache = null;
    return null;
  }

  try {
    cache = JSON.parse(
      fs.readFileSync(filePath, "utf8"),
    ) as NcaaPersonnelProfileFile;
    return cache;
  } catch {
    cache = null;
    return null;
  }
}

export function ncaaOfficialBySlug(
  profiles: NcaaPersonnelProfileFile | null,
  slug: string,
  sport?: "CBB" | "CFB",
): NcaaPersonnelProfileFile["officials"][number] | undefined {
  if (!profiles) return undefined;
  return profiles.officials.find(
    (official) =>
      official.slug === slug && (sport ? official.sport === sport : true),
  );
}

registerWorkerIsolateEndCallback(() => {
  cache = undefined;
});

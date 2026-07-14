import * as fs from "node:fs";
import * as path from "node:path";

export interface CfbConstants {
  minGameLogThreshold: number;
}

const DEFAULTS: CfbConstants = {
  minGameLogThreshold: 80,
};

const CONFIG_PATH = path.join(process.cwd(), "config", "cfb-constants.json");

export function loadCfbConstants(): CfbConstants {
  if (!fs.existsSync(CONFIG_PATH)) return DEFAULTS;
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) as Partial<CfbConstants>;
    const threshold = raw.minGameLogThreshold;
    return {
      minGameLogThreshold:
        typeof threshold === "number" && Number.isFinite(threshold) && threshold > 0
          ? Math.round(threshold)
          : DEFAULTS.minGameLogThreshold,
    };
  } catch {
    return DEFAULTS;
  }
}

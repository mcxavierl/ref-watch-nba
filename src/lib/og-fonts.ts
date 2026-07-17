import { readFileSync } from "node:fs";
import { join } from "node:path";

const FONT_DIR = join(process.cwd(), "node_modules/@fontsource/inter/files");

const INTER_SOURCES: Array<{ weight: 500 | 600 | 700 | 800 | 900; file: string }> = [
  { weight: 500, file: "inter-latin-500-normal.woff" },
  { weight: 600, file: "inter-latin-600-normal.woff" },
  { weight: 700, file: "inter-latin-700-normal.woff" },
  { weight: 800, file: "inter-latin-800-normal.woff" },
  { weight: 900, file: "inter-latin-900-normal.woff" },
];

type OgFont = {
  name: string;
  data: ArrayBuffer;
  style: "normal";
  weight: 500 | 600 | 700 | 800 | 900;
};

let cachedFonts: OgFont[] | null = null;

export async function loadOgFonts(): Promise<OgFont[]> {
  if (cachedFonts) return cachedFonts;

  cachedFonts = INTER_SOURCES.map(({ weight, file }) => ({
    name: "Inter",
    data: readFileSync(join(FONT_DIR, file)).buffer as ArrayBuffer,
    style: "normal" as const,
    weight,
  }));

  return cachedFonts;
}

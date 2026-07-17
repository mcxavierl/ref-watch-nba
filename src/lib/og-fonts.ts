const INTER_SOURCES: Array<{ weight: 500 | 600 | 700 | 800 | 900; url: string }> = [
  {
    weight: 500,
    url: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hiA.woff",
  },
  {
    weight: 600,
    url: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hiA.woff",
  },
  {
    weight: 700,
    url: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hiA.woff",
  },
  {
    weight: 800,
    url: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuDyYAZ9hiA.woff",
  },
  {
    weight: 900,
    url: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuBWYAZ9hiA.woff",
  },
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

  const fonts = await Promise.all(
    INTER_SOURCES.map(async ({ weight, url }) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load Inter ${weight} for OG image: ${response.status}`);
      }
      return {
        name: "Inter",
        data: await response.arrayBuffer(),
        style: "normal" as const,
        weight,
      };
    }),
  );

  cachedFonts = fonts;
  return fonts;
}

/** ISO 3166-1 alpha-2 → flag emoji via regional indicators. */
function flagFromAlpha2(alpha2: string): string {
  const code = alpha2.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return [...code]
    .map((char) => String.fromCodePoint(0x1f1e6 - 65 + char.charCodeAt(0)))
    .join("");
}

/** Common FIFA country names and alpha-3 codes used in World Cup data. */
const COUNTRY_ALPHA2: Record<string, string> = {
  ARG: "AR",
  ESP: "ES",
  SVN: "SI",
  SLO: "SI",
  JOR: "JO",
  GER: "DE",
  COL: "CO",
  Slovenia: "SI",
  Jordan: "JO",
  Germany: "DE",
  Colombia: "CO",
  Argentina: "AR",
  Spain: "ES",
};

export function worldCupCountryFlag(country: string, countryCode?: string): string {
  if (countryCode) {
    const fromCode = COUNTRY_ALPHA2[countryCode.toUpperCase()];
    if (fromCode) return flagFromAlpha2(fromCode);
    if (countryCode.length === 2) return flagFromAlpha2(countryCode);
  }

  const fromName = COUNTRY_ALPHA2[country.trim()];
  if (fromName) return flagFromAlpha2(fromName);

  return "";
}

export function worldCupTeamFlag(teamCode: string): string {
  const alpha2 = COUNTRY_ALPHA2[teamCode.toUpperCase()];
  if (alpha2) return flagFromAlpha2(alpha2);
  return "";
}

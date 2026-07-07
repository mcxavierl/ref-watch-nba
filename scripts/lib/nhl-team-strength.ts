/**
 * Approximate NHL team win rates since 2021-22 for seed score generation.
 * Centered at 0.5; stronger teams get positive bias in simulated outcomes.
 */
export const NHL_TEAM_WIN_BIAS: Record<string, number> = {
  ANA: -0.12,
  BOS: 0.1,
  BUF: -0.05,
  CAR: 0.08,
  CBJ: -0.06,
  CGY: -0.02,
  CHI: -0.1,
  COL: 0.1,
  DAL: 0.05,
  DET: -0.04,
  EDM: 0.08,
  FLA: 0.07,
  LAK: 0.04,
  MIN: 0.02,
  MTL: -0.07,
  NSH: 0.02,
  NJD: 0.0,
  NYI: 0.0,
  NYR: 0.05,
  OTT: -0.02,
  PHI: -0.04,
  PIT: 0.02,
  SEA: -0.04,
  SJS: -0.08,
  STL: 0.0,
  TBL: 0.07,
  TOR: 0.05,
  UTA: -0.05,
  VAN: 0.0,
  VGK: 0.08,
  WPG: 0.02,
  WSH: 0.02,
};

export function nhlMatchupStrengthBias(
  homeTeam: string,
  awayTeam: string,
): number {
  const home = NHL_TEAM_WIN_BIAS[homeTeam.toUpperCase()] ?? 0;
  const away = NHL_TEAM_WIN_BIAS[awayTeam.toUpperCase()] ?? 0;
  return (home - away) * 1.8;
}

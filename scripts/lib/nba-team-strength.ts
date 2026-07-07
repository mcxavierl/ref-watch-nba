/**
 * Approximate NBA team win rates since 2021-22 for seed score generation.
 */
export const NBA_TEAM_WIN_BIAS: Record<string, number> = {
  ATL: 0.0,
  BKN: -0.02,
  BOS: 0.12,
  CHA: -0.1,
  CHI: -0.06,
  CLE: 0.06,
  DAL: 0.04,
  DEN: 0.1,
  DET: -0.1,
  GSW: 0.06,
  HOU: -0.04,
  IND: 0.0,
  LAC: 0.04,
  LAL: 0.02,
  MEM: 0.04,
  MIA: 0.04,
  MIL: 0.1,
  MIN: 0.04,
  NOP: 0.0,
  NYK: 0.04,
  OKC: 0.08,
  ORL: 0.02,
  PHI: 0.04,
  PHX: 0.06,
  POR: -0.06,
  SAC: 0.0,
  SAS: -0.12,
  TOR: 0.0,
  UTA: -0.02,
  WAS: -0.08,
};

export function nbaMatchupStrengthBias(
  homeTeam: string,
  awayTeam: string,
): number {
  const home = NBA_TEAM_WIN_BIAS[homeTeam.toUpperCase()] ?? 0;
  const away = NBA_TEAM_WIN_BIAS[awayTeam.toUpperCase()] ?? 0;
  return (home - away) * 10;
}

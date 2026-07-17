export interface OddsApiOutcome {
  name: string;
  point?: number;
  price?: number;
}

export interface OddsApiMarket {
  key: string;
  outcomes: OddsApiOutcome[];
}

export interface OddsApiBookmaker {
  key: string;
  markets: OddsApiMarket[];
}

export interface OddsApiEvent {
  id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers: OddsApiBookmaker[];
}

export interface HistoricalOddsSnapshot {
  timestamp: string;
  previous_timestamp: string;
  next_timestamp: string;
  data: OddsApiEvent[];
}

export function consensusTotal(event: OddsApiEvent): {
  total: number;
  overOdds?: number;
  underOdds?: number;
} | null {
  const values: number[] = [];
  let overOdds: number | undefined;
  let underOdds: number | undefined;

  for (const book of event.bookmakers) {
    const market = book.markets.find((m) => m.key === "totals");
    if (!market) continue;
    const over = market.outcomes.find((o) => o.name === "Over" && o.point);
    if (over?.point) values.push(over.point);
    if (over?.price !== undefined && overOdds === undefined) {
      overOdds = over.price;
    }
    const under = market.outcomes.find((o) => o.name === "Under" && o.point);
    if (under?.price !== undefined && underOdds === undefined) {
      underOdds = under.price;
    }
  }

  if (values.length === 0) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return {
    total: Math.round(avg * 2) / 2,
    overOdds,
    underOdds,
  };
}

export function consensusHomeSpread(event: OddsApiEvent): {
  spread: number;
  homeSpreadOdds?: number;
} | null {
  const values: number[] = [];
  let homeSpreadOdds: number | undefined;

  for (const book of event.bookmakers) {
    const market = book.markets.find((m) => m.key === "spreads");
    if (!market) continue;
    const home = market.outcomes.find((o) => o.name === event.home_team);
    if (home?.point !== undefined) values.push(home.point);
    if (home?.price !== undefined && homeSpreadOdds === undefined) {
      homeSpreadOdds = home.price;
    }
  }

  if (values.length === 0) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return {
    spread: Math.round(avg * 2) / 2,
    homeSpreadOdds,
  };
}

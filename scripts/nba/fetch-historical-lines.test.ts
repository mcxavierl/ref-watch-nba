import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  consensusHomeSpread,
  consensusTotal,
  type OddsApiEvent,
} from "../lib/odds-api-consensus";
import { eventToLine } from "./fetch-historical-lines";

describe("odds-api-consensus", () => {
  const event: OddsApiEvent = {
    id: "evt-1",
    home_team: "Boston Celtics",
    away_team: "Los Angeles Lakers",
    commence_time: "2024-01-15T00:30:00Z",
    bookmakers: [
      {
        key: "draftkings",
        markets: [
          {
            key: "totals",
            outcomes: [
              { name: "Over", point: 220.5, price: -110 },
              { name: "Under", point: 220.5, price: -110 },
            ],
          },
          {
            key: "spreads",
            outcomes: [
              { name: "Boston Celtics", point: -4.5, price: -110 },
              { name: "Los Angeles Lakers", point: 4.5, price: -110 },
            ],
          },
        ],
      },
      {
        key: "fanduel",
        markets: [
          {
            key: "totals",
            outcomes: [
              { name: "Over", point: 221.5, price: -108 },
              { name: "Under", point: 221.5, price: -112 },
            ],
          },
          {
            key: "spreads",
            outcomes: [
              { name: "Boston Celtics", point: -5, price: -108 },
              { name: "Los Angeles Lakers", point: 5, price: -112 },
            ],
          },
        ],
      },
    ],
  };

  it("averages consensus total and home spread across books", () => {
    assert.deepEqual(consensusTotal(event), {
      total: 221,
      overOdds: -110,
      underOdds: -110,
    });
    assert.deepEqual(consensusHomeSpread(event), {
      spread: -4.5,
      homeSpreadOdds: -110,
    });
  });
});

describe("fetch-historical-lines eventToLine", () => {
  it("maps Odds API team names to abbr lines", () => {
    const line = eventToLine(
      {
        id: "evt-1",
        home_team: "Boston Celtics",
        away_team: "Los Angeles Lakers",
        commence_time: "2024-01-15T00:30:00Z",
        bookmakers: [
          {
            key: "draftkings",
            markets: [
              {
                key: "totals",
                outcomes: [
                  { name: "Over", point: 220.5, price: -110 },
                  { name: "Under", point: 220.5, price: -110 },
                ],
              },
              {
                key: "spreads",
                outcomes: [
                  { name: "Boston Celtics", point: -4.5, price: -110 },
                  { name: "Los Angeles Lakers", point: 4.5, price: -110 },
                ],
              },
            ],
          },
        ],
      },
      new Map([
        [
          "2024-01-15|LAL|BOS",
          {
            gameId: "0022400123",
            date: "2024-01-15",
            awayTeam: "LAL",
            homeTeam: "BOS",
          },
        ],
      ]),
    );

    assert.ok(line);
    assert.equal(line?.gameId, "0022400123");
    assert.equal(line?.awayTeam, "LAL");
    assert.equal(line?.homeTeam, "BOS");
    assert.equal(line?.total, 220.5);
    assert.equal(line?.homeSpread, -4.5);
    assert.equal(line?.source, "the-odds-api-historical");
  });
});

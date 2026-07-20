import {
  REFWATCH_AUDIENCE,
  REFWATCH_MISSION,
  REFWATCH_POSITIONING,
  REFWATCH_VALIDATION_POSITIONING,
  TRUST_CHARTER_PRINCIPLES,
} from "@/lib/trust-charter";

export const ABOUT_PAGE_LEAD =
  "RefWatch is officiating intelligence for research, media, and league-adjacent products. We decompose variance in high-leverage game states with published sample gates and honest limits.";

export const ABOUT_PILLARS = [
  {
    id: "transparency",
    title: "Radical transparency",
    body: "Homepage cards pass published methodology gates. We label preliminary samples, shrink small-n deltas, and document what the data cannot prove.",
  },
  {
    id: "process",
    title: "Process over narrative",
    body: "We measure historical tendencies in crew assignments and leverage-weighted whistle context. We do not frame officials as villains or sell unvalidated alpha.",
  },
  {
    id: "validation",
    title: "Empirical validation",
    body: REFWATCH_VALIDATION_POSITIONING,
  },
  {
    id: "audience",
    title: "Research-first market",
    body: REFWATCH_AUDIENCE,
  },
] as const;

export const ABOUT_NOT_LIST = [
  "Not a pick service or sportsbook affiliate",
  "Not guaranteed predictions or outcome forecasts",
  "Not hidden sample sizes or sensationalized ref bias stories",
] as const;

export { REFWATCH_MISSION, REFWATCH_POSITIONING, TRUST_CHARTER_PRINCIPLES };

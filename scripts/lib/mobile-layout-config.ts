export const MOBILE_LAYOUT_VIEWPORT = {
  width: 390,
  height: 844,
} as const;

export const MOBILE_LAYOUT_PAGES = [
  {
    path: "/",
    label: "homepage",
    selectors: [
      ".upcoming-game-card",
      ".upcoming-game-card__trend",
      ".upcoming-game-card__footer",
      ".overview-league-chooser-grid",
    ],
  },
] as const;

export const MOBILE_TREND_MIN_HEIGHT_PX = 40;

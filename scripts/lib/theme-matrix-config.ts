export type ThemeMatrixVariant = {
  color: "light" | "dark";
  contrast: "default" | "high";
  label: string;
};

export type ThemeMatrixProbe = {
  selector: string;
  name: string;
  minRatio?: number;
  largeText?: boolean;
  /** Skip instead of failing when the selector is absent (offseason / sparse data). */
  optional?: boolean;
  /** Fail when light-mode global ink lands on an always-dark capsule. */
  requireLightInkOnDarkSurface?: boolean;
};

export type ThemeMatrixPage = {
  path: string;
  name: string;
  readySelector: string;
  screenshotSelector?: string;
  probes: ThemeMatrixProbe[];
};

export const THEME_MATRIX_VARIANTS: ThemeMatrixVariant[] = [
  { color: "light", contrast: "default", label: "light-default" },
  { color: "dark", contrast: "default", label: "dark-default" },
  { color: "light", contrast: "high", label: "light-high" },
  { color: "dark", contrast: "high", label: "dark-high" },
];

export const THEME_MATRIX_PAGES: ThemeMatrixPage[] = [
  {
    path: "/",
    name: "homepage",
    readySelector: ".overview-shell--clinical",
    screenshotSelector: ".overview-shell--clinical",
    probes: [
      {
        selector: "#intelligence-hero-heading",
        name: "homepage hero title",
      },
      {
        selector: ".overview-section-lead",
        name: "homepage section lead",
      },
      {
        selector: ".overview-league-chooser-label",
        name: "league chooser label",
      },
      {
        selector: ".upcoming-game-card__team-abbr",
        name: "upcoming card team abbr",
        optional: true,
      },
      {
        selector: ".insight-editorial-kicker",
        name: "insight editorial kicker",
        optional: true,
      },
    ],
  },
  {
    path: "/nba",
    name: "nba-hub",
    readySelector: "#nba-slate-heading",
    screenshotSelector: ".league-slate-hero",
    probes: [
      {
        selector: ".league-slate-hero .page-title",
        name: "league slate title",
      },
      {
        selector: ".league-slate-kicker",
        name: "league slate kicker",
        minRatio: 4.5,
      },
      {
        selector: ".browse-action-card-title",
        name: "browse action card title",
        optional: true,
      },
      {
        selector: ".upcoming-game-card__team-abbr",
        name: "league upcoming card team abbr",
        optional: true,
      },
    ],
  },
  {
    path: "/theme-matrix",
    name: "theme-matrix-fixture",
    readySelector: ".wc-data-capsule",
    screenshotSelector: ".wc-narrative-section",
    probes: [
      {
        selector: ".wc-data-capsule .wc-match-headline",
        name: "wc match headline",
        requireLightInkOnDarkSurface: true,
      },
      {
        selector: ".wc-data-capsule:not(.wc-data-capsule--referee) h3",
        name: "wc kpi headline",
        requireLightInkOnDarkSurface: true,
      },
      {
        selector: ".wc-data-capsule .wc-data-label",
        name: "wc data label",
        minRatio: 4,
        requireLightInkOnDarkSurface: true,
      },
      {
        selector: ".wc-data-capsule a",
        name: "wc capsule link",
        minRatio: 4.5,
        requireLightInkOnDarkSurface: true,
      },
      {
        selector: ".wc-data-capsule .text-6xl",
        name: "wc kpi value",
        largeText: true,
        requireLightInkOnDarkSurface: true,
      },
    ],
  },
];

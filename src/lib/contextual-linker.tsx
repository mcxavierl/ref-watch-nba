import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { leagueHubHref } from "@/lib/leagues";

type LeagueLinkTerm = {
  pattern: RegExp;
  href: string;
  /** Screen-reader friendly link label */
  ariaLabel: string;
};

/** Longest phrases first so "Premier League" wins over "League". */
const LEAGUE_LINK_TERMS: LeagueLinkTerm[] = [
  {
    pattern: /\bPremier League\b/g,
    href: leagueHubHref("epl"),
    ariaLabel: "Premier League hub",
  },
  {
    pattern: /\bLa Liga\b/g,
    href: leagueHubHref("laliga"),
    ariaLabel: "La Liga hub",
  },
  {
    pattern: /\bNBA\b/g,
    href: leagueHubHref("nba"),
    ariaLabel: "NBA hub",
  },
  {
    pattern: /\bNFL\b/g,
    href: leagueHubHref("nfl"),
    ariaLabel: "NFL hub",
  },
  {
    pattern: /\bNHL\b/g,
    href: leagueHubHref("nhl"),
    ariaLabel: "NHL hub",
  },
  {
    pattern: /\bCFB\b/g,
    href: leagueHubHref("cfb"),
    ariaLabel: "College football hub",
  },
  {
    pattern: /\bCBB\b/g,
    href: leagueHubHref("cbb"),
    ariaLabel: "College basketball hub",
  },
  {
    pattern: /\bEPL\b/g,
    href: leagueHubHref("epl"),
    ariaLabel: "Premier League hub",
  },
];

type TextMatch = {
  start: number;
  end: number;
  text: string;
  href: string;
  ariaLabel: string;
};

function collectLeagueMatches(text: string): TextMatch[] {
  const matches: TextMatch[] = [];

  for (const term of LEAGUE_LINK_TERMS) {
    term.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = term.pattern.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
        href: term.href,
        ariaLabel: term.ariaLabel,
      });
    }
  }

  matches.sort((a, b) => a.start - b.start || b.end - a.end - (a.end - a.start));

  const picked: TextMatch[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start < cursor) continue;
    picked.push(match);
    cursor = match.end;
  }

  return picked;
}

/** Auto-link league names in plain text for crawlable internal links. */
export function linkLeagueNames(text: string): ReactNode {
  const matches = collectLeagueMatches(text);
  if (matches.length === 0) return text;

  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start > cursor) {
      nodes.push(text.slice(cursor, match.start));
    }
    nodes.push(
      <Link
        key={`${match.href}-${match.start}`}
        href={match.href}
        className="contextual-league-link font-medium text-zinc-800 underline-offset-2 hover:underline"
        aria-label={match.ariaLabel}
      >
        {match.text}
      </Link>,
    );
    cursor = match.end;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes.map((node, index) => (
    <Fragment key={`ctx-${index}`}>{node}</Fragment>
  ));
}

type ContextualLinkerTextProps = {
  text: string;
  as?: "span" | "p";
  className?: string;
};

export function ContextualLinkerText({
  text,
  as: Tag = "span",
  className,
}: ContextualLinkerTextProps) {
  return <Tag className={className}>{linkLeagueNames(text)}</Tag>;
}

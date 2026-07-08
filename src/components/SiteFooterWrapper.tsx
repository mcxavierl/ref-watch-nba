"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { leagueFromPathname } from "@/lib/leagues";

export function SiteFooterWrapper({
  nbaFooter,
  nhlFooter,
  eplFooter,
  cbbFooter,
  cfbFooter,
}: {
  nbaFooter: ReactNode;
  nhlFooter: ReactNode;
  eplFooter: ReactNode;
  cbbFooter: ReactNode;
  cfbFooter: ReactNode;
}) {
  const pathname = usePathname();
  const league = leagueFromPathname(pathname ?? "/");

  if (league === "nhl") return nhlFooter;
  if (league === "epl") return eplFooter;
  if (league === "cbb") return cbbFooter;
  if (league === "cfb") return cfbFooter;
  return nbaFooter;
}

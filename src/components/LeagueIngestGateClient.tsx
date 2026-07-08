"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { isPreviewQuery, isShowUnverifiedEnv } from "@/lib/show-unverified";

function LeagueIngestGateInner({
  dataVerified,
  leagueLabel,
  ticketUrl,
  ticketNumber,
  children,
}: {
  dataVerified: boolean;
  leagueLabel: string;
  ticketUrl: string | null;
  ticketNumber: number;
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const preview =
    isShowUnverifiedEnv() ||
    isPreviewQuery({ preview: searchParams.get("preview") });

  if (dataVerified || preview) {
    return <>{children}</>;
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <p className="section-kicker">Coming soon</p>
        <h1 className="page-title">{leagueLabel}</h1>
        <p className="page-lead">
          Verified {leagueLabel} data is in progress. Ref profiles, crew splits,
          and analytics will appear here once real-source ingest ships
          {ticketUrl ? (
            <>
              {" "}
              (
              <a
                href={ticketUrl}
                className="font-medium text-zinc-800 hover:underline"
              >
                GitHub issue #{ticketNumber}
              </a>
              )
            </>
          ) : null}
          .
        </p>
      </section>

      <nav className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
        <Link href="/" className="site-footer-inline-link">
          NBA home →
        </Link>
        <Link href="/epl" className="site-footer-inline-link">
          EPL →
        </Link>
      </nav>
    </div>
  );
}

export function LeagueIngestGateClient({
  dataVerified,
  leagueLabel,
  ticketUrl,
  ticketNumber,
  children,
}: {
  dataVerified: boolean;
  leagueLabel: string;
  ticketUrl: string | null;
  ticketNumber: number;
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <LeagueIngestGateInner
        dataVerified={dataVerified}
        leagueLabel={leagueLabel}
        ticketUrl={ticketUrl}
        ticketNumber={ticketNumber}
      >
        {children}
      </LeagueIngestGateInner>
    </Suspense>
  );
}

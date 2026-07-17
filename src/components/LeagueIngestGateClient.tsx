"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LeagueIngestGateSkeleton } from "@/components/LayoutShiftSkeletons";
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
    isPreviewQuery({ preview: searchParams?.get("preview") });

  if (dataVerified || preview) {
    return <>{children}</>;
  }

  return (
    <div className="page-shell">
      <section className="page-hero max-w-2xl">
        <p className="section-kicker">Coming soon</p>
        <h1 className="page-title">{leagueLabel}</h1>
        <p className="page-lead">
          We&apos;re still building verified {leagueLabel} data. Ref profiles, crew splits, and
          analytics will appear here when it&apos;s ready
          {ticketUrl ? (
            <>
              {" "}
              (
              <a
                href={ticketUrl}
                className="font-medium text-zinc-800 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub issue #{ticketNumber}
              </a>
              )
            </>
          ) : null}
          .
        </p>
      </section>

      <nav className="mt-8">
        <Link href="/" className="site-footer-inline-link">
          Return to Ref Watch home →
        </Link>
      </nav>

      {process.env.NODE_ENV !== "production" || isShowUnverifiedEnv() ? (
        <p className="mt-6 max-w-2xl text-xs text-zinc-500">
          Dev preview: append{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5">?preview=1</code>{" "}
          to load preview {leagueLabel} data while we finish the real dataset.
        </p>
      ) : null}
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
  if (dataVerified) {
    return <>{children}</>;
  }

  return (
    <Suspense fallback={<LeagueIngestGateSkeleton leagueLabel={leagueLabel} />}>
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

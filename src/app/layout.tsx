import type { Metadata } from "next";
import { Barlow, IBM_Plex_Sans } from "next/font/google";
import { GamblingDisclaimer } from "@/components/GamblingDisclaimer";
import { JsonLd } from "@/components/JsonLd";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteFooterWrapper } from "@/components/SiteFooterWrapper";
import { SiteHeader } from "@/components/SiteHeader";
import { DEFAULT_SITE_DESCRIPTION, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { AFFILIATION_DISCLAIMER, SITE_NAME, SITE_URL } from "@/lib/site";
import { headers } from "next/headers";
import { assertProductionLeagueVerification } from "@/lib/production-verification-assert";
import { hydrateLeagueDataForPath } from "@/lib/server-data-hydrate";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Referee intelligence & crew analytics`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_SITE_DESCRIPTION,
  keywords: [
    "referee analytics",
    "NBA refs",
    "NHL officials",
    "NFL officials",
    "Premier League referees",
    "officiating tendencies",
    "referee crew",
  ],
  alternates: {
    types: {
      "application/rss+xml": [
        { url: "/feed/nba/rss", title: "Ref Watch NBA signals" },
        { url: "/feed/nhl/rss", title: "Ref Watch NHL signals" },
      ],
    },
  },
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_CA",
    title: `${SITE_NAME} | Referee intelligence & crew analytics`,
    description: DEFAULT_SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Referee intelligence & crew analytics`,
    description: DEFAULT_SITE_DESCRIPTION,
  },
  other: {
    disclaimer: AFFILIATION_DISCLAIMER,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = (await headers()).get("x-pathname") ?? "/";
  await hydrateLeagueDataForPath(pathname);
  assertProductionLeagueVerification();

  return (
    <html lang="en" className="dark">
      <body
        className={`${barlow.variable} ${plexSans.variable} flex min-h-screen flex-col bg-background text-foreground antialiased`}
      >
        <JsonLd data={[websiteJsonLd(), organizationJsonLd()]} />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooterWrapper
          nbaFooter={<SiteFooter league="nba" />}
          nhlFooter={<SiteFooter league="nhl" />}
          eplFooter={<SiteFooter league="epl" />}
          cbbFooter={<SiteFooter league="cbb" />}
          cfbFooter={<SiteFooter league="cfb" />}
        />
        <GamblingDisclaimer />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Inter, Space_Grotesk } from "next/font/google";
import { GamblingDisclaimer } from "@/components/GamblingDisclaimer";
import { JsonLd } from "@/components/JsonLd";
import { RoutedSiteFooter } from "@/components/RoutedSiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { A11Y_BLOCKING_SCRIPT } from "@/lib/a11y/a11yBootstrap";
import { DEFAULT_SITE_DESCRIPTION, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { AFFILIATION_DISCLAIMER, SITE_NAME, SITE_URL } from "@/lib/site";
import { headers } from "next/headers";
import { hydrateLeagueDataForPath } from "@/lib/server-data-hydrate";
import { assertProductionLeagueVerification } from "@/lib/production-verification-assert";
import { normalizeAppPathname } from "@/lib/json-asset-guards";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Referee analytics & crew history`,
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
    title: `${SITE_NAME} | Referee analytics & crew history`,
    description: DEFAULT_SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Referee analytics & crew history`,
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
  const pathname = normalizeAppPathname((await headers()).get("x-pathname"));
  await hydrateLeagueDataForPath(pathname);
  assertProductionLeagueVerification(pathname);

  return (
    <html lang="en" data-color="dark" data-theme="dark" data-contrast="default" data-text="default" className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: A11Y_BLOCKING_SCRIPT }}
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${atkinson.variable} flex min-h-screen flex-col bg-background text-foreground antialiased`}
      >
        <a href="#main-content" className="skip-to-main">
          Skip to content
        </a>
        <JsonLd data={[websiteJsonLd(), organizationJsonLd()]} />
        <SiteHeader />
        <main id="main-content" className="flex-1" tabIndex={-1}>
          {children}
        </main>
        <RoutedSiteFooter />
        <GamblingDisclaimer />
      </body>
    </html>
  );
}

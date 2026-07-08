import type { Metadata } from "next";
import { Barlow, IBM_Plex_Sans } from "next/font/google";
import { GamblingDisclaimer } from "@/components/GamblingDisclaimer";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteFooterWrapper } from "@/components/SiteFooterWrapper";
import { SiteHeader } from "@/components/SiteHeader";
import { AFFILIATION_DISCLAIMER, SITE_NAME, SITE_URL } from "@/lib/site";
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
  description:
    "Tonight's NBA and NHL referee crews with historical scoring, whistle, and officiating tendencies. Transparent methodology and confidence levels.",
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
    description:
      "Tonight's NBA and NHL referee crews with historical scoring, whistle, and officiating tendencies. Transparent methodology and confidence levels.",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Referee intelligence & crew analytics`,
    description:
      "Tonight's NBA and NHL referee crews with historical scoring, whistle, and officiating tendencies. Transparent methodology and confidence levels.",
  },
  other: {
    disclaimer: AFFILIATION_DISCLAIMER,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${barlow.variable} ${plexSans.variable} flex min-h-screen flex-col bg-background text-foreground antialiased`}
      >
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooterWrapper
          nbaFooter={<SiteFooter league="nba" />}
          nhlFooter={<SiteFooter league="nhl" />}
        />
        <GamblingDisclaimer />
      </body>
    </html>
  );
}

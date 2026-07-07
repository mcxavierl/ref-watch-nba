import type { Metadata } from "next";
import { IBM_Plex_Mono, Source_Sans_3 } from "next/font/google";
import { GamblingDisclaimer } from "@/components/GamblingDisclaimer";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ref Watch NBA — Referee crew analytics",
  description:
    "Tonight's NBA referee crews with O/U lean, foul trends, and Raptors-aware splits. Free nightly slate.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${sourceSans.variable} ${plexMono.variable} flex min-h-screen flex-col bg-background text-base leading-relaxed text-zinc-900 antialiased`}
      >
        <SiteHeader />
        <GamblingDisclaimer />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

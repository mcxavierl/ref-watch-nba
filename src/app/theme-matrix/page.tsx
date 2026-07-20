import type { Metadata } from "next";
import { WorldCupFinalSection } from "@/components/WorldCupFinalSection";

export const metadata: Metadata = {
  title: "Theme matrix audit fixture",
  robots: {
    index: false,
    follow: false,
  },
};

/** Internal fixture route for theme-matrix contrast screenshots. */
export default function ThemeMatrixFixturePage() {
  return (
    <div className="page-shell overview-shell overview-shell--clinical">
      <WorldCupFinalSection />
    </div>
  );
}

import { LiveHighlightsTicker } from "@/components/LiveHighlightsTicker";
import type { LiveHighlightTickerItem } from "@/lib/live-highlights-ticker";

type IntelligenceFeedTickerProps = {
  items: LiveHighlightTickerItem[];
};

export function IntelligenceFeedTicker({ items }: IntelligenceFeedTickerProps) {
  if (items.length === 0) return null;

  return (
    <section className="section-block-tight" aria-label="Live intelligence feed">
      <LiveHighlightsTicker items={items} />
    </section>
  );
}

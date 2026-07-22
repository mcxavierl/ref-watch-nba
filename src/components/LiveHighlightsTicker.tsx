"use client";

import { PrefetchLink } from "@/components/PrefetchLink";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Flame, TrendingDown, TrendingUp } from "lucide-react";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import type { LiveHighlightTickerItem } from "@/lib/live-highlights-ticker";
import type { LucideIcon } from "lucide-react";

type LiveHighlightsTickerProps = {
  items: LiveHighlightTickerItem[];
};

const SCROLL_DURATION_SEC = 36;

function iconForItem(item: LiveHighlightTickerItem): LucideIcon {
  if (item.kind === "ref-outlier") return Flame;
  if (item.tone === "negative") return TrendingDown;
  return TrendingUp;
}

function TickerChip({ item }: { item: LiveHighlightTickerItem }) {
  const Icon = iconForItem(item);
  const body = (
    <>
      <Icon className="live-highlights-ticker-icon" aria-hidden strokeWidth={2.1} />
      <span className="live-highlights-ticker-league">{item.leagueLabel}:</span>
      <span className="live-highlights-ticker-copy">{item.copy}</span>
    </>
  );

  if (item.href) {
    return (
      <PrefetchLink href={item.href} className="live-highlights-ticker-item rw-focus-ring">
        {body}
      </PrefetchLink>
    );
  }

  return <span className="live-highlights-ticker-item">{body}</span>;
}

export const LiveHighlightsTicker = memo(function LiveHighlightsTicker({
  items,
}: LiveHighlightsTickerProps) {
  const prefersReducedMotion = useReducedMotion();
  const controls = useAnimationControls();
  const [paused, setPaused] = useState(false);
  const loopItems = useMemo(() => [...items, ...items], [items]);

  const startScroll = useCallback(() => {
    if (prefersReducedMotion || items.length < 2) return;
    void controls.start({
      x: ["0%", "-50%"],
      transition: {
        repeat: Infinity,
        ease: "linear",
        duration: SCROLL_DURATION_SEC,
      },
    });
  }, [controls, items.length, prefersReducedMotion]);

  useEffect(() => {
    startScroll();
  }, [startScroll]);

  const handlePointerEnter = useCallback(() => {
    setPaused(true);
    controls.stop();
  }, [controls]);

  const handlePointerLeave = useCallback(() => {
    setPaused(false);
    startScroll();
  }, [controls, startScroll]);

  if (items.length === 0) return null;

  return (
    <section
      className="live-highlights-ticker"
      aria-label="Live whistle edge highlights"
      data-paused={paused ? "true" : "false"}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <div className="live-highlights-ticker-inner">
        {prefersReducedMotion || items.length === 1 ? (
          <div className="live-highlights-ticker-static">
            {items.map((item) => (
              <TickerChip key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <motion.div
            className="live-highlights-ticker-track"
            animate={controls}
            aria-hidden={false}
          >
            {loopItems.map((item, index) => (
              <TickerChip key={`${item.id}-${index}`} item={item} />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
});

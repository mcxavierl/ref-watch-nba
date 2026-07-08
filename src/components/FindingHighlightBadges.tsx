import type {
  FindingHighlight,
  FindingHighlightBar,
} from "@/lib/finding-highlights";

function toneClass(tone: FindingHighlight["tone"]): string {
  switch (tone) {
    case "over":
    case "positive":
      return "finding-highlight-badge-over";
    case "under":
    case "negative":
      return "finding-highlight-badge-under";
    default:
      return "finding-highlight-badge-neutral";
  }
}

function barToneClass(tone: FindingHighlightBar["tone"]): string {
  return tone === "over"
    ? "finding-highlight-bar-over"
    : tone === "under"
      ? "finding-highlight-bar-under"
      : "finding-highlight-bar-neutral";
}

function FindingHighlightBarScale({ highlight }: { highlight: FindingHighlightBar }) {
  const widthPct = Math.min(
    100,
    Math.round((highlight.magnitude / highlight.maxMagnitude) * 100),
  );

  return (
    <div className={`finding-highlight-bar ${barToneClass(highlight.tone)}`}>
      <span className="finding-highlight-bar-label">{highlight.label}</span>
      <span className="finding-highlight-bar-track" aria-hidden>
        <span
          className="finding-highlight-bar-fill"
          style={{ width: `${widthPct}%` }}
        />
      </span>
    </div>
  );
}

export function FindingHighlightBadges({
  highlights,
}: {
  highlights: FindingHighlight[];
}) {
  if (highlights.length === 0) return null;

  return (
    <div className="finding-highlight-row" aria-label="Key metrics">
      {highlights.map((highlight) => {
        if (highlight.kind === "bar") {
          return (
            <FindingHighlightBarScale
              key={`bar-${highlight.label}`}
              highlight={highlight}
            />
          );
        }

        return (
          <span
            key={`badge-${highlight.label}-${highlight.value}`}
            className={`finding-highlight-badge ${toneClass(highlight.tone)}`}
          >
            <span className="finding-highlight-badge-label">{highlight.label}</span>
            <span className="finding-highlight-badge-value">{highlight.value}</span>
          </span>
        );
      })}
    </div>
  );
}

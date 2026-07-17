import {
  formatWhistleIndex,
  whistleIndexCaption,
  whistleIndexVisualTone,
} from "@/lib/whistle-index";
import "@/components/whistle-index-gauge.css";

type WhistleIndexGaugeProps = {
  index: number;
  size?: "sm" | "md" | "lg";
  showCaption?: boolean;
  className?: string;
};

export function WhistleIndexGauge({
  index,
  size = "md",
  showCaption = true,
  className = "",
}: WhistleIndexGaugeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(index)));
  const visualTone = whistleIndexVisualTone(clamped);
  const caption = whistleIndexCaption(clamped);

  return (
    <div
      className={`whistle-index-gauge whistle-index-gauge--${size} ${className}`.trim()}
      data-whistle-index={clamped}
      data-whistle-visual-tone={visualTone}
      aria-label={`Whistle Index ${formatWhistleIndex(clamped)} out of 100. ${caption}.`}
    >
      <p className="whistle-index-gauge__label">
        Whistle Index<span aria-hidden>™</span>
      </p>

      <p className="whistle-index-gauge__value">{formatWhistleIndex(clamped)}</p>

      {showCaption ? (
        <p className="whistle-index-gauge__caption">{caption}</p>
      ) : null}

      <div className="whistle-index-gauge__scale" aria-hidden>
        <span className="whistle-index-gauge__scale-label">0</span>
        <div className="whistle-index-gauge__track">
          <div className="whistle-index-gauge__track-gradient" />
          <div className="whistle-index-gauge__track-neutral" />
          <div
            className={`whistle-index-gauge__fill whistle-index-gauge__fill--${visualTone}`}
            style={{ width: `${clamped}%` }}
          />
          <div className="whistle-index-gauge__center-line" />
          <div
            className={`whistle-index-gauge__marker whistle-index-gauge__marker--${visualTone}`}
            style={{ left: `${clamped}%` }}
          />
        </div>
        <span className="whistle-index-gauge__scale-label whistle-index-gauge__scale-label--max">
          100
        </span>
      </div>
    </div>
  );
}

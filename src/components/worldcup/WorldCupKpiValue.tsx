import type { FindingStat } from "@/lib/findings-shared";

export type WcKpiTone = "negative" | "positive" | "neutral" | "name";

const KPI_CLASS = "text-7xl font-black tabular-nums leading-none tracking-tight";

export function worldCupKpiTone(stat: FindingStat): WcKpiTone {
  const label = stat.label.toLowerCase();
  const value = stat.value.trim();

  if (
    label.includes("referee") ||
    label === "var" ||
    label.includes("2022 match") ||
    label.includes("last meeting") ||
    label.includes("fifa rank")
  ) {
    return "name";
  }

  if (
    label.includes("yellow") ||
    label.includes("red") ||
    label.includes("goals against") ||
    (label === "cards" && !value.includes("-"))
  ) {
    return "negative";
  }

  if (label.includes("comeback") || label.includes("extra-time")) {
    const n = Number.parseInt(value, 10);
    return n > 0 ? "positive" : "neutral";
  }

  if (label.includes("record")) {
    return "neutral";
  }

  if (label.includes("goals") && value.includes("-")) {
    return "neutral";
  }

  return "neutral";
}

function toneClass(tone: WcKpiTone): string {
  switch (tone) {
    case "negative":
      return "wc-kpi-negative";
    case "positive":
      return "wc-kpi-positive";
    case "name":
      return "wc-authority-value text-lg font-medium";
    default:
      return "wc-authority-value";
  }
}

/** Semantic KPI rendering with partial highlights for record and goals splits. */
export function WorldCupKpiValue({ stat, tone }: { stat: FindingStat; tone: WcKpiTone }) {
  const label = stat.label.toLowerCase();
  const value = stat.value.trim();

  if (tone === "name") {
    return <span className="wc-authority-value text-lg font-medium">{value}</span>;
  }

  if (label.includes("record")) {
    const match = value.match(/^(\d+W)(.*)$/);
    if (match) {
      return (
        <span className={`${KPI_CLASS} wc-authority-value`}>
          <span className="wc-kpi-positive">{match[1]}</span>
          {match[2]}
        </span>
      );
    }
  }

  if (label.includes("goals") && value.includes("-") && !label.includes("against")) {
    const dashIndex = value.indexOf("-");
    const forGoals = value.slice(0, dashIndex);
    const againstGoals = value.slice(dashIndex);
    return (
      <span className={`${KPI_CLASS} wc-authority-value`}>
        <span className="wc-kpi-positive">{forGoals}</span>
        {againstGoals}
      </span>
    );
  }

  return <span className={`${KPI_CLASS} ${toneClass(tone)}`}>{value}</span>;
}

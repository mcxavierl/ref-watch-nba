import { Clock, Shield, UserX } from "lucide-react";

const upcoming = [
  {
    icon: Clock,
    title: "Live tight-whistle gauge",
    status: "Planned",
    copy: "Halftime under value when a crew calls a tight first half but historically eases up in the second. Requires live play-by-play and half-by-half foul splits — not in the pipeline yet.",
  },
  {
    icon: UserX,
    title: "Player foul-trouble predictor",
    status: "Planned",
    copy: "Match ref whistle rates to player foul averages for props on minutes and points. Requires a player × ref aggregation layer — team-level data only today.",
  },
  {
    icon: Shield,
    title: "ATS ROI heatmap",
    status: "Blocked",
    copy: "Spread-backed home/away ROI needs historical closing lines. We show home/road win-rate bias as an honest proxy until spreads are ingested.",
  },
];

export function FeatureRoadmap() {
  return (
    <section className="panel-inset mb-10 px-5 py-4">
      <h2 className="text-sm font-semibold text-zinc-800">Coming next</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Built in priority order — only shipped when the underlying data exists.
      </p>
      <ul className="mt-4 space-y-3">
        {upcoming.map((item) => {
          const Icon = item.icon;
          return (
            <li
              key={item.title}
              className="flex gap-3 rounded-lg border border-border bg-white px-3 py-3"
            >
              <Icon
                className="mt-0.5 size-4 shrink-0 text-zinc-400"
                aria-hidden
              />
              <div>
                <p className="text-sm font-medium text-zinc-900">
                  {item.title}{" "}
                  <span className="font-normal text-zinc-500">
                    — {item.status}
                  </span>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                  {item.copy}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

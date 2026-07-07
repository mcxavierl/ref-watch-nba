import Link from "next/link";
import {
  Flame,
  Scale,
  Swords,
  TrendingDown,
  TrendingUp,
  Users,
  Volume2,
} from "lucide-react";
import type { GrudgeStoryline, GrudgeStorylineKind } from "@/lib/grudge-match";
import { StatCell, StatStrip } from "@/components/StatStrip";

const kindMeta: Record<
  GrudgeStorylineKind,
  { icon: typeof Swords; tone: string; label: string }
> = {
  "win-rate-curse": {
    icon: TrendingDown,
    tone: "text-rose-700 bg-rose-50 border-rose-200",
    label: "Win-rate curse",
  },
  "win-rate-boost": {
    icon: TrendingUp,
    tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
    label: "Win-rate boost",
  },
  "foul-spike": {
    icon: Volume2,
    tone: "text-amber-800 bg-amber-50 border-amber-200",
    label: "Whistle spike",
  },
  "foul-relief": {
    icon: Volume2,
    tone: "text-sky-700 bg-sky-50 border-sky-200",
    label: "Whistle relief",
  },
  "foul-edge-paradox": {
    icon: Scale,
    tone: "text-violet-700 bg-violet-50 border-violet-200",
    label: "Foul paradox",
  },
  "scoring-hot": {
    icon: Flame,
    tone: "text-orange-700 bg-orange-50 border-orange-200",
    label: "Hot totals",
  },
  "scoring-cold": {
    icon: TrendingDown,
    tone: "text-sky-700 bg-sky-50 border-sky-200",
    label: "Cold totals",
  },
  "crew-reunion": {
    icon: Users,
    tone: "text-zinc-700 bg-zinc-50 border-zinc-200",
    label: "Crew reunion",
  },
  "ref-split": {
    icon: Swords,
    tone: "text-raptors bg-red-50 border-red-200",
    label: "Split whistle",
  },
};

function StorylineCard({ story }: { story: GrudgeStoryline }) {
  const meta = kindMeta[story.kind];
  const Icon = meta.icon;

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="border-b border-border-subtle px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-start gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.tone}`}
          >
            <Icon className="size-3.5" aria-hidden />
            {meta.label}
          </span>
        </div>
        <h3 className="mt-2 text-base font-semibold leading-snug text-zinc-900">
          {story.headline}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          {story.summary}
        </p>
      </div>

      {story.stats.length > 0 && (
        <StatStrip>
          {story.stats.map((stat) => (
            <StatCell
              key={stat.label}
              label={stat.label}
              value={stat.value}
              detail={stat.detail}
            />
          ))}
        </StatStrip>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border-subtle px-4 py-3 sm:px-5">
        <p className="text-sm text-zinc-500">{story.sampleNote}</p>
        {story.links.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {story.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:underline"
              >
                {link.label} →
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export function GrudgeMatchSection({
  storylines,
  isPreview = false,
}: {
  storylines: GrudgeStoryline[];
  isPreview?: boolean;
}) {
  if (storylines.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex flex-wrap items-center gap-2">
        <Swords className="size-5 text-raptors" aria-hidden />
        <h2 className="text-base font-semibold text-zinc-800">
          Grudge match radar
        </h2>
        {isPreview && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
            Offseason preview
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-zinc-600">
        Automated ref–team storylines for tonight&apos;s slate — win-rate
        outliers, foul spikes, crew reunions, and split whistles. Player-specific
        history (e.g. star vs ref) is not in this dataset yet.
      </p>
      <div className="mt-4 space-y-3">
        {storylines.map((story) => (
          <StorylineCard key={story.id} story={story} />
        ))}
      </div>
    </section>
  );
}

export function GameGrudgeStorylines({
  storylines,
}: {
  storylines: GrudgeStoryline[];
}) {
  if (storylines.length === 0) return null;

  return (
    <div className="border-t border-border-subtle bg-zinc-50/60 px-4 py-4 sm:px-5">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-800">
        <Swords className="size-4 text-raptors" aria-hidden />
        Grudge match flags
      </p>
      <ul className="space-y-3">
        {storylines.map((story) => (
          <li
            key={story.id}
            className="rounded-md border border-border bg-white px-3 py-3"
          >
            <p className="text-sm font-medium leading-snug text-zinc-900">
              {story.headline}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600">
              {story.summary}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

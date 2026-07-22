export function IntelligenceHero() {
  return (
    <header
      className="overview-hero-polished overview-hero-minimal section-block"
      aria-labelledby="intelligence-hero-heading"
    >
      <div className="overview-hero-ambient-glow" aria-hidden />
      <div className="overview-hero-polished-stack">
        <p className="overview-hero-kicker text-xs font-mono tracking-wider text-emerald-400">
          ● DAILY INTELLIGENCE TERMINAL
        </p>
        <h1 className="overview-hero-headline" id="intelligence-hero-heading">
          Officiating Intelligence
        </h1>
        <p className="overview-hero-subtitle">
          Real-time referee analytics, crew bias modeling, and game slate intelligence across 7
          leagues.
        </p>
      </div>
    </header>
  );
}

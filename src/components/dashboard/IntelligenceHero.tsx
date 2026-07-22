export function IntelligenceHero() {
  return (
    <header
      className="overview-hero-polished overview-hero-minimal section-block"
      aria-labelledby="intelligence-hero-heading"
    >
      <div
        className="absolute -top-16 -left-16 w-full max-w-2xl h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden
      />
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

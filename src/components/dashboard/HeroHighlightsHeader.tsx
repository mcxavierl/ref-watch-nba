export function HeroHighlightsHeader({
  title = "Top highlights",
  lead = "Recent high-confidence patterns",
}: {
  title?: string;
  lead?: string;
}) {
  return (
    <header className="hero-highlights-header">
      <h2 className="hero-highlights-title">{title}</h2>
      {lead ? <p className="hero-highlights-lead">{lead}</p> : null}
    </header>
  );
}

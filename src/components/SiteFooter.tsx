export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface-raised">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6">
        <div>
          <p className="text-xs font-semibold text-zinc-700">
            Responsible gambling
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600">
            Informational use only. Past referee trends do not guarantee future
            results. Set limits and seek help if needed —{" "}
            <a
              href="https://www.connexontario.ca/"
              className="font-medium text-raptors underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              ConnexOntario 1-866-531-2600
            </a>
            .
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-700">Sources</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600">
            Not affiliated with the NBA. Assignments from{" "}
            <a
              href="https://official.nba.com/referee-assignments/"
              className="font-medium text-zinc-700 underline-offset-2 hover:text-zinc-900 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              official.nba.com
            </a>
            . Methodology in README.
          </p>
        </div>
      </div>
    </footer>
  );
}

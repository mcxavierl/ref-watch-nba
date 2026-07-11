import {
  MAINTENANCE_FEATURES,
  MAINTENANCE_RETURN_LABEL,
} from "@/lib/maintenance";

export function SiteMaintenance() {
  return (
    <div className="page-shell flex min-h-[calc(100vh-12rem)] items-center">
      <section className="page-hero mx-auto max-w-2xl text-center">
        <p className="section-kicker">Upgrading the dataset</p>
        <h1 className="page-title text-balance tracking-tight">
          Ref Watch will be back {MAINTENANCE_RETURN_LABEL}
        </h1>
        <p className="page-lead mx-auto max-w-xl text-balance">
          We&apos;re rebuilding referee analytics with a full decade of verified
          game logs, richer whistle splits, and a faster experience behind the
          scenes. Thanks for your patience.
        </p>

        <aside
          className="pro-tease-callout mx-auto mt-10 max-w-lg text-left"
          aria-label="What's coming"
        >
          <div className="pro-tease-callout-inner">
            <p className="pro-tease-callout-kicker">On the way</p>
            <p className="pro-tease-callout-title">More depth, same sample gates</p>
            <ul className="pro-tease-features mt-4 space-y-2 text-sm text-muted-foreground">
              {MAINTENANCE_FEATURES.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        </aside>
      </section>
    </div>
  );
}

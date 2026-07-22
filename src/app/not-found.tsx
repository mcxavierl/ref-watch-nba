import { headers } from "next/headers";
import Link from "next/link";

function logMissingPath(pathname: string): void {
  const payload = {
    path: pathname,
    ts: new Date().toISOString(),
  };
  console.warn("[refwatch:404]", JSON.stringify(payload));
}

export default async function NotFound() {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-pathname") ?? "unknown";
  logMissingPath(pathname);

  return (
    <div className="page-shell overview-shell overview-shell--clinical">
      <section className="overview-editorial-section section-block" role="alert">
        <h1 className="overview-section-title">Page not found</h1>
        <p className="overview-section-lead">
          RefWatch could not find a page at this address. The link may be outdated or
          the URL may have changed during a recent site update.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className="btn-primary">
            Back to home
          </Link>
          <Link href="/compare" className="btn-secondary">
            Compare officials
          </Link>
        </div>
      </section>
    </div>
  );
}

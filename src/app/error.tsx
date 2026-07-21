"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("App route error", error);
    }
  }, [error]);

  return (
    <div className="page-shell overview-shell overview-shell--clinical">
      <section className="overview-editorial-section section-block" role="alert">
        <h1 className="overview-section-title">Something went wrong</h1>
        <p className="overview-section-lead">
          RefWatch hit an unexpected error while loading this page. Try refreshing, or
          return to the dashboard.
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-primary" onClick={() => reset()}>
            Try again
          </button>
          <a href="/" className="btn-secondary">
            Back to home
          </a>
        </div>
      </section>
    </div>
  );
}

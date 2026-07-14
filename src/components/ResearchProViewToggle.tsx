"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function ResearchProViewToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPro = searchParams.get("pro") === "1";

  const toggle = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (isPro) params.delete("pro");
    else params.set("pro", "1");
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  };

  return (
    <div className="research-pro-toggle" role="group" aria-label="Research view mode">
      <button
        type="button"
        className={`research-pro-toggle-btn${!isPro ? " research-pro-toggle-btn-active" : ""}`}
        aria-pressed={!isPro}
        onClick={() => {
          if (isPro) toggle();
        }}
      >
        Standard
      </button>
      <button
        type="button"
        className={`research-pro-toggle-btn${isPro ? " research-pro-toggle-btn-active" : ""}`}
        aria-pressed={isPro}
        onClick={() => {
          if (!isPro) toggle();
        }}
      >
        Pro
      </button>
    </div>
  );
}

export function useResearchProView(): boolean {
  const searchParams = useSearchParams();
  return searchParams.get("pro") === "1";
}

import Link from "next/link";
import { RefSearch } from "./RefSearch";
import { SiteNav } from "./SiteNav";
import { formatRefStatsRange, getRefIndex, getRefStats } from "@/lib/data";

export function SiteHeader() {
  const refStats = getRefStats();
  const refs = getRefIndex();
  const refCount = refStats.meta.refCount ?? refs.length;
  const dateRange = formatRefStatsRange(refStats.meta);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="group flex shrink-0 items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-raptors text-[10px] font-bold tracking-tight text-white">
              RW
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight text-zinc-900">
                Ref Watch
              </p>
              <p className="text-[11px] text-zinc-500">NBA crew analytics</p>
            </div>
          </Link>
          <SiteNav />
        </div>
        <div className="mt-3 pb-1">
          <RefSearch refs={refs} refCount={refCount} dateRange={dateRange} />
        </div>
      </div>
    </header>
  );
}

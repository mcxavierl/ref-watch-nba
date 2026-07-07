import Link from "next/link";
import { SiteNav } from "./SiteNav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-3">
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
    </header>
  );
}

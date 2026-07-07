import Link from "next/link";
import { ScanEye, Sparkles } from "lucide-react";
import { SiteNav } from "./SiteNav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-white/95 shadow-[0_1px_0_rgba(200,16,46,0.12)] backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-3 rounded-lg outline-offset-4 transition hover:opacity-95"
        >
          <span className="relative flex size-9 items-center justify-center rounded-lg bg-raptors text-white shadow-md shadow-raptors/20 transition duration-300 ease-out group-hover:scale-[1.03] group-hover:shadow-lg group-hover:shadow-raptors/25 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
            <ScanEye
              className="size-[18px] transition duration-300 ease-out group-hover:rotate-[-4deg] motion-reduce:transition-none motion-reduce:group-hover:rotate-0"
              strokeWidth={2.25}
              aria-hidden
            />
            <span
              className="pointer-events-none absolute -right-0.5 -top-0.5 size-2 rounded-full bg-lakers-gold ring-2 ring-white"
              aria-hidden
            />
          </span>
          <div className="leading-tight">
            <p className="flex items-center gap-1.5 text-base font-semibold tracking-tight text-zinc-900">
              Ref Watch
              <Sparkles
                className="size-3.5 text-raptors opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:opacity-0"
                aria-hidden
              />
            </p>
            <p className="text-sm text-zinc-600">Tonight&apos;s crews, historical trends</p>
          </div>
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}

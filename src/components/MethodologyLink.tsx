import { SiteNavLink as Link } from "@/components/SiteNavLink";
import { METHODOLOGY_NAV_LABEL } from "@/lib/trust-charter";

export function MethodologyLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/methodology"
      className={`methodology-inline-link ${className}`.trim()}
    >
      {METHODOLOGY_NAV_LABEL}
    </Link>
  );
}

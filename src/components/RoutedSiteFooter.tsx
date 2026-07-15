import { SiteFooter } from "@/components/SiteFooter";

/** Client-routed footer: pathname resolves after hydration on static league pages. */
export function RoutedSiteFooter() {
  return <SiteFooter />;
}

import { dashboardOgContent, parseOgLeagueId } from "@/lib/og-hero";
import {
  ogImageContentType,
  ogImageSize,
  renderDashboardOgImage,
} from "@/lib/og-image";
export const alt = "Ref Watch - multi-league referee analytics and historical tendencies";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function OpenGraphImage({
  searchParams,
}: {
  searchParams?: Promise<{ leagueId?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const focusLeagueId = parseOgLeagueId(params?.leagueId);
  return renderDashboardOgImage(dashboardOgContent(focusLeagueId));
}

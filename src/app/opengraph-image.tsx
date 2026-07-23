import { dashboardOgContent, parseOgLeagueId } from "@/lib/og-hero";
import {
  ogImageContentType,
  ogImageSize,
  renderDashboardOgImage,
} from "@/lib/og-image";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME} - ${SITE_TAGLINE}`;
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

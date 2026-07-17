import { brandOgContent } from "@/lib/og-brand";
import { ogImageContentType, ogImageSize, renderBrandOgImage } from "@/lib/og-image";

export const alt = "Ref Watch - multi-league referee analytics and historical tendencies";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function OpenGraphImage() {
  return renderBrandOgImage(brandOgContent());
}

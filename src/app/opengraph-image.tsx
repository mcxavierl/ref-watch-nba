import { brandOgContent } from "@/lib/og-brand";
import { ogImageContentType, ogImageSize, renderBrandOgImage } from "@/lib/og-image";

export const alt = "Ref Watch — multi-league referee analytics and crew history";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default function OpenGraphImage() {
  return renderBrandOgImage(brandOgContent());
}

import { cbbOgContent } from "@/lib/og-slate";
import { ogImageContentType, ogImageSize, renderSlateOgImage } from "@/lib/og-image";

export const alt = "Ref Watch CBB nightly slate signals";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default function OpenGraphImage() {
  return renderSlateOgImage(cbbOgContent());
}

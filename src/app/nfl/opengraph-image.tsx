import { nflOgContent } from "@/lib/og-slate";
import { ogImageContentType, ogImageSize, renderSlateOgImage } from "@/lib/og-image";

export const alt = "Ref Watch NFL nightly slate signals";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default function OpenGraphImage() {
  return renderSlateOgImage(nflOgContent());
}

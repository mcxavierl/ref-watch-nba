import { cbbHubOgContent } from "@/lib/og-hub";
import { ogImageContentType, ogImageSize, renderHubOgImage } from "@/lib/og-image";

export const alt = "Ref Watch college basketball referee analytics hub";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default function OpenGraphImage() {
  return renderHubOgImage(cbbHubOgContent());
}

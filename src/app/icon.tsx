import { renderWhistleIcon } from "@/lib/brand-icon-image";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return renderWhistleIcon(32);
}

import { permanentRedirect } from "next/navigation";
import { SITE_HOME_PATH } from "@/lib/leagues";

export default function OverviewRedirectPage() {
  permanentRedirect(SITE_HOME_PATH);
}

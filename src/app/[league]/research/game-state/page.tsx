import { createResearchViewPage } from "@/lib/research-route-page";

const page = createResearchViewPage("game-state");
export const generateMetadata = page.generateMetadata;
export default page.default;

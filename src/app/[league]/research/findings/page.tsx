import { createResearchViewPage } from "@/lib/research-route-page";

const page = createResearchViewPage("findings");
export const generateMetadata = page.generateMetadata;
export default page.default;

import { createResearchViewPage } from "@/lib/research-route-page";

const page = createResearchViewPage("trends");
export const generateMetadata = page.generateMetadata;
export default page.default;

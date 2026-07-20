import { createResearchViewPage, createTendenciesPage } from "@/lib/research-route-page";

const page = createTendenciesPage();
export const generateMetadata = page.generateMetadata;
export default page.default;

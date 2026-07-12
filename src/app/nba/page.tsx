import { generateNbaSlateMetadata, NbaSlatePage } from "@/components/NbaSlatePage";

export async function generateMetadata() {
  return generateNbaSlateMetadata();
}

export default NbaSlatePage;

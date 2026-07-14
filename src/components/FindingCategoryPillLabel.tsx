import { AudioLines, UserRoundSearch, type LucideIcon } from "lucide-react";
import {
  FINDING_CATEGORY_LABELS,
  type FindingCategory,
} from "@/lib/findings-shared";

const CATEGORY_ICONS: Partial<Record<FindingCategory, LucideIcon>> = {
  "whistle-extreme": AudioLines,
  "ref-outlier": UserRoundSearch,
};

export function FindingCategoryPillLabel({
  category,
}: {
  category: FindingCategory;
}) {
  const Icon = CATEGORY_ICONS[category];
  const label = FINDING_CATEGORY_LABELS[category];

  return (
    <span className="finding-meta-pill-label">
      {Icon ? <Icon className="finding-meta-pill-icon" aria-hidden /> : null}
      {label}
    </span>
  );
}

import { createLucideIcon } from "lucide-react";

/** Lucide-style whistle (upstream icon not yet in lucide-react@1.23). */
export const Whistle = createLucideIcon("Whistle", [
  ["path", { d: "M10 6v4", key: "mouthpiece" }],
  [
    "path",
    {
      d: "M21 6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-5.675A7 7 0 1 1 9 6z",
      key: "body",
    },
  ],
]);

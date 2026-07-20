import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

const DISALLOWED = [
  "/api/",
  "/ncaa/integrity-audit",
  "/partners",
  "/theme-matrix",
];

const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "PerplexityBot",
  "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  const defaultRule = {
    userAgent: "*",
    allow: "/",
    disallow: DISALLOWED,
  };

  const aiRules = AI_CRAWLERS.map((userAgent) => ({
    userAgent,
    allow: "/",
    disallow: DISALLOWED,
  }));

  return {
    rules: [defaultRule, ...aiRules],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/").replace(/\/$/, ""),
  };
}

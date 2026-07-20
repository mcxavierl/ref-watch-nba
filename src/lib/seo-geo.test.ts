import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildLlmsTxt } from "@/lib/llms-txt";
import { REFWATCH_GEO_FAQ } from "@/lib/geo-faq";
import { buildSitemapEntries } from "@/lib/sitemap-data";
import { faqPageJsonLd } from "@/lib/seo";

describe("SEO and GEO guardrails", () => {
  it("sitemap includes homepage, about, La Liga, WNBA, and canonical research hubs", () => {
    const urls = buildSitemapEntries().map((entry) => entry.url);
    assert.ok(urls.some((url) => url.endsWith("/")));
    assert.ok(urls.some((url) => url.endsWith("/about")));
    assert.ok(urls.some((url) => url.includes("/laliga")));
    assert.ok(urls.some((url) => url.includes("/wnba")));
    assert.ok(urls.some((url) => url.includes("/nba/research/tendencies")));
    assert.ok(urls.some((url) => url.endsWith("/research/validation")));
    assert.ok(!urls.some((url) => url.endsWith("/partners")));
    assert.ok(!urls.some((url) => url.includes("/nba/insights")));
  });

  it("llms.txt documents feeds, methodology, and citation guidance", () => {
    const body = buildLlmsTxt();
    assert.match(body, /refwatch\.ca\/methodology/);
    assert.match(body, /\/feed\/nba\/json/);
    assert.match(body, /Cite as Ref Watch/);
    assert.match(body, /La Liga/);
  });

  it("FAQ schema includes core GEO questions", () => {
    const schema = faqPageJsonLd(REFWATCH_GEO_FAQ) as {
      mainEntity: Array<{ name: string }>;
    };
    const questions = schema.mainEntity.map((item) => item.name);
    assert.ok(questions.some((q) => q.includes("What is Ref Watch")));
    assert.ok(questions.some((q) => q.includes("betting advice")));
  });

  it("robots allows AI crawlers and points to sitemap", () => {
    const robots = readFileSync("src/app/robots.ts", "utf8");
    assert.match(robots, /GPTBot/);
    assert.match(robots, /ClaudeBot/);
    assert.match(robots, /sitemap/);
  });

  it("llms.txt route is wired", () => {
    const route = readFileSync("src/app/llms.txt/route.ts", "utf8");
    assert.match(route, /buildLlmsTxt/);
  });

  it("about page renders FAQ for crawlers", () => {
    const about = readFileSync("src/app/about/page.tsx", "utf8");
    assert.match(about, /REFWATCH_GEO_FAQ/);
    assert.match(about, /faqPageJsonLd/);
  });
});

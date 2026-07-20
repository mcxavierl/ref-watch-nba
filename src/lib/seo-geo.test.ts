import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildLlmsTxt } from "@/lib/llms-txt";
import { REFWATCH_GEO_FAQ } from "@/lib/geo-faq";
import { buildSitemapEntries } from "@/lib/sitemap-data";
import {
  faqPageJsonLd,
  homepageWebPageJsonLd,
  refProfilePersonJsonLd,
  teamProfileSportsTeamJsonLd,
  techArticleJsonLd,
} from "@/lib/seo";

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

  it("homepage emits WebPage structured data", () => {
    const home = readFileSync("src/app/page.tsx", "utf8");
    assert.match(home, /homepageWebPageJsonLd/);
    const schema = homepageWebPageJsonLd() as { "@type": string; url: string };
    assert.equal(schema["@type"], "WebPage");
    assert.match(schema.url, /refwatch\.ca\/?$/);
  });

  it("ref profiles emit Person structured data", () => {
    const nbaRef = readFileSync("src/lib/league-pages/nba-ref-profile.tsx", "utf8");
    assert.match(nbaRef, /RefProfileJsonLd/);
    const schema = refProfilePersonJsonLd({
      leagueId: "nba",
      name: "Scott Foster",
      slug: "scott-foster",
      number: 48,
    }) as { "@type": string; jobTitle: string; url: string };
    assert.equal(schema["@type"], "Person");
    assert.equal(schema.jobTitle, "Referee");
    assert.match(schema.url, /\/nba\/refs\/scott-foster/);
  });

  it("team profiles emit SportsTeam structured data", () => {
    const teamPage = readFileSync("src/components/TeamCrewPage.tsx", "utf8");
    assert.match(teamPage, /TeamProfileJsonLd/);
    const schema = teamProfileSportsTeamJsonLd("nba", "Boston Celtics", "BOS") as {
      "@type": string;
      name: string;
      url: string;
    };
    assert.equal(schema["@type"], "SportsTeam");
    assert.equal(schema.name, "Boston Celtics");
    assert.match(schema.url, /\/nba\/teams\/BOS/);
  });

  it("research articles emit TechArticle structured data", () => {
    const article = readFileSync("src/components/ResearchArticlePage.tsx", "utf8");
    assert.match(article, /techArticleJsonLd/);
    const validation = readFileSync("src/app/research/validation/page.tsx", "utf8");
    assert.match(validation, /techArticleJsonLd/);
    const schema = techArticleJsonLd({
      headline: "Closing-line validation",
      description: "Walk-forward backtest results.",
      path: "/research/validation",
    }) as { "@type": string; headline: string };
    assert.equal(schema["@type"], "TechArticle");
    assert.equal(schema.headline, "Closing-line validation");
  });
});

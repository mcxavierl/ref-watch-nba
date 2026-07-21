#!/usr/bin/env npx tsx
/**
 * Guardrail: enterprise API route handlers must use withEnterpriseApi param generics
 * compatible with Next.js 15 App Router route context typing.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const API_ROOT = path.join(process.cwd(), "src/app/api/v1");

type RouteIssue = {
  file: string;
  message: string;
};

function walkRoutes(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkRoutes(full, out);
    } else if (entry.name === "route.ts") {
      out.push(full);
    }
  }
  return out;
}

function dynamicParamNames(routeFile: string): string[] {
  const relative = path.relative(API_ROOT, routeFile).replace(/\\/g, "/");
  const segments = relative.split("/").filter((segment) => segment !== "route.ts");
  return segments
    .filter((segment) => segment.startsWith("[") && segment.endsWith("]"))
    .map((segment) => segment.slice(1, -1));
}

function auditRoute(routeFile: string): RouteIssue[] {
  const source = fs.readFileSync(routeFile, "utf8");
  const relative = path.relative(process.cwd(), routeFile).replace(/\\/g, "/");
  const issues: RouteIssue[] = [];

  if (!source.includes("withEnterpriseApi")) {
    return issues;
  }

  if (source.includes("params: Promise<")) {
    issues.push({
      file: relative,
      message:
        "Use withEnterpriseApi<{ paramName: string }> instead of wrapping params in Promise<> (middleware adds params).",
    });
  }

  const genericMatch = source.match(/withEnterpriseApi<\s*([^>]+)\s*>/);
  const dynamicParams = dynamicParamNames(routeFile);

  if (dynamicParams.length > 0) {
    if (!genericMatch) {
      issues.push({
        file: relative,
        message: `Dynamic route must declare withEnterpriseApi<{ ${dynamicParams.join(", ")} }>.`,
      });
      return issues;
    }

    for (const param of dynamicParams) {
      const pattern = new RegExp(`\\b${param}\\s*:\\s*string\\b`);
      if (!pattern.test(genericMatch[1]!)) {
        issues.push({
          file: relative,
          message: `Generic params must include ${param}: string.`,
        });
      }
    }
  } else if (genericMatch) {
    issues.push({
      file: relative,
      message: "Static route should omit withEnterpriseApi generic params.",
    });
  }

  return issues;
}

function main(): void {
  if (!fs.existsSync(API_ROOT)) {
    console.log("check-enterprise-api-routes: skipped (no /api/v1 tree)");
    return;
  }

  const issues = walkRoutes(API_ROOT).flatMap(auditRoute);
  if (issues.length > 0) {
    console.error("check-enterprise-api-routes FAILED:\n");
    for (const issue of issues) {
      console.error(`- ${issue.file}: ${issue.message}`);
    }
    process.exit(1);
  }

  console.log("check-enterprise-api-routes: OK");
}

main();

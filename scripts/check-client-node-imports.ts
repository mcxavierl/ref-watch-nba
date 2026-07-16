#!/usr/bin/env npx tsx
/**
 * Fails CI when a "use client" module (or its imports) reaches Node built-ins.
 * Catches regressions like VerifiedGamesHint → game-count → data → node:fs.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

const NODE_SPECIFIERS = new Set([
  "fs",
  "fs/promises",
  "path",
  "child_process",
  "crypto",
  "os",
  "node:fs",
  "node:fs/promises",
  "node:path",
  "node:child_process",
  "node:crypto",
  "node:os",
  "node:readline",
  "node:stream",
  "node:util",
]);

type FileInfo = {
  abs: string;
  rel: string;
  source: string;
  isClientRoot: boolean;
  isServerMarked: boolean;
  isServerTainted: boolean;
  imports: string[];
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function hasUseDirective(source: string, directive: "use client" | "use server"): boolean {
  for (const line of source.split("\n").slice(0, 12)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) continue;
    if (trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;
    return trimmed === `"${directive}";` || trimmed === `'${directive}';` || trimmed === `"${directive}"` || trimmed === `'${directive}'`;
  }
  return false;
}

function parseValueImports(source: string): string[] {
  const specs = new Set<string>();

  for (const match of source.matchAll(
    /^\s*import\s+(?!type\b)([\s\S]*?\sfrom\s+["']([^"']+)["'])/gm,
  )) {
    specs.add(match[2]!);
  }

  for (const match of source.matchAll(/^\s*import\s+["']([^"']+)["']/gm)) {
    specs.add(match[1]!);
  }

  for (const match of source.matchAll(
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  )) {
    specs.add(match[1]!);
  }

  return [...specs];
}

function isNodeSpecifier(spec: string): boolean {
  if (NODE_SPECIFIERS.has(spec)) return true;
  return spec.startsWith("node:");
}

function resolveImport(
  graph: Map<string, FileInfo>,
  fromAbs: string,
  spec: string,
): string | null {
  if (!spec.startsWith(".") && !spec.startsWith("@/")) return null;

  const base = spec.startsWith("@/")
    ? path.join(SRC, spec.slice(2))
    : path.resolve(path.dirname(fromAbs), spec);

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];

  for (const candidate of candidates) {
    if (graph.has(candidate)) return candidate;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function buildGraph(): Map<string, FileInfo> {
  const graph = new Map<string, FileInfo>();

  for (const abs of walk(SRC)) {
    const rel = path.relative(ROOT, abs);
    const source = fs.readFileSync(abs, "utf8");
    const isClientRoot = hasUseDirective(source, "use client");
    const isServerMarked = hasUseDirective(source, "use server");
    const directNodeImport = parseValueImports(source).some(isNodeSpecifier);
    const usesServerOnly = /\bfrom\s+["']server-only["']/.test(source);

    graph.set(abs, {
      abs,
      rel,
      source,
      isClientRoot,
      isServerMarked,
      isServerTainted: isServerMarked || directNodeImport || usesServerOnly,
      imports: parseValueImports(source),
    });
  }

  return graph;
}

export type ClientNodeImportViolation = {
  clientEntry: string;
  taintedModule: string;
  chain: string[];
};

export function findClientNodeImportViolations(
  graph: Map<string, FileInfo>,
): ClientNodeImportViolation[] {
  const violations: ClientNodeImportViolation[] = [];
  const seenReports = new Set<string>();

  for (const file of graph.values()) {
    if (!file.isClientRoot) continue;

    const queue: { abs: string; chain: string[] }[] = [{ abs: file.abs, chain: [file.rel] }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.abs)) continue;
      visited.add(current.abs);

      const node = graph.get(current.abs);
      if (!node) continue;

      if (node.isServerTainted && current.abs !== file.abs) {
        const key = `${file.rel}=>${node.rel}`;
        if (!seenReports.has(key)) {
          seenReports.add(key);
          violations.push({
            clientEntry: file.rel,
            taintedModule: node.rel,
            chain: current.chain,
          });
        }
        continue;
      }

      for (const spec of node.imports) {
        if (isNodeSpecifier(spec)) {
          const key = `${file.rel}=>node:${spec}`;
          if (!seenReports.has(key)) {
            seenReports.add(key);
            violations.push({
              clientEntry: file.rel,
              taintedModule: spec,
              chain: [...current.chain, `(node import ${spec})`],
            });
          }
          continue;
        }

        const resolved = resolveImport(graph, node.abs, spec);
        if (resolved && graph.has(resolved)) {
          queue.push({
            abs: resolved,
            chain: [...current.chain, graph.get(resolved)!.rel],
          });
        }
      }
    }
  }

  return violations;
}

function main(): void {
  const graph = buildGraph();
  const clientRoots = [...graph.values()].filter((file) => file.isClientRoot).length;
  const violations = findClientNodeImportViolations(graph);

  if (violations.length > 0) {
    console.error("Client Node import check FAILED:\n");
    for (const violation of violations) {
      console.error(`  ${violation.clientEntry}`);
      console.error(`    → ${violation.taintedModule}`);
      console.error(`    chain: ${violation.chain.join(" → ")}`);
      console.error("");
    }
    console.error(
      `${violations.length} issue(s). Client components must not import Node built-ins (node:fs, etc.). Split shared helpers into browser-safe modules.`,
    );
    process.exit(1);
  }

  console.log(
    `Client Node import check passed (${clientRoots} client roots scanned, no node: imports in client graph).`,
  );
}

if (import.meta.url.startsWith("file:")) {
  const executed = path.resolve(process.argv[1] ?? "");
  const modulePath = path.resolve(new URL(import.meta.url).pathname);
  if (executed === modulePath) {
    main();
  }
}

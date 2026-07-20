import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import postcss from "postcss";

const ROOT = join(process.cwd(), "src");

function collectCssFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      collectCssFiles(path, out);
    } else if (entry.endsWith(".css")) {
      out.push(path);
    }
  }
  return out;
}

function checkFile(path: string): void {
  const rel = relative(process.cwd(), path);
  const source = readFileSync(path, "utf8");
  try {
    postcss.parse(source, { from: rel });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`CSS syntax error in ${rel}: ${message}`);
  }
}

function main(): void {
  const files = collectCssFiles(ROOT).sort();
  for (const file of files) {
    checkFile(file);
  }
  console.log(`check-css-syntax: OK (${files.length} files)`);
}

main();

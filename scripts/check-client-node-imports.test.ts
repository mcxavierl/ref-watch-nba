import assert from "node:assert/strict";
import * as path from "node:path";
import { describe, it } from "node:test";
import { findClientNodeImportViolations } from "./check-client-node-imports";

const ROOT = process.cwd();

describe("check-client-node-imports", () => {
  it("flags client imports that reach node built-ins", () => {
    const widgetAbs = path.join(ROOT, "src/components/__fixture-widget__.tsx");
    const badAbs = path.join(ROOT, "src/lib/__fixture-bad__.ts");

    const graph = new Map([
      [
        widgetAbs,
        {
          abs: widgetAbs,
          rel: "src/components/__fixture-widget__.tsx",
          source: '"use client";\nimport { x } from "@/lib/__fixture-bad__";',
          isClientRoot: true,
          isServerMarked: false,
          isServerTainted: false,
          imports: ["@/lib/__fixture-bad__"],
        },
      ],
      [
        badAbs,
        {
          abs: badAbs,
          rel: "src/lib/__fixture-bad__.ts",
          source: 'import * as fs from "node:fs";',
          isClientRoot: false,
          isServerMarked: false,
          isServerTainted: true,
          imports: ["node:fs"],
        },
      ],
    ]);

    const violations = findClientNodeImportViolations(graph);
    assert.equal(violations.length, 1);
    assert.equal(violations[0]?.taintedModule, "src/lib/__fixture-bad__.ts");
  });

  it("passes when client imports browser-safe modules only", () => {
    const hintAbs = path.join(ROOT, "src/components/__fixture-hint__.tsx");
    const gameCountAbs = path.join(ROOT, "src/lib/__fixture-game-count__.ts");
    const refSlugAbs = path.join(ROOT, "src/lib/__fixture-ref-slug__.ts");

    const graph = new Map([
      [
        hintAbs,
        {
          abs: hintAbs,
          rel: "src/components/__fixture-hint__.tsx",
          source: '"use client";\nimport { tip } from "@/lib/__fixture-game-count__";',
          isClientRoot: true,
          isServerMarked: false,
          isServerTainted: false,
          imports: ["@/lib/__fixture-game-count__"],
        },
      ],
      [
        gameCountAbs,
        {
          abs: gameCountAbs,
          rel: "src/lib/__fixture-game-count__.ts",
          source: 'import { refSlug } from "@/lib/__fixture-ref-slug__";',
          isClientRoot: false,
          isServerMarked: false,
          isServerTainted: false,
          imports: ["@/lib/__fixture-ref-slug__"],
        },
      ],
      [
        refSlugAbs,
        {
          abs: refSlugAbs,
          rel: "src/lib/__fixture-ref-slug__.ts",
          source: "export function refSlug() {}",
          isClientRoot: false,
          isServerMarked: false,
          isServerTainted: false,
          imports: [],
        },
      ],
    ]);

    assert.equal(findClientNodeImportViolations(graph).length, 0);
  });
});

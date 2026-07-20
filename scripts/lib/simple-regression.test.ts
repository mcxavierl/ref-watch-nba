import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  simpleLinearRegression,
  tTestTwoTailedPValue,
} from "./simple-regression";

describe("simple-regression", () => {
  it("recovers a positive linear relationship", () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8];
    const ys = xs.map((x) => 2 * x + 1);
    const result = simpleLinearRegression(xs, ys);
    assert.ok(result);
    assert.ok(Math.abs(result!.slope - 2) < 0.01);
    assert.ok(Math.abs(result!.intercept - 1) < 0.01);
    assert.ok(result!.correlation > 0.99);
    assert.ok(result!.pValue < 0.05);
  });

  it("returns null correlation for flat noise-free unrelated series with zero variance x", () => {
    const xs = [5, 5, 5, 5];
    const ys = [1, 2, 3, 4];
    assert.equal(simpleLinearRegression(xs, ys), null);
  });

  it("yields high p-value for uncorrelated data", () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const ys = [5, 2, 8, 1, 9, 3, 7, 4, 6, 0];
    const result = simpleLinearRegression(xs, ys)!;
    assert.ok(result.pValue > 0.05);
  });

  it("computes two-tailed t p-values", () => {
    assert.ok(tTestTwoTailedPValue(0, 10) >= 0.99);
    assert.ok(tTestTwoTailedPValue(4, 10) < 0.01);
  });
});

/**
 * Minimal OLS simple linear regression for offline audit scripts.
 * Tests H0: slope = 0 (two-tailed) using Student's t with df = n - 2.
 */

export type SimpleRegressionResult = {
  n: number;
  intercept: number;
  slope: number;
  correlation: number;
  rSquared: number;
  slopeStdError: number;
  tStat: number;
  pValue: number;
};

export function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i += 1) {
    sumX += xs[i]!;
    sumY += ys[i]!;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i]! - meanX;
    const dy = ys[i]! - meanY;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  if (varX <= 0 || varY <= 0) return 0;
  return cov / Math.sqrt(varX * varY);
}

export function simpleLinearRegression(
  xs: number[],
  ys: number[],
): SimpleRegressionResult | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i += 1) {
    sumX += xs[i]!;
    sumY += ys[i]!;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i]! - meanX;
    sxx += dx * dx;
    sxy += dx * (ys[i]! - meanY);
  }
  if (sxx <= 0) return null;

  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;

  let sse = 0;
  let sst = 0;
  for (let i = 0; i < n; i += 1) {
    const fitted = intercept + slope * xs[i]!;
    sse += (ys[i]! - fitted) ** 2;
    sst += (ys[i]! - meanY) ** 2;
  }

  const mse = sse / (n - 2);
  const slopeStdError = sxx > 0 ? Math.sqrt(mse / sxx) : 0;
  const correlation = pearsonCorrelation(xs.slice(0, n), ys.slice(0, n));
  const rSquared = sst > 0 ? 1 - sse / sst : 0;

  if (sse < 1e-12) {
    return {
      n,
      intercept: round(intercept, 4),
      slope: round(slope, 4),
      correlation: round(correlation, 4),
      rSquared: round(rSquared, 4),
      slopeStdError: 0,
      tStat: Number.POSITIVE_INFINITY,
      pValue: 0,
    };
  }

  const tStat = slopeStdError > 0 ? slope / slopeStdError : 0;

  return {
    n,
    intercept: round(intercept, 4),
    slope: round(slope, 4),
    correlation: round(correlation, 4),
    rSquared: round(rSquared, 4),
    slopeStdError: round(slopeStdError, 4),
    tStat: round(tStat, 4),
    pValue: round(tTestTwoTailedPValue(tStat, n - 2), 4),
  };
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Two-tailed p-value for |t| with df degrees of freedom. */
export function tTestTwoTailedPValue(t: number, df: number): number {
  if (!Number.isFinite(t) || df <= 0) return 1;
  const x = df / (df + t * t);
  const pOneTail = 0.5 * regularizedIncompleteBeta(df / 2, 0.5, x);
  return Math.min(1, 2 * pOneTail);
}

function regularizedIncompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const lnBeta =
    logGamma(a) + logGamma(b) - logGamma(a + b);
  const front =
    Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;

  let f = 1;
  let c = 1;
  let d = 0;
  for (let i = 0; i <= 200; i += 1) {
    const m = Math.floor(i / 2);
    let numerator: number;
    if (i === 0) {
      numerator = 1;
    } else if (i % 2 === 0) {
      numerator = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    } else {
      numerator =
        -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    }

    d = 1 + numerator * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;

    c = 1 + numerator / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;

    const cd = c * d;
    f *= cd;
    if (Math.abs(cd - 1) < 3e-7) break;
  }

  return front * (f - 1);
}

function logGamma(z: number): number {
  const coefficients = [
    76.18009172947146, -86.50532032941608, 24.01409824083091,
    -1.231739572450155, 0.001208650973866179, -0.00000539504649591,
  ];
  let x = z;
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < coefficients.length; j += 1) {
    y += 1;
    ser += coefficients[j]! / y;
  }
  return -tmp + Math.log(2.506628274631 * ser / x);
}

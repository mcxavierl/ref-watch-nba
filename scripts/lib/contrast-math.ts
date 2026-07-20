export type Rgb = {
  r: number;
  g: number;
  b: number;
  a: number;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function channelToByte(channel: string): number {
  const trimmed = channel.trim();
  if (trimmed.endsWith("%")) {
    return (Number.parseFloat(trimmed) / 100) * 255;
  }
  const parsed = Number.parseFloat(trimmed);
  if (parsed <= 1) return parsed * 255;
  return parsed;
}

/** Parse rgb()/rgba() and color(srgb ...) strings from getComputedStyle. */
export function parseCssColor(input: string): Rgb | null {
  const value = input.trim().toLowerCase();
  if (!value || value === "transparent") return null;

  const srgb = value.match(
    /^color\(srgb\s+([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+%?)(?:\s*\/\s*([\d.]+%?))?\)$/,
  );
  if (srgb) {
    const alphaRaw = srgb[4];
    return {
      r: channelToByte(srgb[1]),
      g: channelToByte(srgb[2]),
      b: channelToByte(srgb[3]),
      a: alphaRaw === undefined ? 1 : clamp01(Number.parseFloat(alphaRaw)),
    };
  }

  const modern = value.match(
    /^rgba?\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+%?)(?:\s*\/\s*([\d.]+%?))?\s*\)$/,
  );
  if (modern) {
    const alphaRaw = modern[4];
    return {
      r: channelToByte(modern[1]),
      g: channelToByte(modern[2]),
      b: channelToByte(modern[3]),
      a: alphaRaw === undefined ? 1 : clamp01(Number.parseFloat(alphaRaw)),
    };
  }

  const legacy = value.match(/^rgba?\(\s*([^)]+)\s*\)$/);
  if (!legacy) return null;

  const parts = legacy[1].split(",").map((part) => part.trim());
  if (parts.length < 3) return null;

  return {
    r: channelToByte(parts[0]),
    g: channelToByte(parts[1]),
    b: channelToByte(parts[2]),
    a: parts[3] === undefined ? 1 : clamp01(channelToByte(parts[3])),
  };
}

export function relativeLuminance(rgb: Rgb): number {
  const transform = (channel: number) => {
    const normalized = clamp01(channel / 255);
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  return (
    0.2126 * transform(rgb.r) +
    0.7152 * transform(rgb.g) +
    0.0722 * transform(rgb.b)
  );
}

export function blendColors(foreground: Rgb, background: Rgb): Rgb {
  const alpha = clamp01(foreground.a);
  return {
    r: foreground.r * alpha + background.r * (1 - alpha),
    g: foreground.g * alpha + background.g * (1 - alpha),
    b: foreground.b * alpha + background.b * (1 - alpha),
    a: 1,
  };
}

export function contrastRatio(foreground: Rgb, background: Rgb): number {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isLargeText(fontSizePx: number, fontWeight: number): boolean {
  return fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700);
}

export function minContrastRatio(largeText: boolean, highContrast: boolean): number {
  if (highContrast) return largeText ? 4.5 : 7;
  return largeText ? 3 : 4.5;
}

export function formatRgb(rgb: Rgb): string {
  return `rgb(${Math.round(rgb.r)} ${Math.round(rgb.g)} ${Math.round(rgb.b)})`;
}

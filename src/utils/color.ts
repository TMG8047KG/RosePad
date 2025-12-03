/**
 * Shared color helpers to avoid repeating tiny conversion utilities across components.
 * Keep everything in one place to keep the bundle smaller and easier to tree-shake.
 */
type RGB = { r: number; g: number; b: number };

const normalizeHex = (hex?: string): string | null => {
  if (!hex) return null;
  let value = hex.trim().replace("#", "");
  if (value.length === 3) value = value.split("").map((c) => c + c).join("");
  if (value.length !== 6) return null;
  return value.toLowerCase();
};

export const hexToRgb = (hex?: string): RGB | null => {
  const value = normalizeHex(hex);
  if (!value) return null;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return { r, g, b };
};

export const withAlpha = (hex: string | undefined, alpha: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb || Number.isNaN(alpha)) return "";
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
};

const relativeLuminance = (r: number, g: number, b: number): number => {
  const srgb = [r, g, b].map((v) => v / 255);
  const lin = srgb.map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  ) as [number, number, number];
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
};

export const readableTextColor = (
  hex?: string,
  dark = "#0F1115",
  light = "#FFFFFF",
  threshold = 0.55
): string | undefined => {
  const rgb = hexToRgb(hex);
  if (!rgb) return undefined;
  const luminance = relativeLuminance(rgb.r, rgb.g, rgb.b);
  return luminance < threshold ? light : dark;
};

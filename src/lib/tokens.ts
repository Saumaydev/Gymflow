/** Chart + surface colour tokens (PRD §9-§13). Mirrors globals.css. */
export const PASTEL = {
  cyan: "#C9EDF0",
  blue: "#C8E5ED",
  lavender: "#DED7F0",
  cream: "#F1ECE2",
  blush: "#EFDADB",
  sage: "#D8E6D6",
} as const;

export const ACCENT = {
  blue: "#7890FF",
  purple: "#9D8AFF",
  cyan: "#8DDDEB",
  green: "#82D6B2",
} as const;

export const INK = "#18181C";

export type PastelKey = keyof typeof PASTEL;

export const PASTEL_KEYS: PastelKey[] = ["cyan", "lavender", "cream", "blush", "blue", "sage"];

export const pastelBg: Record<PastelKey, string> = {
  cyan: "bg-pastel-cyan",
  blue: "bg-pastel-blue",
  lavender: "bg-pastel-lavender",
  cream: "bg-pastel-cream",
  blush: "bg-pastel-blush",
  sage: "bg-pastel-sage",
};

export const pastelDot: Record<PastelKey, string> = {
  cyan: "#C9EDF0",
  blue: "#C8E5ED",
  lavender: "#DED7F0",
  cream: "#F1ECE2",
  blush: "#EFDADB",
  sage: "#D8E6D6",
};

export function pastelFor(seed: string | number): PastelKey {
  const key = typeof seed === "number" ? seed : seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return PASTEL_KEYS[Math.abs(key) % PASTEL_KEYS.length];
}

export const radii = { sm: 16, control: 20, card: 28, lg: 36, hero: 44 } as const;

export const chartPalette = [ACCENT.blue, ACCENT.cyan, ACCENT.purple, ACCENT.green] as const;

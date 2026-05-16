// Fruit / orb evolution ladder. 11 levels.
// Colors use hsl-friendly hex for canvas rendering.
export interface FruitDef {
  level: number;
  radius: number;
  color: string;
  highlight: string;
  shadow: string;
  name: string;
  score: number;
}

const palette = [
  { c: "#ff6b6b", h: "#ffb3b3", s: "#c0392b", n: "Cherry" },
  { c: "#ff9f43", h: "#ffd5a8", s: "#cc7a1f", n: "Tangerine" },
  { c: "#feca57", h: "#fff0b3", s: "#c69d2a", n: "Lemon" },
  { c: "#1dd1a1", h: "#9be8d3", s: "#129976", n: "Lime" },
  { c: "#54a0ff", h: "#b8d4ff", s: "#2c6fc7", n: "Berry" },
  { c: "#5f27cd", h: "#b89ee6", s: "#3d1880", n: "Plum" },
  { c: "#ff6b9d", h: "#ffc1d6", s: "#c43f72", n: "Peach" },
  { c: "#48dbfb", h: "#b3eeff", s: "#1ba3c2", n: "Melon" },
  { c: "#10ac84", h: "#7ad9bc", s: "#0a7058", n: "Apple" },
  { c: "#ee5253", h: "#f7a3a4", s: "#a83333", n: "Pumpkin" },
  { c: "#f368e0", h: "#fcb6f0", s: "#a93cb0", n: "Star" },
];

export const FRUITS: FruitDef[] = palette.map((p, i) => ({
  level: i,
  radius: 18 + i * 9,
  color: p.c,
  highlight: p.h,
  shadow: p.s,
  name: p.n,
  score: (i + 1) * (i + 2), // 2,6,12,20,30,42,56,72,90,110,132
}));

export const MAX_LEVEL = FRUITS.length - 1;
// Only spawn the smaller fruits from the top.
export const SPAWNABLE_MAX_LEVEL = 4;

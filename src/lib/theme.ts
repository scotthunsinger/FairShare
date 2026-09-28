export const THEME_STORAGE_KEY = "fairshare-theme";

export type ThemeId = "black" | "white" | "colorful" | "custom";

export type ThemeChoice = {
  id: ThemeId;
  background: string;
  text: string;
  accent: string;
};

const HEX = /^#[0-9a-fA-F]{6}$/;

export const PRESET_COLORS: Record<Exclude<ThemeId, "custom">, Omit<ThemeChoice, "id">> = {
  black: { background: "#0b1220", text: "#e2e8f0", accent: "#2dd4bf" },
  white: { background: "#f4f7fb", text: "#0f172a", accent: "#0f766e" },
  colorful: { background: "#1b1035", text: "#fff7ed", accent: "#fb7185" },
};

export function defaultTheme(): ThemeChoice {
  return { id: "black", ...PRESET_COLORS.black };
}

export function parseTheme(value: unknown): ThemeChoice {
  if (!value || typeof value !== "object") return defaultTheme();
  const id = (value as { id?: string }).id;
  if (id === "black" || id === "white" || id === "colorful") {
    return { id, ...PRESET_COLORS[id] };
  }
  if (id === "custom") {
    const background = (value as { background?: string }).background ?? "";
    const text = (value as { text?: string }).text ?? "";
    const accent = (value as { accent?: string }).accent ?? "";
    if (HEX.test(background) && HEX.test(text) && HEX.test(accent)) {
      return { id: "custom", background, text, accent };
    }
  }
  return defaultTheme();
}

export function isHexColor(value: string) {
  return HEX.test(value);
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function rgbToHex(rgb: [number, number, number]) {
  return `#${rgb.map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}

function mix(a: string, b: string, amount: number): string {
  const left = hexToRgb(a);
  const right = hexToRgb(b);
  const mixed = left.map((part, index) =>
    Math.round(part + (right[index] - part) * amount),
  ) as [number, number, number];
  return rgbToHex(mixed);
}

export function relativeLuminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((part) => {
    const channel = part / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function themeVariables(theme: ThemeChoice): Record<string, string> {
  if (theme.id !== "custom") return {};
  const { background, text, accent } = theme;
  const onAccent = relativeLuminance(accent) > 0.45 ? "#111827" : "#ffffff";
  return {
    "--background": background,
    "--foreground": text,
    "--accent": accent,
    "--color-on-accent": onAccent,
    "--color-slate-950": mix(background, text, 0.08),
    "--color-slate-900": mix(background, text, 0.14),
    "--color-slate-800": mix(background, text, 0.24),
    "--color-slate-700": mix(background, text, 0.34),
    "--color-slate-600": mix(background, text, 0.46),
    "--color-slate-500": mix(text, background, 0.35),
    "--color-slate-400": mix(text, background, 0.22),
    "--color-slate-300": mix(text, background, 0.12),
    "--color-slate-200": text,
    "--color-slate-100": text,
    "--color-slate-50": text,
    "--color-teal-950": mix(background, accent, 0.35),
    "--color-teal-900": mix(background, accent, 0.5),
    "--color-teal-800": mix(background, accent, 0.65),
    "--color-teal-500": accent,
    "--color-teal-400": accent,
    "--color-teal-300": mix(accent, text, 0.25),
    "--color-teal-200": mix(accent, text, 0.4),
    "--color-teal-100": mix(accent, text, 0.7),
    "--color-teal-50": text,
    "--color-rose-950": mix(background, "#fb7185", 0.25),
    "--color-rose-900": mix(background, "#fb7185", 0.45),
    "--color-rose-300": mix("#fb7185", text, 0.15),
    "--color-rose-200": mix("#fecdd3", text, 0.2),
  };
}

const CUSTOM_KEYS = [
  "--background",
  "--foreground",
  "--accent",
  "--color-on-accent",
  "--color-slate-950",
  "--color-slate-900",
  "--color-slate-800",
  "--color-slate-700",
  "--color-slate-600",
  "--color-slate-500",
  "--color-slate-400",
  "--color-slate-300",
  "--color-slate-200",
  "--color-slate-100",
  "--color-slate-50",
  "--color-teal-950",
  "--color-teal-900",
  "--color-teal-800",
  "--color-teal-500",
  "--color-teal-400",
  "--color-teal-300",
  "--color-teal-200",
  "--color-teal-100",
  "--color-teal-50",
  "--color-rose-950",
  "--color-rose-900",
  "--color-rose-300",
  "--color-rose-200",
];

export function applyTheme(theme: ThemeChoice) {
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  const variables = themeVariables(theme);
  for (const key of CUSTOM_KEYS) {
    if (variables[key]) root.style.setProperty(key, variables[key]);
    else root.style.removeProperty(key);
  }
  root.style.colorScheme = relativeLuminance(theme.background) > 0.5 ? "light" : "dark";
  localStorage.setItem(
    THEME_STORAGE_KEY,
    JSON.stringify({ ...theme, vars: themeVariables(theme) }),
  );
}

export function readStoredTheme(): ThemeChoice {
  try {
    return parseTheme(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? "null"));
  } catch {
    return defaultTheme();
  }
}

export const THEME_BOOT = `(function(){try{var raw=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(!raw)return;var theme=JSON.parse(raw);if(!theme||!theme.id)return;document.documentElement.dataset.theme=theme.id;if(theme.vars){for(var key in theme.vars){document.documentElement.style.setProperty(key, theme.vars[key]);}}}catch(e){}})();`;

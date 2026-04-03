import type { CSSProperties } from "react";

export interface TextStyle {
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
}

export interface SongStyle {
  title: TextStyle;
  lyrics: TextStyle;
  chords: TextStyle;
  background?: string;
  backgroundImage?: string;   // base64 data URL, not included in share URLs
  overlayOpacity?: number;    // 0–1, default 0.5
}

export const MONO_STACK = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export const DEFAULT_STYLE: SongStyle = {
  title:      { fontFamily: MONO_STACK, fontSize: 20, color: "#18181b", bold: true,  italic: false },
  lyrics:     { fontFamily: MONO_STACK, fontSize: 14, color: "#27272a", bold: false, italic: false },
  chords:     { fontFamily: MONO_STACK, fontSize: 12, color: "#4f46e5", bold: true,  italic: false },
  background: "#ffffff",
};

export interface GoogleFont {
  name: string;
  url: string;
  stack: string;
}

export const GOOGLE_FONTS: GoogleFont[] = [
  { name: "Source Code Pro", url: "https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;700&display=swap",  stack: "'Source Code Pro', monospace" },
  { name: "JetBrains Mono",  url: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap",   stack: "'JetBrains Mono', monospace" },
  { name: "IBM Plex Mono",   url: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap",    stack: "'IBM Plex Mono', monospace" },
  { name: "Space Mono",      url: "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap",       stack: "'Space Mono', monospace" },
  { name: "Roboto Mono",     url: "https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap",      stack: "'Roboto Mono', monospace" },
  { name: "Inconsolata",     url: "https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;700&display=swap",      stack: "'Inconsolata', monospace" },
  { name: "Fira Code",       url: "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&display=swap",        stack: "'Fira Code', monospace" },
  { name: "Playfair Display",url: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap", stack: "'Playfair Display', serif" },
  { name: "Merriweather",    url: "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap",     stack: "'Merriweather', serif" },
  { name: "EB Garamond",     url: "https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;700&display=swap",      stack: "'EB Garamond', serif" },
  { name: "Lora",            url: "https://fonts.googleapis.com/css2?family=Lora:wght@400;700&display=swap",             stack: "'Lora', serif" },
  { name: "Crimson Pro",     url: "https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;700&display=swap",      stack: "'Crimson Pro', serif" },
  { name: "Inter",           url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap",            stack: "'Inter', sans-serif" },
  { name: "Lato",            url: "https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap",             stack: "'Lato', sans-serif" },
  { name: "Poppins",         url: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap",          stack: "'Poppins', sans-serif" },
  { name: "Raleway",         url: "https://fonts.googleapis.com/css2?family=Raleway:wght@400;700&display=swap",          stack: "'Raleway', sans-serif" },
  { name: "Oswald",          url: "https://fonts.googleapis.com/css2?family=Oswald:wght@400;700&display=swap",           stack: "'Oswald', sans-serif" },
  { name: "Nunito",          url: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;700&display=swap",           stack: "'Nunito', sans-serif" },
  { name: "Caveat",          url: "https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap",           stack: "'Caveat', cursive" },
];

export const SYSTEM_FONT: GoogleFont = {
  name: "System Mono",
  url: "",
  stack: MONO_STACK,
};

export const ALL_FONTS: GoogleFont[] = [SYSTEM_FONT, ...GOOGLE_FONTS];

const loadedFonts = new Set<string>();
export function loadGoogleFont(url: string): void {
  if (!url || loadedFonts.has(url) || typeof document === "undefined") return;
  loadedFonts.add(url);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  document.head.appendChild(link);
}

export function fontByStack(stack: string): GoogleFont {
  return ALL_FONTS.find(f => f.stack === stack) ?? SYSTEM_FONT;
}

/** Converts a hex color (#rrggbb or #rgb) to `rgba(r,g,b,a)`. */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3
    ? h.split("").map(c => c + c).join("")
    : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Returns a React `style` object for the outermost background div. */
export function backgroundStyle(s: SongStyle): CSSProperties {
  if (s.backgroundImage) {
    const opacity = s.overlayOpacity ?? 0.5;
    // Overlay tints toward the background color so text always stays readable
    const overlay = hexToRgba(s.background ?? "#ffffff", opacity);
    return {
      backgroundImage: `linear-gradient(${overlay}, ${overlay}), url(${s.backgroundImage})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  return { background: s.background ?? "#ffffff" };
}

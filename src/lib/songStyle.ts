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
  artist: TextStyle;
  lyrics: TextStyle;
  chords: TextStyle;
  section?: TextStyle;
  background?: string;
  backgroundImage?: string;   // base64 data URL, not included in share URLs
  overlayOpacity?: number;    // 0–1, default 0.5
  titleAlign?: "left" | "center";
  sectionAlign?: "left" | "center";
  sectionDivider?: boolean;
  /** Render chords in jazz lead-sheet ("Real Book") style with superscript extensions. */
  jazzChords?: boolean;
}

export const MONO_STACK = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export const DEFAULT_STYLE: SongStyle = {
  title:          { fontFamily: MONO_STACK, fontSize: 20, color: "#18181b", bold: true,  italic: false },
  artist:         { fontFamily: MONO_STACK, fontSize: 13, color: "#71717a", bold: false, italic: false },
  lyrics:         { fontFamily: MONO_STACK, fontSize: 14, color: "#27272a", bold: false, italic: false },
  chords:         { fontFamily: MONO_STACK, fontSize: 12, color: "#4f46e5", bold: true,  italic: false },
  section:        { fontFamily: MONO_STACK, fontSize: 11, color: "#4f46e5", bold: true,  italic: false },
  background:     "#ffffff",
  titleAlign:     "center",
  sectionAlign:   "left",
  sectionDivider: true,
};

const PETALUMA_STACK = "'Petaluma Script', cursive";

/**
 * One-click "Jazz / Real Book" look: handwritten Petaluma Script on every
 * element, black ink on warm manuscript paper, and Real Book chord styling.
 * Applied as a merge so the user's background image (if any) is preserved.
 */
export const JAZZ_PRESET: Partial<SongStyle> = {
  jazzChords:     true,
  background:     "#fbf9f2",
  titleAlign:     "center",
  sectionAlign:   "left",
  sectionDivider: false,
  title:   { fontFamily: PETALUMA_STACK, fontSize: 30, color: "#1a1a1a", bold: false, italic: false },
  artist:  { fontFamily: PETALUMA_STACK, fontSize: 16, color: "#555555", bold: false, italic: false },
  lyrics:  { fontFamily: PETALUMA_STACK, fontSize: 17, color: "#1a1a1a", bold: false, italic: false },
  chords:  { fontFamily: PETALUMA_STACK, fontSize: 18, color: "#1a1a1a", bold: false, italic: false },
  section: { fontFamily: PETALUMA_STACK, fontSize: 14, color: "#1a1a1a", bold: false, italic: false },
};

export interface StylePreset {
  id: string;
  label: string;
  emoji: string;
  /** Font used to render the preset's button label (for a quick visual cue). */
  previewStack?: string;
  style: Partial<SongStyle>;
}

const SANS = "'Poppins', sans-serif";
const SANS_BODY = "'Inter', sans-serif";
const SERIF = "'Lora', serif";
const GARAMOND = "'EB Garamond', serif";
const CONDENSED = "'Oswald', sans-serif";

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "clean", label: "Clean", emoji: "📄", previewStack: MONO_STACK,
    style: {
      jazzChords: false, background: "#ffffff", titleAlign: "center", sectionAlign: "left", sectionDivider: true,
      title:   { fontFamily: MONO_STACK, fontSize: 20, color: "#18181b", bold: true,  italic: false },
      artist:  { fontFamily: MONO_STACK, fontSize: 13, color: "#71717a", bold: false, italic: false },
      lyrics:  { fontFamily: MONO_STACK, fontSize: 14, color: "#27272a", bold: false, italic: false },
      chords:  { fontFamily: MONO_STACK, fontSize: 12, color: "#4f46e5", bold: true,  italic: false },
      section: { fontFamily: MONO_STACK, fontSize: 11, color: "#4f46e5", bold: true,  italic: false },
    },
  },
  {
    id: "jazz", label: "Jazz", emoji: "🎷", previewStack: PETALUMA_STACK,
    style: JAZZ_PRESET,
  },
  {
    id: "modern", label: "Modern", emoji: "✨", previewStack: SANS,
    style: {
      jazzChords: false, background: "#ffffff", titleAlign: "center", sectionAlign: "left", sectionDivider: true,
      title:   { fontFamily: SANS,      fontSize: 28, color: "#111827", bold: true,  italic: false },
      artist:  { fontFamily: SANS,      fontSize: 14, color: "#6b7280", bold: false, italic: false },
      lyrics:  { fontFamily: SANS_BODY, fontSize: 15, color: "#1f2937", bold: false, italic: false },
      chords:  { fontFamily: SANS,      fontSize: 14, color: "#6366f1", bold: true,  italic: false },
      section: { fontFamily: SANS,      fontSize: 12, color: "#6366f1", bold: true,  italic: false },
    },
  },
  {
    id: "folk", label: "Folk", emoji: "🪕", previewStack: SERIF,
    style: {
      jazzChords: false, background: "#f7f2e9", titleAlign: "center", sectionAlign: "left", sectionDivider: false,
      title:   { fontFamily: SERIF, fontSize: 26, color: "#3f322a", bold: true,  italic: false },
      artist:  { fontFamily: SERIF, fontSize: 14, color: "#6b5847", bold: false, italic: true  },
      lyrics:  { fontFamily: SERIF, fontSize: 15, color: "#3f322a", bold: false, italic: false },
      chords:  { fontFamily: SERIF, fontSize: 15, color: "#9c5b2e", bold: true,  italic: false },
      section: { fontFamily: SERIF, fontSize: 13, color: "#9c5b2e", bold: true,  italic: false },
    },
  },
  {
    id: "worship", label: "Worship", emoji: "🕊️", previewStack: GARAMOND,
    style: {
      jazzChords: false, background: "#faf9ff", titleAlign: "center", sectionAlign: "center", sectionDivider: false,
      title:   { fontFamily: GARAMOND, fontSize: 30, color: "#3b0764", bold: true,  italic: false },
      artist:  { fontFamily: GARAMOND, fontSize: 15, color: "#7e22ce", bold: false, italic: true  },
      lyrics:  { fontFamily: GARAMOND, fontSize: 17, color: "#27272a", bold: false, italic: false },
      chords:  { fontFamily: GARAMOND, fontSize: 15, color: "#7c3aed", bold: true,  italic: false },
      section: { fontFamily: GARAMOND, fontSize: 13, color: "#7c3aed", bold: true,  italic: false },
    },
  },
  {
    id: "rock", label: "Rock", emoji: "🎸", previewStack: CONDENSED,
    style: {
      jazzChords: false, background: "#161616", titleAlign: "center", sectionAlign: "left", sectionDivider: true,
      title:   { fontFamily: CONDENSED, fontSize: 30, color: "#ffffff", bold: true,  italic: false },
      artist:  { fontFamily: CONDENSED, fontSize: 14, color: "#a1a1aa", bold: false, italic: false },
      lyrics:  { fontFamily: SANS_BODY, fontSize: 15, color: "#e4e4e7", bold: false, italic: false },
      chords:  { fontFamily: CONDENSED, fontSize: 16, color: "#f59e0b", bold: true,  italic: false },
      section: { fontFamily: CONDENSED, fontSize: 13, color: "#f59e0b", bold: true,  italic: false },
    },
  },
];

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
  // Handwritten / jazz lead-sheet style
  { name: "Reenie Beanie",   url: "https://fonts.googleapis.com/css2?family=Reenie+Beanie&display=swap",                stack: "'Reenie Beanie', cursive" },
  { name: "Patrick Hand",    url: "https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap",                 stack: "'Patrick Hand', cursive" },
  { name: "Kalam",           url: "https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&display=swap",           stack: "'Kalam', cursive" },
  // Self-hosted jazz fonts (loaded via @font-face in globals.css, so url is empty)
  { name: "MuseJazz Text",   url: "",                                                                                 stack: "'MuseJazz Text', cursive" },
  { name: "Petaluma Script", url: "",                                                                                 stack: "'Petaluma Script', cursive" },
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
export function hexToRgba(hex: string, alpha: number): string {
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

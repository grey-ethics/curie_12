// src/theme/palette.ts
/**
 * What changed (single point of control)
 * - A single controller constant `BG_SET` below selects the background set folder.
 * - No URL params, no localStorage, no .env/.env.local — this file alone controls backgrounds.
 * - Supported values: 1..9, mapping to /public/assets/media/bg_01 .. bg_09
 * - Filenames inside each folder must exist as:
 *     bg_light_grey.jpg,  bg_dark_grey.jpg
 *     bg_light_blue.jpg,  bg_dark_blue.jpg
 *     bg_light_green.jpg, bg_dark_green.jpg
 *     bg_light_yellow.jpg,bg_dark_yellow.jpg
 *     bg_light_red.jpg,   bg_dark_red.jpg
 * - Also fixes a small bug in rgbToHex (previous version repeated "b" twice).
 */

export type Brand = 'grey' | 'blue' | 'green' | 'yellow' | 'red'
export type Rgb = [number, number, number]
export type Mode = 'light' | 'dark'

type BrandTheme = {
  /** Accent/primary color used for emphasis */
  swatchRgb: Rgb
  /** [component-1, component-2] used to derive glass surfaces in light mode */
  light: [Rgb, Rgb]
  /** [component-1, component-2] used to derive glass surfaces in dark mode */
  dark: [Rgb, Rgb]
  /** Background image URLs for this brand */
  bg: { light: string; dark: string }
}

/** --- SINGLE CONTROLLER KNOB (edit this line only): pick 1..9 --- */
const BG_SET = 3 // ⇐ change to 2/3/.../9 to switch folders (bg_01 → bg_09)

/** Convert [r,g,b] to #rrggbb (used for --primary) */
// single-line comment: standard RGB to hex conversion with zero-padding
export function rgbToHex([r, g, b]: Rgb) {
  const to = (n: number) => n.toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

/** Format [r,g,b] as "r g b" for CSS `rgb(var(--x))` usage */
// single-line comment: space-delimited form integrates with CSS custom props
export function cssRgb(v: Rgb) {
  return `${v[0]} ${v[1]} ${v[2]}`
}

/** Compute the selected background base directory from the controller knob */
// single-line comment: clamp to 1..9 and build /assets/media/bg_0X
function bgBaseDir(): string {
  const n = Math.min(9, Math.max(1, Math.floor(BG_SET || 1)))
  return `/assets/media/bg_${String(n).padStart(2, '0')}`
}

/** Build the background image path for a given brand+mode */
// single-line comment: filenames follow bg_<mode>_<brand>.jpg
function bgPath(color: Brand, mode: Mode) {
  return `${bgBaseDir()}/bg_${mode}_${color}.jpg`
}

export const PALETTE: Record<Brand, BrandTheme> = {
  grey: {
    swatchRgb: [100, 105, 112],
    light: [[246, 247, 247], [240, 240, 241]],
    dark: [[29, 35, 39], [16, 21, 23]],
    bg: { light: bgPath('grey', 'light'), dark: bgPath('grey', 'dark') },
  },
  blue: {
    swatchRgb: [34, 113, 177],
    light: [[240, 246, 252], [197, 217, 237]],
    dark: [[1, 38, 58], [0, 19, 28]],
    bg: { light: bgPath('blue', 'light'), dark: bgPath('blue', 'dark') },
  },
  yellow: {
    swatchRgb: [153, 104, 0],
    light: [[252, 249, 232], [245, 230, 171]],
    dark: [[54, 36, 0], [33, 22, 0]],
    bg: { light: bgPath('yellow', 'light'), dark: bgPath('yellow', 'dark') },
  },
  green: {
    swatchRgb: [0, 138, 32],
    light: [[237, 250, 239], [184, 230, 191]],
    dark: [[0, 48, 8], [0, 28, 5]],
    bg: { light: bgPath('green', 'light'), dark: bgPath('green', 'dark') },
  },
  red: {
    swatchRgb: [214, 54, 56],
    light: [[252, 240, 241], [250, 207, 210]],
    dark: [[69, 19, 19], [36, 10, 10]],
    bg: { light: bgPath('red', 'light'), dark: bgPath('red', 'dark') },
  },
}

/** Resolve the active brand+mode slice (colors + computed background URL) */
// single-line comment: used by Stage() to set the actual wallpaper image
export function resolveTheme(brand: Brand, mode: Mode) {
  const t = PALETTE[brand]
  const [c1, c2] = mode === 'light' ? t.light : t.dark
  return {
    brand,
    mode,
    primaryHex: rgbToHex(t.swatchRgb),
    component1Rgb: c1,
    component2Rgb: c2,
    backgroundUrl: mode === 'light' ? t.bg.light : t.bg.dark,
  }
}

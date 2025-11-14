// src/theme/palette.ts
/**
 * Single source of truth for all brand colors, light/dark component pairs,
 * and background images. Edit here later to tweak any color.
 */

export type Brand = 'grey' | 'blue' | 'green' | 'yellow' | 'red'
export type Rgb = [number, number, number]
export type Mode = 'light' | 'dark'

type BrandTheme = {
  /** The small selectable swatch + accent/primary color */
  swatchRgb: Rgb
  /** [component-1, component-2] used to derive --bg / --card in light mode */
  light: [Rgb, Rgb]
  /** [component-1, component-2] used to derive --bg / --card in dark mode */
  dark: [Rgb, Rgb]
  /** Background image filenames (placed in public/assets/media/) */
  bg: { light: string; dark: string }
}

/** Helpers */
export function rgbToHex([r, g, b]: Rgb) {
  const to = (n: number) => n.toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}
export function cssRgb(v: Rgb) {
  // space-delimited CSS rgb that works with `rgb(var(--x))`
  return `${v[0]} ${v[1]} ${v[2]}`
}

export const PALETTE: Record<Brand, BrandTheme> = {
  grey: {
    swatchRgb: [100, 105, 112],
    light: [[246, 247, 247], [240, 240, 241]],
    dark: [[29, 35, 39], [16, 21, 23]],
    bg: { light: '/assets/media/bg_light_grey.jpg', dark: '/assets/media/bg_dark_grey.jpg' },
  },
  blue: {
    swatchRgb: [34, 113, 177],
    light: [[240, 246, 252], [197, 217, 237]],
    dark: [[1, 38, 58], [0, 19, 28]],
    bg: { light: '/assets/media/bg_light_blue.jpg', dark: '/assets/media/bg_dark_blue.jpg' },
  },
  yellow: {
    swatchRgb: [153, 104, 0],
    light: [[252, 249, 232], [245, 230, 171]],
    dark: [[54, 36, 0], [33, 22, 0]],
    bg: { light: '/assets/media/bg_light_yellow.jpg', dark: '/assets/media/bg_dark_yellow.jpg' },
  },
  green: {
    swatchRgb: [0, 138, 32],
    light: [[237, 250, 239], [184, 230, 191]],
    dark: [[0, 48, 8], [0, 28, 5]],
    bg: { light: '/assets/media/bg_light_green.jpg', dark: '/assets/media/bg_dark_green.jpg' },
  },
  red: {
    swatchRgb: [214, 54, 56],
    light: [[252, 240, 241], [250, 207, 210]],
    dark: [[69, 19, 19], [36, 10, 10]],
    bg: { light: '/assets/media/bg_light_red.jpg', dark: '/assets/media/bg_dark_red.jpg' },
  },
}

/** Resolve the currently active "theme slice" for brand+mode */
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

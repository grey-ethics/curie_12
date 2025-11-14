// src/state/theme.tsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Brand, Mode, resolveTheme, cssRgb } from '../theme/palette'

type ThemeCtx = {
  brand: Brand
  mode: Mode
  setBrand: (b: Brand) => void
  setMode: (m: Mode) => void
}

const Ctx = createContext<ThemeCtx>(null as any)

const LS_BRAND = 'brand'
const LS_MODE = 'mode'

const THEME_CLASSES = ['theme-grey', 'theme-blue', 'theme-green', 'theme-yellow', 'theme-red'] as const

function applyThemeToDom(brand: Brand, mode: Mode) {
  const t = resolveTheme(brand, mode)
  const root = document.documentElement

  root.dataset.mode = mode
  root.dataset.brand = brand

  root.classList.remove(...THEME_CLASSES)
  root.classList.add(`theme-${brand}`)

  root.style.setProperty('--glass-component-1-rgb', cssRgb(t.component1Rgb))
  root.style.setProperty('--glass-component-2-rgb', cssRgb(t.component2Rgb))

  root.style.setProperty('--text', mode === 'dark' ? '#ffffff' : '#1b1b1b')
  root.style.setProperty('--muted', mode === 'dark' ? '#aaaaaa' : '#666666')
  root.style.setProperty('--primary', t.primaryHex)
}

/** ---------- cursor preloading to avoid first-change flash ---------- */
const BRAND_LETTER: Record<Brand, string> = {
  grey: 'w',   // white in RW pack
  blue: 'b',
  green: 'g',
  yellow: 'o', // orange in RW pack
  red: 'r',
}

function cursorUrlsForBrand(brand: Brand): string[] {
  const L = BRAND_LETTER[brand]
  const base = `/assets/cursors/${brand}_cursor`
  return [
    `${base}/default.cur`,
    `${base}/pointer.cur`,
    `${base}/text.cur`,
    `${base}/help.cur`,
    `${base}/not-allowed.cur`,
    `${base}/Clear-${L}-13-Move.cur`,
    `${base}/Clear-${L}-09-rVert.ani`,
    `${base}/Clear-${L}-10-rHorz.ani`,
    `${base}/Clear-${L}-11-rDir1.ani`,
    `${base}/Clear-${L}-12-rDir2.ani`,
    `${base}/Clear-${L}-05-Prec.cur`,
  ]
}

/** Warm by *applying* cursor styles off-screen so the engine decodes them */
function warmCursorsInDom(urls: string[]): Promise<void> {
  return new Promise((resolve) => {
    const host = document.createElement('div')
    host.style.cssText =
      'position:fixed;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden;pointer-events:none;opacity:0;contain:strict;'
    document.body.appendChild(host)

    for (const u of urls) {
      const d = document.createElement('div')
      d.style.cssText = `width:1px;height:1px;cursor:url("${u}"), auto`
      host.appendChild(d)
      // Force style calc so the engine kicks off the load now
      void getComputedStyle(d).cursor
    }

    // Give Chromium/Edge a couple frames, then clean up
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        host.remove()
        resolve()
      })
    })
  })
}

let _preloaded = false
async function preloadAllCursorAssets() {
  if (_preloaded) return
  _preloaded = true

  const brands: Brand[] = ['grey', 'blue', 'green', 'yellow', 'red']
  const urls = brands.flatMap(cursorUrlsForBrand)

  // Kick HTTP cache (best-effort; .cur/.ani won’t decode from fetch alone)
  try { await Promise.allSettled(urls.map(u => fetch(u, { cache: 'force-cache' }))) } catch {}

  // Force the renderer to decode/ready the cursor files
  try { await warmCursorsInDom(urls) } catch {}
}

/** Nudge the active cursor so Windows swaps immediately (no “jiggle” required) */
function bumpActiveCursorOnce() {
  const root = document.documentElement
  const prev = root.style.cursor
  // Temporarily set to auto, force a layout flush, then restore
  root.style.cursor = 'auto'
  void root.offsetWidth
  root.style.cursor = prev
}
/** ------------------------------------------------------------------- */

export function ThemeProvider({ children }: { children: any }) {
  const [brand, setBrandState] = useState<Brand>(() => (localStorage.getItem(LS_BRAND) as Brand) || 'blue')
  const [mode, setModeState] = useState<Mode>(() => (localStorage.getItem(LS_MODE) as Mode) || 'light')

  // Preload all cursor assets once (prevents first-change flash; esp. Move)
  useEffect(() => { preloadAllCursorAssets() }, [])

  useEffect(() => {
    applyThemeToDom(brand, mode)
    // Force the OS to swap to the new cursor *now* (first change on Windows quirk)
    bumpActiveCursorOnce()
  }, [brand, mode])

  const setBrand = (b: Brand) => {
    setBrandState(b)
    localStorage.setItem(LS_BRAND, b)
  }
  const setMode = (m: Mode) => {
    setModeState(m)
    localStorage.setItem(LS_MODE, m)
  }

  const ctxValue = useMemo<ThemeCtx>(() => ({ brand, mode, setBrand, setMode }), [brand, mode])
  return <Ctx.Provider value={ctxValue}>{children}</Ctx.Provider>
}

export function useTheme() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('ThemeProvider missing')
  return ctx
}

// src/pages/LandingPage.tsx
import { useEffect, useState } from 'react'
import LogoWith3DTorus from '../components/Brand/LogoWith3DTorus'

// =========================
// TWEAK ME (the knobs)
// =========================
// (1) SIZE of the Curie wordmark (in px height)
const CURIE_LOGO_HEIGHT = 300

// (2) PLACEMENT of the Curie wordmark block (px offset relative to its normal spot)
const CURIE_LOGO_LEFT = 0
const CURIE_LOGO_TOP = 225

// (3) SIZE of the donut (3D torus) canvas (square size in px)
const DONUT_SIZE = 250

// (4) PLACEMENT of the donut relative to the wordmark image (px from image’s top-left)
const DONUT_LEFT = 250
const DONUT_TOP = -100

// EXTRA: shrink the torus inside the canvas to avoid clipping (0.85–1.0 works well)
const DONUT_SCALE = 0.5

export default function LandingPage() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Gate the intro fade per browser tab (resets on refresh/new tab)
    const alreadyPlayed = sessionStorage.getItem('intro:played') === '1'

    if (alreadyPlayed) {
      // No fade on subsequent visits within this tab
      setVisible(true)
      return
    }

    // First visit in this tab → mark as played and trigger fade
    sessionStorage.setItem('intro:played', '1')
    // Trigger the fade on the next frame so CSS transitions run
    requestAnimationFrame(() => setVisible(true))
  }, [])

  return (
    <section className="container" style={{ minHeight: '60vh', display: 'grid', gap: 16 }}>
      <div
        className={`intro-fade${visible ? ' visible' : ''}`}
        style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}
      >
        <LogoWith3DTorus
          // (1) size
          wordmarkHeight={CURIE_LOGO_HEIGHT}
          // (2) placement
          wordmarkLeft={CURIE_LOGO_LEFT}
          wordmarkTop={CURIE_LOGO_TOP}
          // (3) size
          donutSize={DONUT_SIZE}
          // (4) placement
          donutLeft={DONUT_LEFT}
          donutTop={DONUT_TOP}
          // avoid clipping
          donutScale={DONUT_SCALE}
        />
      </div>
    </section>
  )
}

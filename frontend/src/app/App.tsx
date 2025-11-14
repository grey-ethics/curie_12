// src/app/App.tsx
import { useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider } from '../state/auth'
import RoutesView from './routes'
import SettingsModal from '../components/SettingsModal/SettingsModal'
import AntdThemeBridge from '../ui/AntdThemeBridge'
import { useTheme } from '../state/theme'
import { resolveTheme } from '../theme/palette'
import { useEffect, useMemo } from 'react'

function Stage({ children }: { children: any }) {
  const { brand, mode } = useTheme()
  const loc = useLocation()

  const isPublic = useMemo(() => {
    const p = loc.pathname
    return p === '/' || p === '/signin' || p === '/signup'
  }, [loc.pathname])

  const bgUrl = useMemo(() => resolveTheme(brand, mode).backgroundUrl, [brand, mode])
  const stageStyle = isPublic ? undefined : ({ backgroundImage: `url(${bgUrl})` } as React.CSSProperties)

  return (
    <div className="stage" style={stageStyle}>
      {isPublic && (
        <>
          <div className="stage-video-wrap" aria-hidden="true">
            <video className="stage-video" muted autoPlay loop playsInline preload="metadata">
              <source src="/assets/media/bg_v_01.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="stage-overlay" aria-hidden="true" />
        </>
      )}
      <div className="app-blade">
        {/* Floating layer for in-blade popovers/menus (Select, etc.) */}
        <div id="blade-floating-root" aria-hidden="true" />
        {children}
      </div>
    </div>
  )
}

function NavBridge() {
  const nav = useNavigate()
  useEffect(() => {
    const on = (e: any) => {
      const to = e?.detail?.to || '/'
      const replace = !!e?.detail?.replace
      nav(to, { replace })
    }
    document.addEventListener('app-nav', on)
    return () => document.removeEventListener('app-nav', on)
  }, [nav])
  return null
}

export default function App() {
  return (
    <AntdThemeBridge>
      <AuthProvider>
        <Stage>
          <NavBridge />
          <RoutesView />
          <SettingsModal />
        </Stage>
      </AuthProvider>
    </AntdThemeBridge>
  )
}
// src/components/HeaderBar.tsx
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import OptionsMenu from './OptionsMenu'
import { getProfile } from '../api/me'
import { useAuth } from '../state/auth'
import { useTheme } from '../state/theme'

export default function HeaderBar({ context }: { context: 'public' | 'portal' }) {
  const { actor } = useAuth()
  const { mode } = useTheme()
  const [orgLogo, setOrgLogo] = useState<string | null>(null)

  useEffect(() => {
    if (context === 'portal') {
      getProfile().then(p => setOrgLogo(p?.logo_url || null)).catch(() => {})
    }
  }, [context, actor])

  const homePath = useMemo(() => {
    if (actor === 'user') return '/user'
    if (actor === 'admin') return '/admin'
    if (actor === 'super_admin') return '/superadmin'
    return '/'
  }, [actor])

  // Theme-aware default logos
  const defaultLogo = mode === 'dark'
    ? '/assets/curie_logo_dark.png'
    : '/assets/curie_logo_light.png'

  const logoSrc = orgLogo || defaultLogo

  return (
    <header className="header">
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link to={homePath} aria-label="Home" title="Home">
          <img
            src={logoSrc}
            alt="Curie"
            className="logo"
            style={{ height: 28, borderRadius: 6 }}
          />
        </Link>
      </div>
      <div className="header-right">
        <OptionsMenu context={context} />
      </div>
    </header>
  )
}

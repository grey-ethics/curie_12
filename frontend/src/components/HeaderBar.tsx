// src/components/HeaderBar.tsx
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import OptionsMenu from './OptionsMenu'
import { getProfile } from '../api/me'
import { useAuth } from '../state/auth'

export default function HeaderBar({ context }: { context: 'public' | 'portal' }) {
  const { actor } = useAuth()
  const [logo, setLogo] = useState<string | null>(null)

  useEffect(() => {
    if (context === 'portal') {
      getProfile().then(p => setLogo(p?.logo_url || null)).catch(() => {})
    }
  }, [context, actor])

  const homePath = useMemo(() => {
    if (actor === 'user') return '/user'
    if (actor === 'admin') return '/admin'
    if (actor === 'super_admin') return '/superadmin'
    return '/'
  }, [actor])

  return (
    <header className="header">
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link to={homePath} aria-label="Home" title="Home">
          <img
            src={logo || '/assets/curie_logo.png'}
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

/*
- file: src/components/HeaderBar.tsx
- purpose:
  - Top app header used in public + portal layouts.
  - Shows logo on the left.
  - Shows portal controls on the right (menu + now notifications bell for user/admin).
- behavior:
  - In portal context and actor is user/admin: render a bell icon to the LEFT of the menu button.
  - Clicking bell navigates to the correct notifications page for that actor.
  - Existing logo/profile/theme logic unchanged.
*/

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import OptionsMenu from './OptionsMenu'
import { getProfile } from '../api/me'
import { useAuth } from '../state/auth'
import { useTheme } from '../state/theme'

export default function HeaderBar({ context }: { context: 'public' | 'portal' }) {
  const nav = useNavigate()
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

  // single-line comment: Build notifications route based on actor; returns null for super admin/public.
  const notificationsPath = useMemo(() => {
    if (actor === 'user') return '/user/notifications'
    if (actor === 'admin') return '/admin/notifications'
    return null
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

      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* single-line comment: Bell icon is only visible for user/admin inside portal header. */}
        {context === 'portal' && notificationsPath && (
          <button
            type="button"
            className="icon-btn"
            aria-label="Notifications"
            title="Notifications"
            onClick={() => nav(notificationsPath)}
          >
            <img
              src="/assets/icons/notifications_icon.png"
              alt=""
              style={{ width: 20, height: 20 }}
            />
          </button>
        )}

        <OptionsMenu context={context} />
      </div>
    </header>
  )
}

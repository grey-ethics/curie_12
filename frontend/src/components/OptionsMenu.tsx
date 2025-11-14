// src/components/OptionsMenu.tsx
import Dropdown from './UI/Dropdown'
import Toggle from './UI/Toggle'
import { useTheme } from '../state/theme'
import { useAuth } from '../state/auth'
import { useNavigate } from 'react-router-dom'
import { PALETTE, Brand } from '../theme/palette'

export default function OptionsMenu({ context }: { context: 'public' | 'portal' }) {
  const { brand, mode, setBrand, setMode } = useTheme()
  const { logout } = useAuth()
  const nav = useNavigate()

  const BrandSwatches = () => {
    const brands: Brand[] = ['grey', 'blue', 'green', 'yellow', 'red']
    return (
      <div className="brand-swatches" role="group" aria-label="Theme color">
        {brands.map((b) => {
          const rgb = PALETTE[b].swatchRgb
          const bg = `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})`
          const active = b === brand
          const label = b.charAt(0).toUpperCase() + b.slice(1) // Capitalize tooltip
          return (
            <button
              key={b}
              title={label}
              aria-label={label}
              className={`brand-swatch${active ? ' active' : ''}`}
              onClick={() => setBrand(b)}
              style={{ background: bg }}
            />
          )
        })}
      </div>
    )
  }

  // Small visual divider with left/right margins (custom)
  const SectionDivider = () => <div className="section-divider" role="separator" aria-hidden="true" />

  const ThemeRow = (
    <div className="menu-row">
      <span>Theme</span>
      <BrandSwatches />
    </div>
  )

  const ModeRow = (
    <div className="menu-row">
      <span style={{ marginRight: 8 }}>Light</span>
      <Toggle value={mode === 'dark'} onChange={(v) => setMode(v ? 'dark' : 'light')} />
      <span style={{ marginLeft: 8 }}>Dark</span>
    </div>
  )

  // PUBLIC menu: Theme above Dark, divider above Theme
  const menuPublic = [
    { label: 'Sign up', onClick: () => nav('/signup') },
    { label: 'Sign in', onClick: () => nav('/signin') },
    { separator: true },
    { custom: <SectionDivider /> },
    { custom: ThemeRow },
    { custom: ModeRow },
  ]

  // PORTAL menu: Settings, divider, Theme, Dark, then Logout
  const menuPortal = [
    { label: 'Settings', onClick: () => document.dispatchEvent(new CustomEvent('open-settings')) },
    { custom: <SectionDivider /> },
    { custom: ThemeRow },
    { custom: ModeRow },
    { separator: true },
    { label: 'Logout', onClick: logout },
  ]

  const items = context === 'public' ? menuPublic : menuPortal

  return (
    <Dropdown
      trigger={
        <button className="menu-3lines" aria-label="menu">
          <span />
          <span />
          <span />
        </button>
      }
      items={items}
    />
  )
}

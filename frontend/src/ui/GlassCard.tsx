// src/components/UI/GlassCard.tsx
import { PropsWithChildren } from 'react'
import { theme as antdTheme } from 'antd'
import { hexToRgba } from '../utils/color'

export default function GlassCard({ children }: PropsWithChildren) {
  const { token } = antdTheme.useToken()
  const primarySoft = hexToRgba(token.colorPrimary, 0.22)
  const borderSoft  = hexToRgba(token.colorPrimary, 0.28)
  const baseSoft    = hexToRgba('#000000', token.colorBgBase === '#000000' ? 0.15 : 0.06)

  return (
    <div style={{
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      background: `linear-gradient(135deg, ${primarySoft}, ${baseSoft})`,
      border: `1px solid ${borderSoft}`,
      borderRadius: token.borderRadiusLG,
      boxShadow: token.boxShadowSecondary,
      padding: 16,
    }}>
      {children}
    </div>
  )
}

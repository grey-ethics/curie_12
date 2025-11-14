// src/ui/AntdThemeBridge.tsx
import { ConfigProvider, App as AntdApp, theme as antdTheme } from 'antd'
import { PropsWithChildren, useMemo } from 'react'
import { useTheme } from '../state/theme'
import { resolveTheme } from '../theme/palette'

export default function AntdThemeBridge({ children }: PropsWithChildren) {
  const { brand, mode } = useTheme()
  const rt = resolveTheme(brand, mode)

  const themeCfg = useMemo(
    () => ({
      // Always use the default algorithm; we control dark via tokens/our CSS
      algorithm: antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: rt.primaryHex,
        borderRadius: 12,
        // make sure AntD text has good contrast in dark mode
        ...(mode === 'dark'
          ? {
              colorTextBase: '#ffffff',
              colorText: '#ffffff',
              colorTextSecondary: '#e6e6e6',
              colorBorder: 'rgba(255,255,255,.45)',
              colorBorderSecondary: 'rgba(255,255,255,.28)',
              colorBgBase: '#0f0f0f',
              colorBgContainer: '#121212',
            }
          : {
              colorTextBase: '#1b1b1b',
            }),
      },
    }),
    [rt.primaryHex, mode]
  )

  return (
    <ConfigProvider theme={themeCfg}>
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  )
}

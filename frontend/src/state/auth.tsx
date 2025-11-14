import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { Actor } from '../api/types'
import { logout as apiLogout } from '../api/auth'
import { tryRefresh } from '../api/http'

type AuthCtx = {
  actor: Actor | null
  token: string | null
  setAuth: (actor: Actor, token: string, expiresIn?: number) => void
  logout: () => void
}

const Ctx = createContext<AuthCtx>(null as any)

export function AuthProvider({ children }: { children: any }) {
  const [actor, setActor] = useState<Actor | null>(() => (localStorage.getItem('actor') as Actor) || null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('access_token'))
  const timer = useRef<number | null>(null)

  useEffect(() => {
    // react to external refreshes (http.ts dispatches this)
    const onRefreshed = (e: any) => {
      const { token, expires_in } = e.detail || {}
      if (token) {
        setToken(token)
        scheduleRefresh(expires_in)
      }
    }
    window.addEventListener('auth-refreshed', onRefreshed as any)
    return () => window.removeEventListener('auth-refreshed', onRefreshed as any)
  }, [])

  const scheduleRefresh = (expiresIn?: number) => {
    if (timer.current) window.clearTimeout(timer.current)
    if (!expiresIn) return
    const ms = Math.max(5000, (expiresIn - 10) * 1000)
    timer.current = window.setTimeout(async () => {
      try { await tryRefresh() } catch {}
    }, ms) as unknown as number
  }

  const setAuth = (a: Actor, t: string, expiresIn?: number) => {
    setActor(a); setToken(t)
    localStorage.setItem('actor', a)
    localStorage.setItem('access_token', t)
    scheduleRefresh(expiresIn)
    // SPA redirect (no full reload)
    const to = a === 'user' ? '/user' : a === 'admin' ? '/admin' : '/superadmin'
    document.dispatchEvent(new CustomEvent('app-nav', { detail: { to, replace: true } }))
  }

  const logout = async () => {
    try { await apiLogout() } catch {}
    localStorage.removeItem('actor'); localStorage.removeItem('access_token')
    setActor(null); setToken(null)
    if (timer.current) window.clearTimeout(timer.current)
    document.dispatchEvent(new CustomEvent('app-nav', { detail: { to: '/signin', replace: true } }))
  }

  return <Ctx.Provider value={{ actor, token, setAuth, logout }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('AuthProvider missing')
  return ctx
}

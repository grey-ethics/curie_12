// src/pages/SignInPage.tsx
import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { getProfile } from '../api/me'
import { useAuth } from '../state/auth'

export default function SignInPage() {
  const nav = useNavigate()
  const { setAuth } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setErr(null)
    setBusy(true)
    try {
      // 1) Login and get a normalized token
      const tok = await login({ email, password })

      // 2) Make sure subsequent requests are authorized (important!)
      localStorage.setItem('access_token', tok.access_token)

      // 3) Now fetch profile (authorized) to learn the role
      const me = await getProfile()
      const role = me.role
      if (!role) {
        throw new Error('No role returned from server')
      }

      // 4) Commit auth (routes will redirect based on role)
      setAuth(role, tok.access_token, tok.expires_in)
    } catch (e: any) {
      // If login/profile failed, clean up any temp token
      localStorage.removeItem('access_token')
      setErr(e?.message || 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-frame">
        <div className="auth-tabs">
          <button
            type="button"
            className="auth-tab"
            onClick={() => nav('/signup')}
          >
            Sign up
          </button>
          <button type="button" className="auth-tab active">
            Sign in
          </button>
        </div>

        <form onSubmit={onSubmit} className="card auth-card">
          <div className="field">
            <label htmlFor="si-email">Email</label>
            <input
              id="si-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="si-pass">Password</label>
            <input
              id="si-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </div>

          {err && (
            <div className="error" style={{ marginTop: 8 }}>
              {err}
            </div>
          )}
        </form>
      </div>
    </section>
  )
}

// src/pages/SuperAdminLoginPage.tsx
import { FormEvent, useState } from 'react'
import { login } from '../api/auth'
import { getProfile } from '../api/me'
import { useAuth } from '../state/auth'

export default function SuperAdminLoginPage() {
  const { setAuth } = useAuth()
  const [email, setEmail] = useState('super_admin@curie.curie')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setErr(null)
    setBusy(true)
    try {
      const tok = await login({ email, password })
      const me = await getProfile()

      if (me.role !== 'super_admin') {
        setErr('This account is not a super admin')
        setBusy(false)
        return
      }

      setAuth('super_admin', tok.access_token, tok.expires_in)
    } catch (e: any) {
      setErr(e?.message || 'Invalid credentials')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-frame">
        <div className="auth-tabs" style={{ display: 'flex', width: '100%' }}>
          <button
            type="button"
            className="auth-tab active"
            style={{ flex: 1, textAlign: 'center' }}
          >
            Administrator Login
          </button>
        </div>

        <form onSubmit={onSubmit} className="card auth-card">
          <div className="field">
            <label htmlFor="sa-email">Administrator email</label>
            <input
              id="sa-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="sa-pass">Administrator password</label>
            <input
              id="sa-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Checking…' : 'Enter'}
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

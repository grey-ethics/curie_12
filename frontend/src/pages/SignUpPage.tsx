import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerUser, registerAdmin } from '../api/auth'
import Select from '../components/UI/Select'

export default function SignUpPage() {
  const [actor, setActor] = useState<'user' | 'admin'>('user')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [ok, setOk] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const nav = useNavigate()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setOk(null); setErr(null)
    try {
      if (actor === 'user') {
        await registerUser({ email, password, name })
        setOk('User registered!')
      } else {
        await registerAdmin({ email, password, name })
        setOk('Admin registered (pending approval).')
      }
    } catch (e: any) {
      setErr(e?.message || 'Failed')
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-frame">
        {/* Tabs (same combined width as the card below) */}
        <div className="auth-tabs">
          {/* Swapped: Sign up on the LEFT (active), Sign in on the RIGHT */}
          <button type="button" className="auth-tab active">Sign up</button>
          <button
            type="button"
            className="auth-tab"
            onClick={() => nav('/signin')}
          >
            Sign in
          </button>
        </div>

        <form onSubmit={submit} className="card auth-card">
          <div className="field">
            <label>Account Type</label>
            <Select
              value={actor}
              onChange={(v) => setActor(v as any)}
              options={[
                { value: 'user', label: 'User' },
                { value: 'admin', label: 'Admin' },
              ]}
              buttonStyle={{ width: '100%' }}
            />
          </div>

          <div className="field">
            <label htmlFor="su-name">Name</label>
            <input
              id="su-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="su-email">Email</label>
            <input
              id="su-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="field">
            <label htmlFor="su-pass">Password</label>
            <input
              id="su-pass"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {/* keep the same vertical gap as fields */}
          <div className="form-actions">
            <button type="submit">Create account</button>
          </div>

          {ok && <div className="ok" style={{ marginTop: 8 }}>{ok}</div>}
          {err && <div className="error" style={{ marginTop: 8 }}>{err}</div>}
        </form>
      </div>
    </section>
  )
}

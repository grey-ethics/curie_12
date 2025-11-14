/*
- HTTP wrapper for talking to the FastAPI backend.
- Now prefers relative URLs so Vite's dev proxy (5173 → 8000) actually gets used.
- If you define VITE_API_BASE_URL, that will override and we'll hit that directly.
*/

const RAW_BASE = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined
// normalize, but allow "no base" → use relative paths
const API_BASE = RAW_BASE ? RAW_BASE.replace(/\/$/, '') : ''

function buildUrl(path: string): string {
  // absolute URL given → just use it
  if (/^https?:\/\//i.test(path)) return path

  // if user explicitly set a base → stick to it
  if (API_BASE) {
    if (!path.startsWith('/')) path = '/' + path
    return `${API_BASE}${path}`
  }

  // otherwise use relative URL so Vite proxy kicks in
  if (!path.startsWith('/')) path = '/' + path
  return path
}

export const http = {
  async get(path: string) {
    return doFetch(buildUrl(path), { method: 'GET', headers: authHeaders() })
  },
  async post(path: string, body?: any) {
    return doFetch(buildUrl(path), {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
  },
  async postForm(path: string, form: FormData) {
    return doFetch(buildUrl(path), {
      method: 'POST',
      headers: authHeaders(true), // include Accept + Authorization; let browser set boundary
      body: form,
    })
  },
  async patch(path: string, body?: any) {
    return doFetch(buildUrl(path), {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
  },
  async del(path: string) {
    return doFetch(buildUrl(path), { method: 'DELETE', headers: authHeaders() })
  },
}

async function doFetch(url: string, init: RequestInit, _retry = false): Promise<any> {
  let res: Response
  try {
    res = await fetch(url, { ...init, credentials: 'include' })
  } catch (err: any) {
    // this is the "backend not reachable / port wrong / CORS blocked at network level" path
    throw new Error(`${init.method || 'GET'} ${url}: ${err?.message || 'Network error (is the backend running / CORS ok?)'}`)
  }

  if (res.status === 401 && !_retry) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      const retryInit = {
        ...init,
        headers: { ...init.headers, ...authHeaders(hasJson(init.headers)) },
      }
      const res2 = await fetch(url, { ...retryInit, credentials: 'include' })
      await ensureOk(url, retryInit.method || 'GET', res2)
      return jsonMaybe(res2)
    }
  }

  await ensureOk(url, init.method || 'GET', res)
  return jsonMaybe(res)
}

function hasJson(h?: HeadersInit): boolean {
  if (!h) return true
  const obj = h as any
  const ct = obj['Content-Type'] || obj['content-type']
  return Boolean(ct && String(ct).includes('application/json'))
}

function stripBearer(s?: string | null) {
  if (!s) return ''
  return String(s).replace(/^Bearer\s+/i, '')
}

function authHeaders(json = true) {
  // Prefer localStorage, but fall back to cookies if your backend stores it there
  const ls = localStorage.getItem('access_token') || ''
  const cookieToken = getCookie('access_token') || stripBearer(getCookie('Authorization'))
  const t = ls || cookieToken

  const h: Record<string, string> = {}
  if (t) h['Authorization'] = `Bearer ${t}`
  if (json) h['Accept'] = 'application/json'
  const csrf = getCookie('csrf_token')
  if (csrf) h['X-CSRF-Token'] = csrf
  return h
}

async function ensureOk(url: string, method: string, res: Response) {
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const txt = await res.text()
      try {
        const obj = JSON.parse(txt)
        if (Array.isArray(obj?.detail)) {
          message = obj.detail
            .map((d: any) => {
              const loc = Array.isArray(d?.loc) ? d.loc.slice(-1)[0] : d?.loc
              const m = d?.msg || d?.message || JSON.stringify(d)
              return loc ? `${loc}: ${m}` : m
            })
            .join('; ')
        } else if (typeof obj?.detail === 'string') {
          message = obj.detail
        } else if (typeof obj?.error === 'string') {
          message = obj.error
        } else if (txt) {
          message = txt
        }
      } catch {
        if (txt) message = txt
      }
    } catch {
      // ignore
    }
    throw new Error(`${method} ${url}: ${message}`)
  }
}

async function jsonMaybe(res: Response) {
  const ct = res.headers.get('content-type') || ''
  return ct.toLowerCase().includes('application/json') ? res.json() : res.text()
}

function getCookie(name: string) {
  const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')
  return m ? m.pop() : ''
}

export async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    })
    if (!res.ok) return false
    const data = await res.json()
    if (data?.access_token && typeof data?.expires_in === 'number') {
      localStorage.setItem('access_token', data.access_token)
      window.dispatchEvent(
        new CustomEvent('auth-refreshed', {
          detail: { expires_in: data.expires_in, token: data.access_token },
        }),
      )
      return true
    }
    return false
  } catch {
    return false
  }
}

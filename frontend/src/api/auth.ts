// src/api/auth.ts
/**
 * Frontend auth client matched to THIS backend:
 * backend routes are all under /auth/...
 *   POST /auth/login
 *   POST /auth/register/user
 *   POST /auth/register/admin
 *   POST /auth/refresh
 *   POST /auth/logout
 */
import { http } from './http'
import type { Actor, TokenResponse } from './types'

type LoginBase = {
  email: string
  password: string
}

type LoginWithActor = LoginBase & {
  actor: Actor | 'auto'
}

function toNumber(n: any, fallback: number) {
  const v = Number(n)
  return Number.isFinite(v) ? v : fallback
}

/**
 * Normalize any backend login response shape into:
 *   { access_token: string, expires_in: number, token_type?: string }
 */
export async function login(payload: LoginBase | LoginWithActor): Promise<TokenResponse> {
  const { email, password } = payload
  const data = await http.post('/auth/login', { email, password })

  // Accept a variety of token field names / shapes
  let token: string | null =
    data?.access_token ??
    data?.access ??
    data?.token ??
    data?.accessToken ??
    data?.id_token ??
    (typeof data === 'string' ? data : null)

  if (!token || typeof token !== 'string') {
    throw new Error('Login response missing an access token')
  }

  const token_type: string | undefined = typeof data?.token_type === 'string' ? data.token_type : undefined
  const expires_in: number = toNumber(data?.expires_in ?? data?.expiresIn ?? data?.expires, 3600)

  return { access_token: token, token_type, expires_in }
}

// super-admin helper: same endpoint, just default email
export async function loginSuperAdminPassword(
  password: string,
  email = 'super_admin@curie.curie'
): Promise<TokenResponse> {
  return login({ email, password })
}

// user registration
export async function registerUser(body: {
  email: string
  password: string
  name?: string
}) {
  return http.post('/auth/register/user', body)
}

// admin registration
export async function registerAdmin(body: {
  email: string
  password: string
  name?: string
}) {
  return http.post('/auth/register/admin', body)
}

// logout
export async function logout() {
  return http.post('/auth/logout')
}

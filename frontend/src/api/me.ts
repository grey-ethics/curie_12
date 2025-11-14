// src/api/me.ts
import { http } from './http'
import type { Profile } from './types'

// GET /profile/
export async function getProfile(): Promise<Profile> {
  return http.get('/profile/')
}

// PATCH /profile/ { name }
export async function updateName(name: string): Promise<Profile> {
  return http.patch('/profile/', { name })
}

// POST /profile/password
export async function changePassword(
  current_password: string,
  new_password: string
): Promise<{ success: boolean }> {
  return http.post('/profile/password', { current_password, new_password })
}

// POST /profile/logo (multipart)
export async function uploadLogo(file: File): Promise<Profile> {
  const fd = new FormData()
  fd.append('file', file)
  return http.postForm('/profile/logo', fd)
}

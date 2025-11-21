/*
- file: src/api/admin.ts
- purpose: admin-facing RAG document API with resilient per-file upload results (success or error).
- Changes in this revision:
  • Clean up error messages by stripping the "METHOD URL:" prefix so the UI shows only the backend reason.
*/

import { http } from './http'

export type UploadOk = { ok: true; data: any }
export type UploadErr = { ok: false; filename: string; error: string }
export type UploadResult = UploadOk | UploadErr

// single-line comment: POST one file per request; never throw overall—collect results.
export async function uploadDocuments(files: File[]): Promise<{ items: UploadResult[] }> {
  const items: UploadResult[] = []
  for (const f of files) {
    const fd = new FormData()
    fd.append('file', f)
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await http.postForm('/admin/rag-documents/', fd)
      items.push({ ok: true, data: res })
    } catch (e: any) {
      const raw = e?.message || 'Upload failed'
      const msg = String(raw).replace(/^[A-Z]+?\s+\S+?:\s*/i, '').trim() // strip "POST /path: "
      items.push({ ok: false, filename: f.name, error: msg })
    }
  }
  return { items }
}

// single-line comment: GET /admin/rag-documents/
export async function listDocuments() {
  return http.get('/admin/rag-documents/').catch(() => ({ items: [] }))
}

// helper: read cookies for CSRF
function getCookie(name: string) {
  const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')
  return m ? m.pop() : ''
}

// helper: auth headers (used by download)
function authHeaders(includeJson = false) {
  const t = localStorage.getItem('access_token') || ''
  const h: Record<string, string> = {}
  if (t) h['Authorization'] = `Bearer ${t}`
  if (includeJson) h['Accept'] = 'application/json'
  const csrf = getCookie('csrf_token')
  if (csrf) h['X-CSRF-Token'] = csrf
  return h
}

// single-line comment: GET /admin/rag-documents/{id} then stream from /static/<relative path>
export async function downloadDocument(
  documentId: number
): Promise<{ blob: Blob; filename: string }> {
  const meta = await http.get(`/admin/rag-documents/${documentId}`)
  const filePath: string | null = meta?.file_path || null
  const filename: string = meta?.filename || `document-${documentId}`

  if (!filePath) throw new Error('No file_path available for this document')

  const normalized = filePath.startsWith('/static/')
    ? filePath
    : `/static/${filePath.replace(/^\/+/, '')}`

  const res = await fetch(normalized, {
    method: 'GET',
    headers: authHeaders(false),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const blob = await res.blob()
  return { blob, filename }
}

// single-line comment: DELETE /admin/rag-documents/{id}
export async function deleteDocument(documentId: number) {
  return http.del(`/admin/rag-documents/${documentId}`)
}

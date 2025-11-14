/*
- file: src/api/admin.ts
- purpose: admin-facing RAG document API that matches backend /admin/rag-documents/* routes
- notes: backend takes ONE UploadFile per request; we loop client-side for multi-upload
*/
import { http } from './http'

// uploadDocuments: POST /admin/rag-documents/ (one file per request)
export async function uploadDocuments(files: File[]) {
  const results: any[] = []
  for (const f of files) {
    const fd = new FormData()
    fd.append('file', f)
    // backend route from the snapshot: /admin/rag-documents/
    // returns a RagDocumentResponse
    // eslint-disable-next-line no-await-in-loop
    const res = await http.postForm('/admin/rag-documents/', fd)
    results.push(res)
  }
  return { items: results }
}

// listDocuments: GET /admin/rag-documents/
export async function listDocuments() {
  return http.get('/admin/rag-documents/').catch(() => ({ items: [] }))
}

// helper: read cookies for CSRF
function getCookie(name: string) {
  const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')
  return m ? m.pop() : ''
}

// helper: auth headers
function authHeaders(includeJson = false) {
  const t = localStorage.getItem('access_token') || ''
  const h: Record<string, string> = {}
  if (t) h['Authorization'] = `Bearer ${t}`
  if (includeJson) h['Accept'] = 'application/json'
  const csrf = getCookie('csrf_token')
  if (csrf) h['X-CSRF-Token'] = csrf
  return h
}

// downloadDocument: GET meta /admin/rag-documents/{id} -> then fetch /static/<file_path>
export async function downloadDocument(
  documentId: number
): Promise<{ blob: Blob; filename: string }> {
  // 1) get metadata
  const meta = await http.get(`/admin/rag-documents/${documentId}`)
  const filePath: string | null = meta?.file_path || null
  const filename: string = meta?.filename || `document-${documentId}`

  if (!filePath) {
    throw new Error('No file_path available for this document')
  }

  // backend likely serves these under /static/…
  const normalized = filePath.startsWith('/static/')
    ? filePath
    : `/static/${filePath.replace(/^\/+/, '')}`

  const res = await fetch(normalized, {
    method: 'GET',
    headers: authHeaders(false),
    credentials: 'include',
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  const blob = await res.blob()
  return { blob, filename }
}

// deleteDocument: DELETE /admin/rag-documents/{id}
export async function deleteDocument(documentId: number) {
  return http.del(`/admin/rag-documents/${documentId}`)
}

/*
- Aligns sendMessage with backend (JSON body).
- Adds API calls to run/cancel tool widgets anchored to assistant messages.
- CHANGE: add runResumeMatchWidgetUpload(...) that posts multipart with files.
*/

import { http } from './http'
import type {
  ChatMessage,
  ChatMessageExchange,
  ChatSession,
  ToolInvocationRunResponse,
} from './types'

/* ---------- sessions ---------- */

export async function listSessions(): Promise<{ items: ChatSession[] }> {
  return http.get('/chat/sessions')
}

export async function createSession(title?: string | null): Promise<ChatSession> {
  return http.post('/chat/sessions', { title: title ?? null })
}

export async function renameSession(id: number, title: string | null): Promise<ChatSession> {
  return http.patch(`/chat/sessions/${id}`, { title })
}

export async function deleteSession(id: number) {
  return http.del(`/chat/sessions/${id}`)
}

export async function getMessages(id: number): Promise<{ items: ChatMessage[] }> {
  return http.get(`/chat/sessions/${id}/messages`)
}

/* ---------- send message (JSON, text-only) ---------- */

export async function sendMessage(id: number, content: string): Promise<ChatMessageExchange> {
  const text = (content ?? '').trim() || '(message)'
  return http.post(`/chat/sessions/${id}/messages`, { content: text })
}

export async function sendMessageMultipart(
  id: number,
  content: string,
  _files?: File[]
): Promise<ChatMessageExchange> {
  return sendMessage(id, content)
}

/* ---------- widgets (tools) ---------- */

export async function runResumeMatchWidget(
  sessionId: number,
  invocationId: number,
  payload: { job_description: string; resumes: Array<{ name: string; text: string }> }
): Promise<ToolInvocationRunResponse> {
  return http.post(`/chat/sessions/${sessionId}/tools/${invocationId}/resume-match`, payload)
}

// single-line comment: NEW — upload files instead of paste-in resumes.
export async function runResumeMatchWidgetUpload(
  sessionId: number,
  invocationId: number,
  form: FormData
): Promise<ToolInvocationRunResponse> {
  return http.postForm(`/chat/sessions/${sessionId}/tools/${invocationId}/resume-match/upload`, form)
}

export async function runDocGenWidget(
  sessionId: number,
  invocationId: number,
  payload: { template: string; variables?: Record<string, any> | null }
): Promise<ToolInvocationRunResponse> {
  return http.post(`/chat/sessions/${sessionId}/tools/${invocationId}/doc-gen`, payload)
}

export async function cancelWidget(sessionId: number, invocationId: number) {
  return http.post(`/chat/sessions/${sessionId}/tools/${invocationId}/cancel`)
}

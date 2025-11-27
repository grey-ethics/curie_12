/*
- file: src/api/types.ts
- purpose:
  - Shared TypeScript types for API responses.
  - Chat + profile + admin tables + notifications.
- changes:
  - Added NotificationRow interface.
*/

export type Actor = 'user' | 'admin' | 'super_admin' | string

// ---------- AUTH ----------
export interface TokenResponse {
  access_token: string
  token_type?: string
  expires_in: number
}

// ---------- CHAT ----------
export interface ChatSession {
  id: number
  title: string | null
  running_summary: string | null
}

export interface ChatFile {
  id: number
  session_id: number
  message_id: number
  file_kind: 'input' | 'output' | string
  original_filename: string
  stored_path: string
  mime_type: string | null
  file_size: number
  web_path: string | null
}

// single-line comment: Tool invocation attached to an assistant message when a widget should open.
export interface ChatToolInvocation {
  id: number
  tool_type: 'resume_match' | 'doc_gen' | string
  status: 'pending' | 'completed' | 'cancelled' | string
  input_payload?: Record<string, any> | null
  result_payload?: Record<string, any> | null
}

export interface ChatMessage {
  id: number
  role: string
  content: string
  files?: ChatFile[]
  tool_invocation?: ChatToolInvocation | null
}

export interface ChatMessageExchange {
  user_message: ChatMessage
  assistant_message: ChatMessage
}

// single-line comment: Response after running a widget once.
export interface ToolInvocationRunResponse {
  invocation: ChatToolInvocation
  assistant_message?: ChatMessage | null
}

// ---------- PROFILE ----------
export interface Profile {
  id: number
  email: string
  name: string | null
  role: Actor
  logo_url: string | null
}

// ---------- SUPER ADMIN ----------
export interface AccountRow {
  id: number
  email: string
  name: string | null
  role: string
  status: string
  logo_url?: string | null
}

// ---------- NOTIFICATIONS ----------
export interface NotificationRow {
  id: number
  recipient_email: string
  recipient_role: string
  actor_email?: string | null
  goal_type: string
  goal_id: string
  project_id?: string | null
  quarter?: string | null
  year?: string | null
  message: string
  seen: boolean
  source_updated_at?: string | null
  created_at: string
}

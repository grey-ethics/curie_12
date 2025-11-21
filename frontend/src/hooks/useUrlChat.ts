/*
- Inline rename now sanitizes and clamps the title on the client:
  • Collapse whitespace, trim, and slice to 45 chars before calling API.
  • Also keeps old prompt flow when no title provided to rename().
- All other behavior (routing, loading, sending) unchanged.
*/
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import * as chat from '../api/chat'
import type { ChatMessage, ChatSession } from '../api/types'

type Base = 'user' | 'admin'
const MAX_TITLE = 45

// single-line comment: Normalize and clamp a session title on the client.
function sanitizeTitle(t: string) {
  const normalized = (t ?? '').replace(/\s+/g, ' ').trim()
  return normalized.slice(0, MAX_TITLE)
}

export function useUrlChat(base: Base) {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const params = useParams<{ sid?: string }>()
  const sid = params.sid ? Number(params.sid) : null
  const prefix = base === 'user' ? '/user/chat' : '/admin/user/chat'

  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])

  // single-line comment: Boot – fetch sessions and ensure URL has a session id.
  useEffect(() => {
    ;(async () => {
      const res = await chat.listSessions()
      setSessions(res.items)
      if (!sid) {
        const first = res.items[0]?.id
        if (first) nav(`${prefix}/${first}`, { replace: true })
        else nav(`${prefix}`, { replace: true })
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix])

  async function loadMessages(sessionId: number) {
    try {
      const m = await chat.getMessages(sessionId)
      setMessages(m.items)
    } catch {
      setMessages([])
    }
  }

  const reload = async () => { if (sid) await loadMessages(sid) }
  useEffect(() => { if (!sid) { setMessages([]); return } void loadMessages(sid) }, [sid])

  const open = (id: number) => nav(`${prefix}/${id}`)

  const create = async () => {
    const s = await chat.createSession()
    setSessions(v => [s, ...v])
    nav(`${prefix}/${s.id}`)
  }

  // single-line comment: Inline-friendly rename; optional title bypasses prompt and is sanitized.
  const rename = async (id: number, newTitle?: string) => {
    let title: string | null | undefined = newTitle
    if (title === undefined) title = window.prompt('New title?')
    if (title === null || title === undefined) return
    const final = sanitizeTitle(title)
    const s = await chat.renameSession(id, final)
    setSessions(v => v.map(x => (x.id === id ? s : x)))
  }

  const remove = async (id: number) => {
    await chat.deleteSession(id)
    setSessions(prev => {
      const next = prev.filter(x => x.id !== id)
      if (sid === id) {
        const nextId = next[0]?.id
        nav(nextId ? `${prefix}/${nextId}` : `${prefix}`)
      }
      return next
    })
  }

  const send = async (id: number, content: string) => {
    try {
      await chat.sendMessage(id, content?.trim() || '(message)')
    } catch (e: any) {
      alert(e?.message || 'Failed to send message')
    } finally {
      await loadMessages(id)
    }
  }

  const active = sid
  const title = useMemo(() => sessions.find(x => x.id === sid)?.title || 'Chat Session', [sessions, sid])

  return { sessions, active, messages, title, open, create, rename, remove, send, reload, prefix, pathname }
}

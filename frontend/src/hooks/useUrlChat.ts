/*
- Keeps the hook API but adds reload() so children can refresh messages after widget runs.
- send() remains JSON text-only.
*/

import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import * as chat from '../api/chat'
import type { ChatMessage, ChatSession } from '../api/types'

type Base = 'user' | 'admin'

// single-line comment: useUrlChat wires URL state ↔ chat API and exposes helpers for the chat pages.
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

  // single-line comment: Helper – fetch messages for a session.
  async function loadMessages(sessionId: number) {
    try {
      const m = await chat.getMessages(sessionId)
      setMessages(m.items)
    } catch {
      setMessages([])
    }
  }

  // single-line comment: Public reload so children can refresh after widget actions.
  const reload = async () => {
    if (sid) await loadMessages(sid)
  }

  // single-line comment: When active session changes, (re)load messages.
  useEffect(() => {
    if (!sid) { setMessages([]); return }
    void loadMessages(sid)
  }, [sid])

  // single-line comment: Navigation helpers and CRUD.
  const open = (id: number) => nav(`${prefix}/${id}`)

  const create = async () => {
    const s = await chat.createSession()
    setSessions(v => [s, ...v])
    nav(`${prefix}/${s.id}`)
  }

  const rename = async (id: number) => {
    const title = window.prompt('New title?')
    if (!title && title !== '') return
    const s = await chat.renameSession(id, title)
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

  // single-line comment: Send a text-only message; backend expects JSON { content }.
  const send = async (id: number, content: string) => {
    try {
      await chat.sendMessage(id, content?.trim() || '(message)')
    } catch (e: any) {
      alert(e?.message || 'Failed to send message')
    } finally {
      await loadMessages(id) // always sync to server truth
    }
  }

  const active = sid
  const title = useMemo(() => {
    const s = sessions.find(x => x.id === sid)
    return s?.title || 'Chat Session'
  }, [sessions, sid])

  return {
    sessions,
    active,
    messages,
    title,
    open,
    create,
    rename,
    remove,
    send,
    reload,
    prefix,
    pathname,
  }
}

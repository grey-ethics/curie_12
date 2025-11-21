/**
 * AdminSidebar
 * - Fix: session name cell no longer pushes action buttons; CSS handles grid+ellipsis.
 * - UX: add maxlength={45} to inline rename input to mirror backend cap.
 * - No behavior changes to routing/accordion.
 */

import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUrlChat } from '../../hooks/useUrlChat'
import { ADMIN_NAV } from '../../state/nav'

// single-line comment: Small chevron that rotates with the accordion.
function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      style={{
        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform var(--accordion-speed) var(--accordion-ease)',
      }}
    >
      <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

// single-line comment: User sessions section shown under the "User Options" accordion.
function UserSection() {
  const { sessions, active, open, create, rename, remove } = useUrlChat('admin')
  const [editing, setEditing] = useState<{ id: number; title: string } | null>(null)

  const begin = (id: number, t: string) => setEditing({ id, title: t || '' })
  const commit = async () => {
    if (!editing) return
    await rename(editing.id, editing.title)
    setEditing(null)
  }

  return (
    <>
      <div className="sidebar-section" style={{ display: 'grid', gap: 8 }}>
        <button type="button" onClick={create} className="btn-float">+ New Chat</button>
      </div>

      <div className="sidebar-section">
        <div className="chat-sessions">
          <ul>
            {sessions.map(s => {
              const isEditing = editing?.id === s.id
              return (
                <li key={s.id} className={`session-row ${s.id === active ? 'active' : ''}`}>
                  {!isEditing ? (
                    <>
                      <button type="button" className="session-name" onClick={() => open(s.id)}>
                        {s.title || `Session #${s.id}`}
                      </button>
                      <div className="row-actions">
                        <button type="button" className="icon-btn" onClick={() => begin(s.id, s.title || '')} title="Rename" aria-label="Rename session">
                          <img src="/assets/icons/rename_session_icon.png" alt="" />
                        </button>
                        <button type="button" className="icon-btn" onClick={() => remove(s.id)} title="Delete" aria-label="Delete session">
                          <img src="/assets/icons/delete_session_icon.png" alt="" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <input
                        className="session-edit"
                        value={editing.title}
                        maxLength={45}
                        onChange={(e) => setEditing({ id: s.id, title: e.target.value })}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void commit()
                          if (e.key === 'Escape') setEditing(null)
                        }}
                      />
                      <div className="row-actions">
                        <button type="button" className="icon-btn" onClick={() => void commit()} title="Save" aria-label="Save">
                          <img src="/assets/icons/tick_icon.png" alt="" />
                        </button>
                        <button type="button" className="icon-btn" onClick={() => setEditing(null)} title="Cancel" aria-label="Cancel">
                          <img src="/assets/icons/cross_icon.png" alt="" />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </>
  )
}

// single-line comment: Main sidebar with two accordion groups.
export default function AdminSidebar() {
  const nav = useNavigate()
  const { pathname } = useLocation()

  const initial = useMemo<'admin' | 'user'>(() => {
    return pathname.startsWith('/admin/user') ? 'user' : 'admin'
  }, [pathname])

  const LS_KEY = 'adminSidebar.open'
  const [openPanel, setOpenPanel] = useState<'admin' | 'user'>(() => {
    const saved = (localStorage.getItem(LS_KEY) as 'admin' | 'user' | null) || initial
    return (saved === 'user' || saved === 'admin') ? saved : 'admin'
  })

  useEffect(() => { localStorage.setItem(LS_KEY, openPanel) }, [openPanel])

  const toggleTo = (panel: 'admin' | 'user') => {
    setOpenPanel(panel)
    if (panel === 'admin' && !pathname.startsWith('/admin/admin')) nav('/admin/admin')
    if (panel === 'user' && !pathname.startsWith('/admin/user')) nav('/admin/user')
  }

  const adminChildren = ADMIN_NAV[0]?.children ?? []

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <button
          type="button"
          className="accordion-header btn-glass"
          aria-expanded={openPanel === 'admin'}
          aria-controls="admin-accordion-body"
          onClick={() => toggleTo('admin')}
        >
          <span className="admin-label">Admin Options</span>
          <Chevron expanded={openPanel === 'admin'} />
        </button>

        <div id="admin-accordion-body" className={`accordion-body ${openPanel === 'admin' ? 'open' : ''}`} role="region" aria-label="Admin options">
          <div style={{ display: 'grid', gap: 8 }}>
            {adminChildren.map(it => (
              <button
                type="button"
                key={it.id}
                onClick={() => nav(it.path)}
                className={`btn-float nav-item ${pathname.startsWith(it.path) ? 'active' : ''}`}
              >
                {it.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <button
          type="button"
          className="accordion-header btn-glass"
          aria-expanded={openPanel === 'user'}
          aria-controls="user-accordion-body"
          onClick={() => toggleTo('user')}
        >
          <span className="user-label">User Options</span>
          <Chevron expanded={openPanel === 'user'} />
        </button>

        <div id="user-accordion-body" className={`accordion-body ${openPanel === 'user' ? 'open' : ''}`} role="region" aria-label="User options">
          {pathname.startsWith('/admin/user') ? (
            <UserSection />
          ) : (
            <div style={{ fontSize: 12, color: 'var(--muted)', padding: '6px 2px' }}>
              Navigating to User Options…
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

/*
- file: src/components/Sidebar/UserSidebar.tsx
- purpose:
  - User portal left sidebar.
  - Shows a small nav area + chat sessions list with inline rename/delete.
- changes:
  - Added a single "Notifications" button above Chats to match requested layout.
  - Chat session logic unchanged.
*/

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUrlChat } from '../../hooks/useUrlChat'

type Editing = { id: number; title: string } | null

// single-line comment: User-facing nav + chat session list with inline rename/delete.
export default function UserSidebar() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const { sessions, active, open, create, rename, remove } = useUrlChat('user')
  const [editing, setEditing] = useState<Editing>(null)

  // single-line comment: Begin inline edit for a session title.
  const beginEdit = (id: number, current: string) =>
    setEditing({ id, title: current || '' })

  // single-line comment: Commit inline edit to backend then clear editing state.
  const commitEdit = async () => {
    if (!editing) return
    await rename(editing.id, editing.title)
    setEditing(null)
  }

  // single-line comment: Cancel inline edit.
  const cancelEdit = () => setEditing(null)

  const onGoNotifications = () => nav('/user/notifications')

  return (
    <aside className="sidebar">
      <div className="sidebar-section" style={{ display: 'grid', gap: 8 }}>
        <h4>Menu</h4>
        <button
          type="button"
          onClick={onGoNotifications}
          className={`btn-float nav-item ${pathname.startsWith('/user/notifications') ? 'active' : ''}`}
        >
          Notifications
        </button>
      </div>

      <div className="sidebar-section" style={{ display: 'grid', gap: 8 }}>
        <h4>Chats</h4>
        <button
          onClick={create}
          style={{ padding: 8, border: '1px solid var(--border)', background: 'var(--bg)', borderRadius: 6, cursor: 'pointer' }}
        >
          + New Chat
        </button>
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
                      <button className="session-name" onClick={() => open(s.id)}>
                        {s.title || `Session #${s.id}`}
                      </button>
                      <div className="row-actions">
                        <button className="icon-btn" onClick={() => beginEdit(s.id, s.title || '')} title="Rename">
                          <img src="/assets/icons/rename_session_icon.png" alt="Rename" />
                        </button>
                        <button className="icon-btn" onClick={() => remove(s.id)} title="Delete">
                          <img src="/assets/icons/delete_session_icon.png" alt="Delete" />
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
                          if (e.key === 'Enter') void commitEdit()
                          if (e.key === 'Escape') cancelEdit()
                        }}
                      />
                      <div className="row-actions">
                        <button className="icon-btn" onClick={() => void commitEdit()} title="Save">
                          <img src="/assets/icons/tick_icon.png" alt="Save" />
                        </button>
                        <button className="icon-btn" onClick={cancelEdit} title="Cancel">
                          <img src="/assets/icons/cross_icon.png" alt="Cancel" />
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
    </aside>
  )
}

/**
 * UserSidebar
 * - Add maxlength={45} to inline rename input to mirror backend constraint.
 * - Layout/ellipsis handled by CSS so buttons stay visible.
 */
import { useState } from 'react'
import { useUrlChat } from '../../hooks/useUrlChat'

type Editing = { id: number; title: string } | null

// single-line comment: User-facing chat session list with inline rename/delete.
export default function UserSidebar() {
  const { sessions, active, open, create, rename, remove } = useUrlChat('user')
  const [editing, setEditing] = useState<Editing>(null)

  const beginEdit = (id: number, current: string) =>
    setEditing({ id, title: current || '' })
  const commitEdit = async () => {
    if (!editing) return
    await rename(editing.id, editing.title)
    setEditing(null)
  }
  const cancelEdit = () => setEditing(null)

  return (
    <aside className="sidebar">
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

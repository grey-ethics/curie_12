import { useLocation, useNavigate } from 'react-router-dom'
import { useUrlChat } from '../../hooks/useUrlChat'
import { ADMIN_NAV } from '../../state/nav'

function UserSection() {
  const { sessions, active, open, create, rename, remove } = useUrlChat('admin')
  return (
    <>
      {/* New chat */}
      <div className="sidebar-section" style={{ display: 'grid', gap: 8 }}>
        <button
          onClick={create}
          style={{ padding: 8, border: '1px solid var(--border)', background: 'var(--bg)', borderRadius: 6, cursor: 'pointer' }}
        >
          + New Chat
        </button>
      </div>

      {/* Session list */}
      <div className="sidebar-section">
        <div className="chat-sessions">
          <ul>
            {sessions.map(s => (
              <li key={s.id} className={s.id === active ? 'active' : ''}>
                <button onClick={() => open(s.id)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                  {s.title || `Session #${s.id}`}
                </button>
                <div className="row-actions">
                  <button onClick={() => rename(s.id)} title="Rename" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✎</button>
                  <button onClick={() => remove(s.id)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}

export default function AdminSidebar() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const isUserPane = pathname.startsWith('/admin/user')

  return (
    <aside className="sidebar">
      {/* Top: Admin options */}
      <div className="sidebar-section">
        <h4>Admin Options</h4>
        <div style={{ display: 'grid', gap: 8 }}>
          {ADMIN_NAV[0].children?.map(it => (
            <button
              key={it.id}
              onClick={() => nav(it.path)}
              className={pathname.startsWith(it.path) ? 'active' : ''}
              style={{ textAlign: 'left', padding: '8px 10px', border: '1px solid var(--border)', background: 'var(--bg)', borderRadius: 6, cursor: 'pointer' }}
            >
              {it.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom: User options */}
      <div className="sidebar-section">
        <h4 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>User Options</span>
          <button
            onClick={() => nav('/admin/user')}
            className={isUserPane ? 'active' : ''}
            style={{ marginLeft: 'auto', padding: '4px 8px', border: '1px solid var(--border)', background: 'var(--bg)', borderRadius: 6, cursor: 'pointer' }}
          >
            {isUserPane ? 'Active' : 'Open'}
          </button>
        </h4>
        {isUserPane ? (
          <UserSection />
        ) : (
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Open to manage chats like a user (sessions, etc.).
          </div>
        )}
      </div>
    </aside>
  )
}

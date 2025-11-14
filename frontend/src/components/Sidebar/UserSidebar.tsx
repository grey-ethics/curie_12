import { useUrlChat } from '../../hooks/useUrlChat'

export default function UserSidebar() {
  const { sessions, active, open, create, rename, remove } = useUrlChat('user')

  return (
    <aside className="sidebar">
      {/* New Chat */}
      <div className="sidebar-section" style={{ display: 'grid', gap: 8 }}>
        <h4>Chats</h4>
        <button
          onClick={create}
          style={{ padding: 8, border: '1px solid var(--border)', background: 'var(--bg)', borderRadius: 6, cursor: 'pointer' }}
        >
          + New Chat
        </button>
      </div>

      {/* Sessions list */}
      <div className="sidebar-section">
        <div className="chat-sessions">
          <ul>
            {sessions.map(s => (
              <li key={s.id} className={s.id === active ? 'active' : ''}>
                <button
                  onClick={() => open(s.id)}
                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
                >
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
    </aside>
  )
}

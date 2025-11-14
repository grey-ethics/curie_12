// src/components/Sidebar/SuperAdminSidebar.tsx
import { useNavigate, useLocation } from 'react-router-dom'

export default function SuperAdminSidebar() {
  const nav = useNavigate()
  const { pathname } = useLocation()

  const isAdmins = pathname.startsWith('/superadmin/admins')
  const isUsers = pathname.startsWith('/superadmin/users')

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h4>Super Admin</h4>

        <div style={{ display: 'grid', gap: 8 }}>
          <button
            onClick={() => nav('/superadmin/admins')}
            className={isAdmins ? 'active' : ''}
            style={{
              textAlign: 'left',
              padding: '8px 10px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Admins
          </button>

          <button
            onClick={() => nav('/superadmin/users')}
            className={isUsers ? 'active' : ''}
            style={{
              textAlign: 'left',
              padding: '8px 10px',
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Users
          </button>
        </div>
      </div>
    </aside>
  )
}

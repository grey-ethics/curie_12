import { Outlet } from 'react-router-dom'
import HeaderBar from '../components/HeaderBar'
import { useAuth } from '../state/auth'
import UserSidebar from '../components/Sidebar/UserSidebar'
import AdminSidebar from '../components/Sidebar/AdminSidebar'
import SuperAdminSidebar from '../components/Sidebar/SuperAdminSidebar'

export default function PortalLayout() {
  const { actor } = useAuth()
  const isUser = actor === 'user'
  const isAdmin = actor === 'admin'
  const isSA = actor === 'super_admin'

  return (
    <div className="app-root">
      <HeaderBar context="portal" />
      <div className="portal-body">
        {isUser && <UserSidebar />}
        {isAdmin && <AdminSidebar />}
        {isSA && <SuperAdminSidebar />}
        <main className="main portal-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/*
- file: src/app/routes.tsx
- purpose: App-level route definitions for public, user, admin, and super-admin areas.
- changes:
  - Added NotificationsPage routes for user and admin portals.
  - No changes to existing routes/guards.
*/

import { Routes, Route, Navigate } from 'react-router-dom'
import PublicLayout from '../layouts/PublicLayout'
import PortalLayout from '../layouts/PortalLayout'
import LandingPage from '../pages/LandingPage'
import SignInPage from '../pages/SignInPage'
import SignUpPage from '../pages/SignUpPage'
import RagDocumentsPage from '../pages/admin/RagDocuments'
import SuperAdminAdminsPage from '../pages/superadmin/SuperAdminAdminsPage'
import SuperAdminUsersPage from '../pages/superadmin/SuperAdminUsersPage'
import SuperAdminLoginPage from '../pages/SuperAdminLoginPage'
import { useAuth } from '../state/auth'
import UserChatPage from '../pages/user/UserChatMain'
import AdminUserChatMain from '../pages/admin/AdminUserChatMain'
import NotificationsPage from '../pages/NotificationsPage'

// single-line comment: Central routing switch based on actor role.
export default function RoutesView() {
  const { actor } = useAuth()

  return (
    <Routes>
      {/* PUBLIC */}
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        {/* super admin login entry */}
        <Route path="/administrator" element={<SuperAdminLoginPage />} />
      </Route>

      {/* AUTH'D AREAS */}
      <Route element={<PortalLayout />}>
        {/* USER PORTAL */}
        <Route
          path="/user"
          element={
            actor === 'user' ? (
              <Navigate to="/user/chat" replace />
            ) : (
              <Navigate to="/signin" />
            )
          }
        />
        <Route
          path="/user/chat"
          element={actor === 'user' ? <UserChatPage /> : <Navigate to="/signin" />}
        />
        <Route
          path="/user/chat/:sid"
          element={actor === 'user' ? <UserChatPage /> : <Navigate to="/signin" />}
        />
        <Route
          path="/user/notifications"
          element={actor === 'user' ? <NotificationsPage /> : <Navigate to="/signin" />}
        />

        {/* ADMIN PORTAL */}
        <Route
          path="/admin"
          element={
            actor === 'admin' ? (
              <Navigate to="/admin/admin" replace />
            ) : (
              <Navigate to="/signin" />
            )
          }
        />
        <Route
          path="/admin/admin"
          element={
            actor === 'admin' ? (
              <RagDocumentsPage />
            ) : (
              <Navigate to="/signin" />
            )
          }
        />

        <Route
          path="/admin/notifications"
          element={actor === 'admin' ? <NotificationsPage /> : <Navigate to="/signin" />}
        />

        <Route
          path="/admin/user"
          element={
            actor === 'admin' ? (
              <Navigate to="/admin/user/chat" replace />
            ) : (
              <Navigate to="/signin" />
            )
          }
        />
        <Route
          path="/admin/user/chat"
          element={
            actor === 'admin' ? (
              <AdminUserChatMain />
            ) : (
              <Navigate to="/signin" />
            )
          }
        />
        <Route
          path="/admin/user/chat/:sid"
          element={
            actor === 'admin' ? (
              <AdminUserChatMain />
            ) : (
              <Navigate to="/signin" />
            )
          }
        />

        {/* SUPER ADMIN PORTAL */}
        <Route
          path="/superadmin"
          element={
            actor === 'super_admin' ? (
              <Navigate to="/superadmin/admins" replace />
            ) : (
              <Navigate to="/signin" />
            )
          }
        />

        <Route
          path="/superadmin/admins"
          element={
            actor === 'super_admin' ? (
              <SuperAdminAdminsPage />
            ) : (
              <Navigate to="/signin" />
            )
          }
        />

        <Route
          path="/superadmin/users"
          element={
            actor === 'super_admin' ? (
              <SuperAdminUsersPage />
            ) : (
              <Navigate to="/signin" />
            )
          }
        />
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

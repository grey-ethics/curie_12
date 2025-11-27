/*
- file: src/state/nav.ts
- purpose: Navigation definitions for user/admin sidebars.
- changes:
  - Added Notifications nav item for users.
  - Added Notifications nav item inside admin options.
*/

export type NavItem = {
  id: string
  label: string
  path: string
  children?: NavItem[]
}

export const USER_NAV: NavItem[] = [
  { id: 'chat', label: 'Chat', path: '/user/chat' },
  { id: 'notifications', label: 'Notifications', path: '/user/notifications' },
]

export const ADMIN_NAV: NavItem[] = [
  {
    id: 'admin',
    label: 'Admin Options',
    path: '/admin/admin',
    children: [
      { id: 'uploads', label: 'Rag Documents', path: '/admin/admin' },
      { id: 'notifications', label: 'Notifications', path: '/admin/notifications' },
    ],
  },
  { id: 'user', label: 'User Options', path: '/admin/user' },
]

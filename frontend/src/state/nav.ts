export type NavItem = {
  id: string
  label: string
  path: string
  children?: NavItem[]
}

export const USER_NAV: NavItem[] = [
  { id: 'chat', label: 'Chat', path: '/user/chat' },
]

export const ADMIN_NAV: NavItem[] = [
  {
    id: 'admin',
    label: 'Admin Options',
    path: '/admin/admin',
    children: [
      { id: 'uploads', label: 'Upload & Documents', path: '/admin/admin' },
    ],
  },
  { id: 'user', label: 'User Options', path: '/admin/user' },
]

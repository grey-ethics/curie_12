/*
- file: src/api/notifications.ts
- purpose:
  - Frontend client for Curie notifications endpoints.
  - Uses shared http wrapper with auth/cookies.
- endpoints:
  - GET /notifications/me
  - PATCH /notifications/{id}/seen
  - PATCH /notifications/mark-all-seen
*/

import { http } from './http'
import type { NotificationRow } from './types'

// single-line comment: List current user's notifications (latest first).
export async function listMyNotifications(limit = 50): Promise<{ items: NotificationRow[] }> {
  return http.get(`/notifications/me?limit=${limit}`)
}

// single-line comment: Mark one notification as seen.
export async function markNotificationSeen(id: number): Promise<NotificationRow> {
  return http.patch(`/notifications/${id}/seen`)
}

// single-line comment: Mark all notifications as seen for current user.
export async function markAllNotificationsSeen(): Promise<{ success: boolean }> {
  return http.patch(`/notifications/mark-all-seen`)
}

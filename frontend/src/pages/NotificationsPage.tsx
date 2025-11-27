/*
- file: src/pages/NotificationsPage.tsx
- purpose:
  - Shared notifications page for both user and admin portals.
  - Shows a full-width notifications table in the main portal area.
  - Uses the same card + fixed-header table styling as RAG documents admin page.
- behavior:
  - Loads notifications from backend for current user.
  - Allows marking a single notification seen.
  - Allows marking all seen.
*/

import { useEffect, useState } from 'react'
import NotificationsTable from '../components/Tables/NotificationsTable'
import { listMyNotifications, markAllNotificationsSeen, markNotificationSeen } from '../api/notifications'
import type { NotificationRow } from '../api/types'

// single-line comment: Notifications main page for user/admin portals.
export default function NotificationsPage() {
  const [rows, setRows] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(false)

  // single-line comment: Load notifications for current logged-in account.
  const load = async () => {
    setLoading(true)
    try {
      const data = await listMyNotifications(100)
      setRows(data.items || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  // single-line comment: Mark a single notification as seen then refresh list.
  const onMarkSeen = async (id: number) => {
    try {
      await markNotificationSeen(id)
      await load()
    } catch (e: any) {
      alert(e?.message || 'Failed to mark seen')
    }
  }

  // single-line comment: Mark all notifications as seen then refresh list.
  const onMarkAllSeen = async () => {
    try {
      await markAllNotificationsSeen()
      await load()
    } catch (e: any) {
      alert(e?.message || 'Failed to mark all seen')
    }
  }

  const unseenCount = rows.filter(r => !r.seen).length

  return (
    <section className="container rag-documents-page">
      <div className="card documents-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h3 className="rag-card-title">
            Notifications {unseenCount > 0 ? `(${unseenCount} new)` : ''}
          </h3>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn-clear"
              onClick={load}
              disabled={loading}
            >
              Refresh
            </button>
            <button
              type="button"
              className="btn-fill"
              onClick={onMarkAllSeen}
              disabled={rows.length === 0 || unseenCount === 0 || loading}
            >
              Mark all seen
            </button>
          </div>
        </div>

        <div className="documents-inner" aria-label="Notifications table panel" style={{ marginTop: 10 }}>
          {loading ? (
            <div style={{ padding: 12, opacity: 0.8 }}>Loading…</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 12, opacity: 0.8 }}>No notifications yet.</div>
          ) : (
            <NotificationsTable rows={rows} onMarkSeen={onMarkSeen} />
          )}
        </div>
      </div>
    </section>
  )
}

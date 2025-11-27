/*
- file: src/components/Tables/NotificationsTable.tsx
- purpose:
  - Render notifications in the same fixed-header + scrollable-body table style used by DocumentsTable.
  - Provides "Mark Seen" action per row.
- inputs:
  - rows: NotificationRow[]
  - onMarkSeen: callback for marking one notification seen
*/

import { useRef } from 'react'
import type { NotificationRow } from '../../api/types'

// single-line comment: Format ISO string to a short local date-time.
function fmtDate(v?: string | null): string {
  if (!v) return '-'
  try {
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return String(v)
    return d.toLocaleString()
  } catch {
    return String(v)
  }
}

// single-line comment: Fixed-header + scroll-body notifications table.
export default function NotificationsTable({
  rows,
  onMarkSeen,
}: {
  rows: NotificationRow[]
  onMarkSeen: (id: number) => void
}) {
  const headRef = useRef<HTMLDivElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)

  // single-line comment: Keep header horizontally aligned with body on x-scroll.
  const onBodyScroll = () => {
    const head = headRef.current
    const body = bodyRef.current
    if (!head || !body) return
    head.scrollLeft = body.scrollLeft
  }

  return (
    <div className="documents-table-outer">
      {/* ===== Fixed header ===== */}
      <div className="documents-table-head" ref={headRef} aria-hidden="true">
        <table className="table documents-table documents-table--head">
          <colgroup>
            <col style={{ width: 'var(--col-no-w)' }} />
            <col style={{ width: 420 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 220 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 190 }} />
            <col style={{ width: 120 }} />
          </colgroup>
          <thead>
            <tr>
              <th>No.</th>
              <th>Message</th>
              <th>Goal Type</th>
              <th>Actor</th>
              <th>Quarter</th>
              <th>Year</th>
              <th>Created At</th>
              <th className="nowrap">Actions</th>
            </tr>
          </thead>
        </table>
      </div>

      {/* ===== Scrollable body ===== */}
      <div
        className="documents-table-wrap scroll-xy"
        ref={bodyRef}
        onScroll={onBodyScroll}
        aria-label="Notifications table"
      >
        <table className="table documents-table documents-table--body">
          <colgroup>
            <col style={{ width: 'var(--col-no-w)' }} />
            <col style={{ width: 420 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 220 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 190 }} />
            <col style={{ width: 120 }} />
          </colgroup>

          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.id} style={!r.seen ? { fontWeight: 600 } : undefined}>
                <td>{idx + 1}</td>
                <td title={r.message}>{r.message}</td>
                <td>{r.goal_type}</td>
                <td>{r.actor_email || '-'}</td>
                <td>{r.quarter || '-'}</td>
                <td>{r.year || '-'}</td>
                <td>{fmtDate(r.created_at)}</td>
                <td className="nowrap">
                  {!r.seen ? (
                    <button onClick={() => onMarkSeen(r.id)}>Mark seen</button>
                  ) : (
                    <span style={{ opacity: 0.7 }}>Seen</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// src/pages/superadmin/SuperAdminAdminsPage.tsx
import { useEffect, useState } from 'react'
import { http } from '../../api/http'
import Select from '../../components/UI/Select'
import type { AccountRow } from '../../api/types'

export default function SuperAdminAdminsPage() {
  const [rows, setRows] = useState<AccountRow[]>([])
  const [filter, setFilter] = useState<string>('pending')

  const load = async () => {
    // role=admin, optional status
    const qs = new URLSearchParams()
    qs.set('role', 'admin')
    if (filter) qs.set('status', filter)
    const res = await http.get(`/super-admin/accounts/?${qs.toString()}`)
    setRows(res.items || res)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const setStatus = async (id: number, status: string) => {
    await http.patch(`/super-admin/accounts/${id}/status`, { status })
    await load()
  }

  return (
    <section className="container">
      <h2>Super Admin — Manage Admins</h2>

      <div className="row" style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
        <label>Status</label>
        <Select
          value={filter}
          onChange={setFilter}
          options={[
            { value: '', label: 'All' },
            { value: 'pending', label: 'Pending' },
            { value: 'active', label: 'Active' },
            { value: 'deactivated', label: 'Deactivated' },
          ]}
          style={{ justifySelf: 'start' }}
          buttonStyle={{ width: 320 }}
        />
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Name</th>
              <th>Status</th>
              <th className="nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.email}</td>
                <td>{r.name || '-'}</td>
                <td>{r.status}</td>
                <td className="nowrap">
                  <button onClick={() => setStatus(r.id, 'active')}>
                    Activate
                  </button>
                  <button onClick={() => setStatus(r.id, 'deactivated')}>
                    Deactivate
                  </button>
                  <button onClick={() => setStatus(r.id, 'rejected')}>
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

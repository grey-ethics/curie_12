// src/components/SettingsModal/SettingsModal.tsx
import { useEffect, useState } from 'react'
import Modal from '../UI/Modal'
import { useAuth } from '../../state/auth'
import { getProfile, updateName, changePassword, uploadLogo } from '../../api/me'
import type { Profile } from '../../api/types'

export default function SettingsModal() {
  const { actor } = useAuth()
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)

  const [name, setName] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')

  useEffect(() => {
    const onOpen = () => setOpen(true)
    document.addEventListener('open-settings', onOpen)
    return () => document.removeEventListener('open-settings', onOpen)
  }, [])

  useEffect(() => {
    if (!open) return
    getProfile().then(p => {
      setProfile(p)
      if (p?.name) setName(p.name)
    })
  }, [open])

  const saveName = async () => {
    if (!name) return
    const p = await updateName(name)
    setProfile(p)
  }

  const savePassword = async () => {
    if (!currentPw || !newPw) return
    try {
      await changePassword(currentPw, newPw)
      setCurrentPw('')
      setNewPw('')
      alert('Password updated')
    } catch (e: any) {
      alert(e?.message || 'Failed to update password')
    }
  }

  const onLogo = async (file: File) => {
    const p = await uploadLogo(file)
    setProfile(p)
    alert('Logo updated')
  }

  if (!open) return null

  return (
    <Modal title="Settings" onClose={() => setOpen(false)}>
      <div className="settings">
        {profile && (
          <>
            <div className="row">
              <label>Email</label>
              <div>{profile.email || '-'}</div>
            </div>

            <div className="row">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <button onClick={saveName}>Save</button>
            </div>

            <div className="row">
              <label>Logo</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) void onLogo(f)
                }}
              />
            </div>

            <div className="row">
              <label>Change password</label>
              <input
                type="password"
                placeholder="current password"
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
              />
              <input
                type="password"
                placeholder="new password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
              />
              <button onClick={savePassword}>Update</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

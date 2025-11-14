// src/components/Chat/ChatComposer.tsx
import { useState } from 'react'

export default function ChatComposer({
  disabled,
  onSend,
  placeholder,
}: {
  disabled?: boolean
  onSend: (text: string) => Promise<void> | void
  placeholder?: string
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSend() {
    if (disabled || busy) return
    const trimmed = text.trim()
    if (!trimmed) return
    setBusy(true)
    try {
      await onSend(trimmed)
      setText('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="chat-composer"
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}
    >
      <input
        type="text"
        disabled={disabled || busy}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder || 'Type a message…'}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void handleSend()
          }
        }}
        style={{ flex: 1 }}
      />
      <button
        type="button"
        disabled={disabled || busy || !text.trim()}
        onClick={() => void handleSend()}
      >
        {busy ? 'Sending…' : 'Send'}
      </button>
    </div>
  )
}

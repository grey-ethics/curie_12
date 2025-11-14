/*
- Renders pending tool invocations as inline widgets.

- What changed in this revision:
  • Added an explicit Cancel button to BOTH inline widgets (Resume Match, Document Generation).
    It calls POST /chat/sessions/{sid}/tools/{invId}/cancel and reloads the thread.
  • Kept auto-close behavior on “continue chatting”: server already cancels on next user turn.
  • No visual changes to completed/cancelled badges; pending widgets simply disappear after cancel.
*/

import { useMemo, useState } from 'react'
import type { ChatMessage, ChatFile, ChatToolInvocation } from '../../api/types'
import * as chat from '../../api/chat'

export default function ChatWindow({
  messages,
  sessionId,
  onUpdated,
}: {
  messages: ChatMessage[]
  sessionId: number | null
  onUpdated?: () => void
}) {
  return (
    <div className="chat-window scroll-y">
      {messages.map((m) => {
        const isUser = m.role === 'user'
        const label = isUser ? 'user:' : 'assistant:'
        const inv = m.tool_invocation

        const contentToShow = useMemo(() => {
          return isUser ? stripScaffold(m.content) : m.content
        }, [isUser, m.content])

        return (
          <div
            key={m.id}
            className={`chat-bubble ${isUser ? 'user' : 'assistant'}`}
            style={{
              border: '1px solid var(--border, rgba(0,0,0,0.12))',
              borderRadius: 10,
              padding: 10,
              margin: '10px 0',
              background: isUser ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.04)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            <span style={{ fontWeight: 600, marginRight: 6 }}>{label}</span>
            {contentToShow}

            {m.files && m.files.length > 0 && <FilesList files={m.files} />}

            {sessionId && inv && inv.status === 'pending' && (
              <div style={{ marginTop: 12 }}>
                <WidgetRenderer sessionId={sessionId} invocation={inv} onDone={onUpdated} />
              </div>
            )}

            {inv && inv.status === 'completed' && (
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>Widget completed.</div>
            )}
            {inv && inv.status === 'cancelled' && (
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>Widget cancelled.</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// single-line comment: Remove helper lines we inject for context/answer-style before rendering user text.
function stripScaffold(text: string): string {
  const lines = (text || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  const dropStartsWith = [
    'Use the uploaded company documents as primary context when answering.',
    'Answer using your general knowledge.',
    'Keep the answer very short',
    'Provide a detailed, step-by-step explanation',
    'Provide a detailed, step-by-step explanation with any important caveats',
  ]
  const filtered = lines.filter((ln) => !dropStartsWith.some((p) => ln.startsWith(p)))
  return filtered.join('\n')
}

function FilesList({ files }: { files: ChatFile[] }) {
  return (
    <div
      style={{
        marginTop: 10,
        borderTop: '1px solid rgba(0,0,0,0.05)',
        paddingTop: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <span style={{ fontSize: 12, opacity: 0.75 }}>Files ({files.length}):</span>
      {files.map((f: ChatFile) => (
        <a
          key={f.id}
          href={f.web_path || '#'}
          style={{
            fontSize: 13,
            textDecoration: 'underline',
            display: 'inline-flex',
            gap: 6,
            alignItems: 'center',
            color: 'var(--link, #1677ff)',
          }}
          target="_blank"
          rel="noreferrer"
        >
          <span
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              background: f.file_kind === 'input' ? 'rgba(0, 128, 0, 0.12)' : 'rgba(0, 0, 128, 0.12)',
              borderRadius: 4,
              padding: '1px 4px',
            }}
          >
            {f.file_kind}
          </span>
          <span>{f.original_filename}</span>
          <span style={{ opacity: 0.6, fontSize: 11 }}>{formatBytes(f.file_size)}</span>
        </a>
      ))}
    </div>
  )
}

function WidgetRenderer({
  sessionId,
  invocation,
  onDone,
}: {
  sessionId: number
  invocation: ChatToolInvocation
  onDone?: () => void
}) {
  if (invocation.tool_type === 'resume_match') {
    return <ResumeMatchForm sessionId={sessionId} invId={invocation.id} onDone={onDone} />
  }
  if (invocation.tool_type === 'doc_gen') {
    return <DocGenForm sessionId={sessionId} invId={invocation.id} onDone={onDone} />
  }
  return <div style={{ fontSize: 12, opacity: 0.8 }}>Unknown widget: {invocation.tool_type}</div>
}

// single-line comment: Inline Resume Match form with explicit Cancel.
function ResumeMatchForm({
  sessionId,
  invId,
  onDone,
}: {
  sessionId: number
  invId: number
  onDone?: () => void
}) {
  const [jd, setJd] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    const hasFiles = files && files.length > 0
    if (!jd.trim() && !hasFiles) {
      alert('Provide a job description and/or attach at least one resume file.')
      return
    }
    const form = new FormData()
    if (jd.trim()) form.append('job_description', jd.trim())
    if (hasFiles) {
      Array.from(files!).forEach((f) => form.append('files', f, f.name))
    }
    setBusy(true)
    try {
      await chat.runResumeMatchWidgetUpload(sessionId, invId, form)
      onDone && onDone()
    } catch (e: any) {
      alert(e?.message || 'Failed to run resume match')
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    if (busy) return
    setBusy(true)
    try {
      await chat.cancelWidget(sessionId, invId)
      onDone && onDone()
    } catch (e: any) {
      alert(e?.message || 'Failed to cancel widget')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        marginTop: 8,
        padding: 10,
        borderRadius: 8,
        border: '1px dashed rgba(0,0,0,0.2)',
        background: 'rgba(255,255,255,0.6)',
        display: 'grid',
        gap: 8,
      }}
    >
      <b>Resume Match</b>
      <label style={{ fontSize: 12, opacity: 0.8 }}>Job Description</label>
      <textarea
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        rows={5}
        placeholder="Paste the job description… (or include a JD file among your uploads)"
        style={{ width: '100%' }}
      />
      <label style={{ fontSize: 12, opacity: 0.8 }}>Resume files</label>
      <input
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt"
        onChange={(e) => setFiles(e.target.files)}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={run} disabled={busy}>
          {busy ? 'Running…' : 'Run Resume Match'}
        </button>
        <button type="button" onClick={cancel} disabled={busy} style={{ opacity: 0.85 }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// single-line comment: Inline Document Generation form with explicit Cancel.
function DocGenForm({
  sessionId,
  invId,
  onDone,
}: {
  sessionId: number
  invId: number
  onDone?: () => void
}) {
  const [template, setTemplate] = useState('')
  const [varsText, setVarsText] = useState('{\n  "name": "Alice"\n}')
  const [busy, setBusy] = useState(false)

  const run = async () => {
    if (!template.trim()) {
      alert('Please provide a template.')
      return
    }
    let vars: Record<string, any> | null = null
    try {
      vars = JSON.parse(varsText || '{}')
    } catch {
      alert('Variables must be valid JSON.')
      return
    }
    setBusy(true)
    try {
      await chat.runDocGenWidget(sessionId, invId, { template, variables: vars })
      onDone && onDone()
    } catch (e: any) {
      alert(e?.message || 'Failed to run document generation')
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    if (busy) return
    setBusy(true)
    try {
      await chat.cancelWidget(sessionId, invId)
      onDone && onDone()
    } catch (e: any) {
      alert(e?.message || 'Failed to cancel widget')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        marginTop: 8,
        padding: 10,
        borderRadius: 8,
        border: '1px dashed rgba(0,0,0,0.2)',
        background: 'rgba(255,255,255,0.6)',
        display: 'grid',
        gap: 8,
      }}
    >
      <b>Document Generation</b>
      <label style={{ fontSize: 12, opacity: 0.8 }}>Template</label>
      <textarea
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
        rows={5}
        placeholder="Type or paste a template. Use {{var}} placeholders if desired."
        style={{ width: '100%' }}
      />
      <label style={{ fontSize: 12, opacity: 0.8 }}>Variables (JSON)</label>
      <textarea
        value={varsText}
        onChange={(e) => setVarsText(e.target.value)}
        rows={5}
        placeholder='{"name":"Alice","date":"2025-01-01"}'
        style={{ width: '100%' }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={run} disabled={busy}>
          {busy ? 'Generating…' : 'Generate Document'}
        </button>
        <button type="button" onClick={cancel} disabled={busy} style={{ opacity: 0.85 }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return ''
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

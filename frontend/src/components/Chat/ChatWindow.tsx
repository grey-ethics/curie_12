/*
- Chat bubbles redesigned:
  • Right-aligned user bubbles, left-aligned assistant bubbles.
  • Glass/3D look with rounded rectangles, soft shadow, subtle inner highlight.
  • Width never stretches edge-to-edge; bubbles size to content with a max width.
- Widgets unchanged functionally; explicit Cancel stays.
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
        const inv = m.tool_invocation
        const contentToShow = useMemo(
          () => (isUser ? stripScaffold(m.content) : m.content),
          [isUser, m.content],
        )

        return (
          <div
            key={m.id}
            className={`bubble-row ${isUser ? 'right' : 'left'}`}
          >
            <div className={`bubble ${isUser ? 'user' : 'assistant'}`}>
              <div className="bubble-content">{contentToShow}</div>

              {m.files && m.files.length > 0 && <FilesList files={m.files} />}

              {sessionId && inv && inv.status === 'pending' && (
                <div className="bubble-widget">
                  <WidgetRenderer
                    sessionId={sessionId}
                    invocation={inv}
                    onDone={onUpdated}
                  />
                </div>
              )}

              {inv && inv.status === 'completed' && (
                <div className="bubble-meta">Widget completed.</div>
              )}
              {inv && inv.status === 'cancelled' && (
                <div className="bubble-meta">Widget cancelled.</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// single-line comment: Remove helper scaffold lines from user text before rendering.
function stripScaffold(text: string): string {
  const lines = (text || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
  const dropStartsWith = [
    'Use the uploaded company documents as primary context when answering.',
    'Answer using your general knowledge.',
    'Keep the answer very short',
    'Provide a detailed, step-by-step explanation',
    'Provide a detailed, step-by-step explanation with any important caveats',
  ]
  const filtered = lines.filter(
    (ln) => !dropStartsWith.some((p) => ln.startsWith(p)),
  )
  return filtered.join('\n')
}

function FilesList({ files }: { files: ChatFile[] }) {
  return (
    <div className="files-list">
      <span className="files-title">Files ({files.length}):</span>
      {files.map((f: ChatFile) => (
        <a
          key={f.id}
          href={f.web_path || '#'}
          className="file-link"
          target="_blank"
          rel="noreferrer"
        >
          <span className={`file-badge ${f.file_kind}`}>{f.file_kind}</span>
          <span>{f.original_filename}</span>
          <span className="file-size">{formatBytes(f.file_size)}</span>
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
  return <div className="bubble-meta">Unknown widget: {invocation.tool_type}</div>
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
    if (hasFiles) Array.from(files!).forEach((f) => form.append('files', f, f.name))
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
    <div className="widget-card">
      <b>Resume Match</b>
      <label className="widget-label">Job Description</label>
      <textarea
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        rows={5}
        placeholder="Paste the job description… (or include a JD file among your uploads)"
      />
      <label className="widget-label">Resume files</label>
      <input
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt"
        onChange={(e) => setFiles(e.target.files)}
      />
      <div className="widget-actions">
        <button type="button" onClick={run} disabled={busy}>
          {busy ? 'Running…' : 'Run Resume Match'}
        </button>
        <button type="button" onClick={cancel} disabled={busy} className="btn-secondary">
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
    <div className="widget-card">
      <b>Document Generation</b>
      <label className="widget-label">Template</label>
      <textarea
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
        rows={5}
        placeholder="Type or paste a template. Use {{var}} placeholders if desired."
      />
      <label className="widget-label">Variables (JSON)</label>
      <textarea
        value={varsText}
        onChange={(e) => setVarsText(e.target.value)}
        rows={5}
        placeholder='{"name":"Alice","date":"2025-01-01"}'
      />
      <div className="widget-actions">
        <button type="button" onClick={run} disabled={busy}>
          {busy ? 'Generating…' : 'Generate Document'}
        </button>
        <button type="button" onClick={cancel} disabled={busy} className="btn-secondary">
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

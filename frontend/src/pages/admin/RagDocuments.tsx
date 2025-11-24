/*
- file: src/pages/admin/UploadAndDocumentsPage.tsx
- changes:
  • Merge “Upload files for RAG” and “Output” into one card.
  • Add an in-card divider separating upload UI from output log.
  • Reduce only the output log box height via a modifier class (does not affect selected-files box).
  • Keep all existing upload/list/download/delete behaviors unchanged.
*/

import { useEffect, useRef, useState } from 'react'
import {
  uploadDocuments,
  listDocuments,
  downloadDocument,
  deleteDocument,
  type UploadResult,
} from '../../api/admin'
import DocumentsTable from '../../components/Tables/DocumentsTable'
import { bytes as fmtBytes } from '../../utils/format'

type UploadSummary = string

// single-line comment: Admin page to upload RAG docs, show per-file results, and manage existing documents.
export default function UploadAndDocumentsPage() {
  const [selected, setSelected] = useState<File[]>([])
  const [log, setLog] = useState<UploadSummary[]>([])
  const [rows, setRows] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const formatSize = (n?: number) => (typeof n === 'number' ? fmtBytes(n) : '-')

  const summarizeOk = (res: any) => {
    const id = res?.id ?? '-'
    const name = res?.filename ?? '(unnamed)'
    const type = res?.content_type ?? '-'
    const size = formatSize(res?.file_size)
    return `✔ Uploaded "${name}" • ${type} • ${size} • id: ${id}`
  }

  const summarize = (r: UploadResult): string => {
    if ((r as any)?.ok === true) return summarizeOk((r as any).data)
    const err = r as any
    const name = err?.filename || '(unknown)'
    const reason = String(err?.error || 'Failed').trim()
    return `× Skipped "${name}" • ${reason}`
  }

  const load = async () => {
    const data = await listDocuments()
    setRows(data.items || data || [])
  }

  useEffect(() => { void load() }, [])

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files || [])
    if (incoming.length === 0) return
    setSelected(prev => {
      const map = new Map<string, File>()
      const key = (f: File) => `${f.name}__${f.size}__${f.lastModified}`
      for (const f of prev) map.set(key(f), f)
      for (const f of incoming) map.set(key(f), f)
      return Array.from(map.values())
    })
    e.currentTarget.value = '' // allow re-picking the same file(s)
  }

  const removeFileAt = (idx: number) =>
    setSelected(prev => prev.filter((_, i) => i !== idx))

  const clearAll = () => setSelected([])

  const onUpload = async () => {
    if (selected.length === 0) return
    const res = await uploadDocuments(selected)
    const lines = Array.isArray(res?.items) ? res.items.map(summarize) : ['× Unexpected response']
    setLog(l => [...lines, ...l]) // newest first
    setSelected([])
    await load()
  }

  const onDownloadDoc = async (id: number) => {
    try {
      const { blob, filename } = await downloadDocument(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || `document-${id}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert(e?.message || 'Download failed')
    }
  }

  const onDeleteDoc = async (id: number) => {
    const ok = window.confirm('Delete this document from RAG?')
    if (!ok) return
    try {
      await deleteDocument(id)
      await load()
    } catch (e: any) {
      alert(e?.message || 'Delete failed')
    }
  }

  const totalBytes = selected.reduce((n, f) => n + (f?.size || 0), 0)

  return (
    <section className="container">
      {/* ===== Combined Upload + Output card ===== */}
      <div className="card">
        <h3>Upload files for RAG</h3>

        {/* Upload header (4 parts) */}
        <div className="upload4-grid">
          {/* 1) Select Files — real button triggers hidden input */}
          <div className="pane">
            <button
              type="button"
              className="btn-fill"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Select files to upload"
              title="Select files"
            >
              Select Files
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={onFilesSelected}
              aria-hidden="true"
              tabIndex={-1}
              style={{ display: 'none' }}
            />
          </div>

          {/* 2) Selected files list (themed scrollbar) */}
          <div className="pane">
            <div className="files-box text-output upload-list scroll-y" aria-label="Selected files">
              {selected.length === 0 ? (
                <div className="upload-list-empty">No files selected. Click “Select Files”.</div>
              ) : (
                <ul>
                  {selected.map((f, i) => (
                    <li key={`${f.name}-${f.size}-${f.lastModified}`}>
                      <span className="name" title={f.name}>{f.name}</span>
                      <span className="size">{fmtBytes(f.size)}</span>
                      <button
                        type="button"
                        className="remove"
                        aria-label={`Remove ${f.name}`}
                        title="Remove"
                        onClick={() => removeFileAt(i)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 3) Stats + Clear (equal height halves) */}
          <div className="pane stats">
            <div className="upload-slab">
              <div className="stats-grid">
                <div className="kpi">
                  <strong>{selected.length}</strong>
                  <span>File{selected.length === 1 ? '' : 's'}</span>
                </div>
                <div className="kpi">
                  <strong>{fmtBytes(totalBytes)}</strong>
                  <span>Total size</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn-clear"
              onClick={clearAll}
              disabled={selected.length === 0}
              aria-disabled={selected.length === 0}
              aria-label="Clear selected files"
              title="Clear selected files"
            >
              Clear all
            </button>
          </div>

          {/* 4) Upload Files */}
          <div className="pane">
            <button
              type="button"
              className="btn-fill"
              onClick={onUpload}
              disabled={selected.length === 0}
              aria-disabled={selected.length === 0}
              aria-label="Upload files"
              title="Upload files"
            >
              Upload Files
            </button>
          </div>
        </div>

        {/* Divider between sections */}
        <hr className="card-divider" />

        {/* Output log */}

        <div
          className="text-output text-output--log scroll-y"
          aria-live="polite"
          aria-label="Upload results"
        >
          {log.length === 0 ? (
            <span style={{ opacity: 0.7 }}>
              No output yet. Upload some files to see results here.
            </span>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {log.map((line, i) => (
                <li key={i} style={{ marginBottom: 6 }}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ===== Documents table ===== */}
      <div className="card">
        <h3>Documents</h3>
        <DocumentsTable
          rows={rows}
          onDownload={onDownloadDoc}
          onDelete={onDeleteDoc}
        />
      </div>
    </section>
  )
}

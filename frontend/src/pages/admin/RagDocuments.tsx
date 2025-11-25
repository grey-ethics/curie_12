/*
- file: src/pages/admin/RagDocuments.tsx
- purpose:
  - Admin page to upload RAG docs, show per-file results, and manage existing documents.
  - Layout:
      • Top Upload card auto-sizes.
      • Bottom Documents card fills remaining portal height.
      • Documents card contains an inner panel (documents-inner) that frames the table.
      • Table itself scrolls vertically/horizontally inside that inner panel.
  - All upload/list/download/delete logic is preserved.
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

  // single-line comment: Format byte size to human-readable string for summaries.
  const formatSize = (n?: number) => (typeof n === 'number' ? fmtBytes(n) : '-')

  // single-line comment: Build the success summary line for a single uploaded document.
  const summarizeOk = (res: any) => {
    const id = res?.id ?? '-'
    const name = res?.filename ?? '(unnamed)'
    const type = res?.content_type ?? '-'
    const size = formatSize(res?.file_size)
    return `✔ Uploaded "${name}" • ${type} • ${size} • id: ${id}`
  }

  // single-line comment: Convert an UploadResult into a single log line.
  const summarize = (r: UploadResult): string => {
    if ((r as any)?.ok === true) return summarizeOk((r as any).data)
    const err = r as any
    const name = err?.filename || '(unknown)'
    const reason = String(err?.error || 'Failed').trim()
    return `× Skipped "${name}" • ${reason}`
  }

  // single-line comment: Fetch current documents list for this admin.
  const load = async () => {
    const data = await listDocuments()
    setRows(data.items || data || [])
  }

  useEffect(() => { void load() }, [])

  // single-line comment: Merge newly selected files into the current selection (deduped).
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
    e.currentTarget.value = ''
  }

  // single-line comment: Remove the selected file at a given index.
  const removeFileAt = (idx: number) =>
    setSelected(prev => prev.filter((_, i) => i !== idx))

  // single-line comment: Clear all selected files.
  const clearAll = () => setSelected([])

  // single-line comment: Upload all selected files, append results to log, then refresh list.
  const onUpload = async () => {
    if (selected.length === 0) return
    const res = await uploadDocuments(selected)
    const lines = Array.isArray(res?.items) ? res.items.map(summarize) : ['× Unexpected response']
    setLog(l => [...lines, ...l])
    setSelected([])
    await load()
  }

  // single-line comment: Download a document by id and trigger browser save.
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

  // single-line comment: Delete a document by id after confirmation, then refresh list.
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
    <section className="container rag-documents-page">
      {/* ===== Combined Upload + Output card ===== */}
      <div className="card">
        <h3 className="rag-card-title">Upload files for RAG</h3>

        <div className="upload4-grid">
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

        <hr className="card-divider" />

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

      {/* ===== Documents table (fills remaining height) ===== */}
      <div className="card documents-card">
        <h3 className="rag-card-title">Uploaded files for RAG</h3>

        {/* single-line comment: Inner panel to frame the table (like Upload card inner sections). */}
        <div className="documents-inner" aria-label="Documents table panel">
          <DocumentsTable
            rows={rows}
            onDownload={onDownloadDoc}
            onDelete={onDeleteDoc}
          />
        </div>
      </div>
    </section>
  )
}

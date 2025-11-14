/*
- file: src/pages/admin/UploadAndDocumentsPage.tsx
- purpose: admin UI to upload/list/download/delete RAG documents via /admin/rag-documents/*
- notes: adjusted to the backend’s single-file upload and path-based download
*/
import { useEffect, useState } from 'react'
import {
  uploadDocuments,
  listDocuments,
  downloadDocument,
  deleteDocument,
} from '../../api/admin'
import DocumentsTable from '../../components/Tables/DocumentsTable'

export default function UploadAndDocumentsPage() {
  const [selected, setSelected] = useState<FileList | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [rows, setRows] = useState<any[]>([])

  // load: fetch documents from backend
  const load = async () => {
    const data = await listDocuments()
    setRows(data.items || data || [])
  }

  // init: load docs on mount
  useEffect(() => {
    load()
  }, [])

  // onUpload: loop over picked files and upload them
  const onUpload = async () => {
    if (!selected || selected.length === 0) return
    const files = Array.from(selected)
    const res = await uploadDocuments(files)
    setLog((l) => [...l, JSON.stringify(res, null, 2)])
    await load()
  }

  // onDownloadDoc: use api/admin.ts to get blob and trigger download
  const onDownloadDoc = async (id: number) => {
    try {
      const { blob, filename } = await downloadDocument(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert(e?.message || 'Download failed')
    }
  }

  // onDeleteDoc: DELETE document and refresh
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

  return (
    <section className="container">
      <div className="card">
        <h3>Upload files for RAG</h3>
        <input
          type="file"
          multiple
          onChange={(e) => setSelected(e.target.files)}
        />
        <button onClick={onUpload}>Upload</button>
      </div>

      <div className="card output-pane">
        <h4>Output</h4>
        <pre className="scroll-y">{log.join('\n\n')}</pre>
      </div>

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

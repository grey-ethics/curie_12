/*
- file: src/components/Tables/DocumentsTable.tsx
- purpose:
  - Render the Documents table with:
      • A fixed, “row-style” header outside the scroll area (Excel-like).
      • A scrollable tbody area below it.
      • Synced horizontal scroll between header and body.
  - Inputs:
      • rows: list of RagDocumentResponse-like objects.
      • onDownload/onDelete: action callbacks.
  - Output:
      • Two aligned tables using identical colgroups.
*/

import { useRef } from 'react'

// single-line comment: Extract a short file type like "pdf", "docx" from filename or content_type.
function getShortType(r: any): string {
  const name: string = String(r?.filename || '')
  const ext = name.includes('.') ? name.split('.').pop() : ''
  if (ext) return ext.toLowerCase()
  const ct: string = String(r?.content_type || '')
  if (ct.includes('/')) return ct.split('/').pop()!.toLowerCase()
  return '-'
}

// single-line comment: Convert bytes to MB string with 2 decimals.
function bytesToMb(n?: number): string {
  if (typeof n !== 'number' || Number.isNaN(n)) return '-'
  const mb = n / (1024 * 1024)
  return `${mb.toFixed(2)} MB`
}

// single-line comment: Renders fixed-header + scroll-body documents table.
export default function DocumentsTable({
  rows,
  onDownload,
  onDelete,
}: {
  rows: any[]
  onDownload: (id: number) => void
  onDelete: (id: number) => void
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
      {/* ===== Fixed header table (NOT scrollable) ===== */}
      <div className="documents-table-head" ref={headRef} aria-hidden="true">
        <table className="table documents-table documents-table--head">
          <colgroup>
            <col className="col-no" style={{ width: 'var(--col-no-w)' }} />
            <col className="col-filename" style={{ width: 'var(--col-filename-w)' }} />
            <col className="col-type" style={{ width: 'var(--col-type-w)' }} />
            <col className="col-size" style={{ width: 'var(--col-size-w)' }} />
            <col className="col-fileid" style={{ width: 'var(--col-fileid-w)' }} />
            <col className="col-uploaderid" style={{ width: 'var(--col-uploaderid-w)' }} />
            <col className="col-actions" style={{ width: 'var(--col-actions-w)' }} />
          </colgroup>
          <thead>
            <tr>
              <th className="col-no">No.</th>
              <th className="col-filename">File Name</th>
              <th className="col-type">Type</th>
              <th className="col-size">Size</th>
              <th className="col-fileid">File ID No.</th>
              <th className="col-uploaderid">Uploader ID No.</th>
              <th className="col-actions nowrap">Actions</th>
            </tr>
          </thead>
        </table>
      </div>

      {/* ===== Scrollable body table ===== */}
      <div
        className="documents-table-wrap scroll-xy"
        ref={bodyRef}
        onScroll={onBodyScroll}
        aria-label="Documents table"
      >
        <table className="table documents-table documents-table--body">
          <colgroup>
            <col className="col-no" style={{ width: 'var(--col-no-w)' }} />
            <col className="col-filename" style={{ width: 'var(--col-filename-w)' }} />
            <col className="col-type" style={{ width: 'var(--col-type-w)' }} />
            <col className="col-size" style={{ width: 'var(--col-size-w)' }} />
            <col className="col-fileid" style={{ width: 'var(--col-fileid-w)' }} />
            <col className="col-uploaderid" style={{ width: 'var(--col-uploaderid-w)' }} />
            <col className="col-actions" style={{ width: 'var(--col-actions-w)' }} />
          </colgroup>

          <tbody>
            {rows.map((r: any, idx: number) => {
              const docId = r.id
              return (
                <tr key={docId}>
                  <td className="col-no">{idx + 1}</td>
                  <td className="col-filename filename-cell" title={r.filename}>
                    {r.filename}
                  </td>
                  <td className="col-type">{getShortType(r)}</td>
                  <td className="col-size">{bytesToMb(r.file_size)}</td>
                  <td className="col-fileid">{r.id ?? '-'}</td>
                  <td className="col-uploaderid">{r.uploader_account_id ?? '-'}</td>
                  <td className="col-actions nowrap">
                    <div className="actions-wrap">
                      <button onClick={() => onDownload(docId)}>Download</button>
                      <button onClick={() => onDelete(docId)}>Delete</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/*
- file: src/components/Tables/DocumentsTable.tsx
- purpose: tabular view for RAG documents returned by /admin/rag-documents/
- notes: matches RagDocumentResponse fields (id, filename, content_type, file_size, uploader_account_id)
*/
export default function DocumentsTable({
  rows,
  onDownload,
  onDelete,
}: {
  rows: any[]
  onDownload: (id: number) => void
  onDelete: (id: number) => void
}) {
  return (
    <div className="table-wrap scroll-xy">
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Filename</th>
            <th>Type</th>
            <th>Size</th>
            <th>Uploader</th>
            <th className="nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any) => {
            const docId = r.id
            return (
              <tr key={docId}>
                <td>{docId}</td>
                <td>{r.filename}</td>
                <td>{r.content_type || '-'}</td>
                <td>{r.file_size || '-'}</td>
                <td>{r.uploader_account_id || '-'}</td>
                <td className="nowrap" style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => onDownload(docId)}
                    style={{ cursor: 'pointer' }}
                  >
                    Download
                  </button>
                  <button
                    onClick={() => onDelete(docId)}
                    style={{ cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

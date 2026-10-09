import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { sharedDocument } from '@/lib/db'
import type { SaleDocument } from '@/types/document'
import DocumentPaper from '@/components/admin/DocumentPaper'

/** What the buyer sees when they open the link we sent: their invoice or receipt, ready to print or save as a PDF. */
export default function SharedDocument() {
  const { token = '' } = useParams()
  const [doc, setDoc] = useState<SaleDocument | null | undefined>(undefined)

  useEffect(() => {
    document.title = 'Your document - Migs Auto'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    let live = true
    sharedDocument(token).then((d) => live && setDoc(d))
    return () => { live = false; meta.remove() }
  }, [token])

  return (
    <main className="shared-doc doc-print">
      {doc === undefined && <p className="mpage__note">Loading...</p>}
      {doc === null && (
        <div className="mpage">
          <h1 className="mpage__title">This link is not valid</h1>
          <p className="mpage__note">The document may have been removed. Please contact Migs Auto for a new link.</p>
          <Link className="mbtn" to="/contact">Contact us</Link>
        </div>
      )}
      {doc && (
        <>
          <div className="shared-doc__bar doc-noprint"><button type="button" className="mbtn" onClick={() => window.print()}>Print / save as PDF</button></div>
          <DocumentPaper doc={doc} />
        </>
      )}
    </main>
  )
}

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Printer } from '@/components/slab'
import InvoicePaper from '@/components/InvoicePaper'
import { sharedDocument } from '@/lib/db'
import type { Doc } from '@/lib/invoiceDoc'

/**
 * SharedDocument - the page a customer opens from the link the studio sends
 * by email or WhatsApp (/d/<secret token>). Read-only; they can print it or
 * save it as a PDF.
 */
export default function SharedDocument() {
  const { token = '' } = useParams()
  const [doc, setDoc] = useState<Doc | null | undefined>(undefined)

  useEffect(() => {
    document.title = 'Your document - Judeng Production Studio'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    let alive = true
    void sharedDocument(token).then((d) => alive && setDoc((d as unknown as Doc) ?? null))
    return () => { alive = false; meta.remove() }
  }, [token])

  if (doc === undefined) return <main className="inv inv--share"><p className="inv__msg">Loading your document...</p></main>
  if (!doc) return <main className="inv inv--share"><p className="inv__msg">We could not find this document. The link may be incomplete. Please ask the studio to send it again.</p></main>

  return (
    <main className="inv inv--share">
      <div className="inv__stage">
        <div className="inv__sharewrap">
          <button type="button" className="inv__print inv__print--share" onClick={() => window.print()}>
            <Printer size={16} weight="fill" aria-hidden="true" /> Download / Print (save as PDF)
          </button>
          <InvoicePaper doc={doc} />
        </div>
      </div>
    </main>
  )
}

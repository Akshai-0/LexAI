import { useEffect, useRef, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X } from 'lucide-react'

const WORKER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

export default function PdfViewer({ file, highlight, onClose }) {
  const canvasRef  = useRef(null)
  const pdfRef     = useRef(null)
  const renderRef  = useRef(null)

  const [pageNum,    setPageNum]    = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale,      setScale]      = useState(1.3)
  const [status,     setStatus]     = useState('Loading PDF...')

  // Load PDF once when file changes
  useEffect(() => {
    if (!file) return
    const lib = window['pdfjs-dist/build/pdf'] || window['pdfjsLib']
    if (!lib) { setStatus('pdf.js not loaded'); return }
    lib.GlobalWorkerOptions.workerSrc = WORKER_SRC
    const url = URL.createObjectURL(file)
    setStatus('Loading PDF...')
    lib.getDocument(url).promise.then(pdf => {
      pdfRef.current = pdf
      setTotalPages(pdf.numPages)
      setStatus('')
    }).catch(e => setStatus('Failed to load PDF: ' + e.message))
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Jump to highlighted page when highlight changes
  useEffect(() => {
    if (highlight?.page) setPageNum(highlight.page)
  }, [highlight])

  // Render page + draw highlight
  const renderPage = useCallback(async (num) => {
    const pdf = pdfRef.current
    if (!pdf || !canvasRef.current) return

    if (renderRef.current) {
      try { await renderRef.current.cancel() } catch {}
    }

    const page     = await pdf.getPage(num)
    const viewport = page.getViewport({ scale })
    const canvas   = canvasRef.current
    const ctx      = canvas.getContext('2d')
    canvas.width   = viewport.width
    canvas.height  = viewport.height
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    renderRef.current = page.render({ canvasContext: ctx, viewport })
    try { await renderRef.current.promise }
    catch (e) { if (e?.name === 'RenderingCancelledException') return }

    // Highlight via text layer
    if (highlight?.text) {
      const textContent = await page.getTextContent()

      ctx.save()
      ctx.globalAlpha = 0.38
      ctx.fillStyle   = '#f5a623'

      // 1. Reconstruct page text and map items to character ranges
      let pageText = ''
      const ranges = []
      for (const item of textContent.items) {
        if (!item.str) continue
        const start = pageText.length
        pageText += item.str
        const end = pageText.length
        ranges.push({ item, start, end })
        pageText += ' ' // separation space
      }

      // 2. Perform a whitespace-flexible, quote-flexible search for the highlight query
      const normalizeQuotes = (s) =>
        s.replace(/[\u2018\u2019\u201a\u201b\u2032]/g, "'")
         .replace(/[\u201c\u201d\u201e\u201f\u2033]/g, '"')
      const normalizedQuery = normalizeQuotes(highlight.text)
      const normalizedPage  = normalizeQuotes(pageText)
      const cleanQuery = normalizedQuery
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // escape regex
        .replace(/\s+/g, '\\s+')                 // flexible whitespace
        .replace(/['"]/g, '[\'"\u2018\u2019\u201c\u201d]') // flexible quotes
      const re = new RegExp(cleanQuery, 'i')
      const match = normalizedPage.match(re)

      const matchedItems = new Set()

      if (match) {
        const matchStart = match.index
        const matchEnd = matchStart + match[0].length

        for (const { item, start, end } of ranges) {
          if (start < matchEnd && end > matchStart) {
            matchedItems.add(item)
          }
        }
      } else {
        // Fallback: check if individual items contain the query text
        const queryLower = highlight.text.toLowerCase().trim()
        for (const item of textContent.items) {
          if (item.str && item.str.toLowerCase().includes(queryLower)) {
            matchedItems.add(item)
          }
        }
      }

      // 3. Draw highlights for matched items
      for (const item of matchedItems) {
        const v = item.transform
        const itemWidth = item.width || 0
        const itemHeight = item.height || item.transform[3] || 10

        // Convert PDF coordinate rect to viewport (canvas) rect
        const [x1, y1, x2, y2] = viewport.convertToViewportRectangle([
          v[4],
          v[5],
          v[4] + itemWidth,
          v[5] + itemHeight
        ])

        ctx.fillRect(x1, y1, x2 - x1, y2 - y1)
      }
      ctx.restore()
    }
  }, [scale, highlight])

  useEffect(() => {
    if (pdfRef.current && !status) renderPage(pageNum)
  }, [pageNum, scale, status, renderPage])

  return (
    // Full-screen overlay
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <div style={{
        width: '75vw', height: '90vh',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface2)', flexShrink: 0,
        }}>
          {/* Highlight label */}
          {highlight?.text && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)',
              background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.3)',
              borderRadius: 5, padding: '3px 10px', maxWidth: 280,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              ◆ {highlight.label && <span style={{ color: 'var(--text3)', marginRight: 4 }}>{highlight.label}:</span>}
              {highlight.text}
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Page nav */}
          <button onClick={() => setPageNum(p => Math.max(1, p - 1))}
            disabled={pageNum <= 1} style={btnStyle(pageNum <= 1)}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text2)', minWidth: 64, textAlign: 'center' }}>
            {pageNum} / {totalPages || '?'}
          </span>
          <button onClick={() => setPageNum(p => Math.min(totalPages, p + 1))}
            disabled={pageNum >= totalPages} style={btnStyle(pageNum >= totalPages)}>
            <ChevronRight size={14} />
          </button>

          <div style={{ width: 1, height: 18, background: 'var(--border2)', margin: '0 4px' }} />

          {/* Zoom */}
          <button onClick={() => setScale(s => Math.max(0.6, parseFloat((s - 0.2).toFixed(1))))} style={btnStyle(false)}>
            <ZoomOut size={14} />
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text2)', minWidth: 40, textAlign: 'center' }}>
            {Math.round(scale * 100)}%
          </span>
          <button onClick={() => setScale(s => Math.min(3.0, parseFloat((s + 0.2).toFixed(1))))} style={btnStyle(false)}>
            <ZoomIn size={14} />
          </button>

          <div style={{ width: 1, height: 18, background: 'var(--border2)', margin: '0 4px' }} />

          <button onClick={onClose} style={{ ...btnStyle(false), background: 'var(--red-bg)', borderColor: 'rgba(220,38,38,0.3)', color: 'var(--red)' }}>
            <X size={14} />
          </button>
        </div>

        {/* Canvas scroll area */}
        <div style={{
          flex: 1, overflow: 'auto',
          display: 'flex', justifyContent: 'center',
          padding: '20px', background: '#555',
        }}>
          {status
            ? <div style={{ margin: 'auto', color: 'white', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{status}</div>
            : <canvas ref={canvasRef} style={{ display: 'block', boxShadow: '0 4px 32px rgba(0,0,0,0.5)' }} />
          }
        </div>
      </div>
    </div>
  )
}

function btnStyle(disabled) {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 6, flexShrink: 0,
    background: 'var(--surface3)', border: '1px solid var(--border2)',
    color: disabled ? 'var(--text4)' : 'var(--text2)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  }
}

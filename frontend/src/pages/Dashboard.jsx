import { useState, useRef } from 'react'
import { Upload, FileText, ShieldAlert, Zap, Loader2 } from 'lucide-react'
import axios from 'axios'

export default function Dashboard({ onResult, history }) {
  const [drag, setDrag]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [stage, setStage]     = useState('')
  const [progress, setProgress] = useState(0)
  const [error, setError]     = useState(null)
  const inputRef = useRef()

  const STAGES = [
    [10, 'Reading PDF...'],
    [30, 'Tokenizing lines...'],
    [55, 'Running single-pass extractor...'],
    [72, 'Extracting parties & jurisdiction...'],
    [84, 'Parsing dates & financials...'],
    [93, 'Scoring classification & risk...'],
    [98, 'Finalizing...'],
  ]

  const simulateProgress = () => {
    let i = 0
    const tick = () => {
      if (i >= STAGES.length) return
      const [pct, label] = STAGES[i++]
      setProgress(pct); setStage(label)
      setTimeout(tick, 300 + Math.random() * 180)
    }
    tick()
  }

  const analyze = async (file) => {
    if (!file?.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file.'); return
    }
    setError(null); setLoading(true); setProgress(5); setStage('Uploading...')
    simulateProgress()
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await axios.post('/analyze', form)
      setProgress(100); setStage('Complete!')
      setTimeout(() => { setLoading(false); setProgress(0); setStage(''); onResult(res.data, file) }, 350)
    } catch (err) {
      setLoading(false); setProgress(0); setStage('')
      setError(err.response?.data?.detail || 'Analysis failed. Is the backend running on :8000?')
    }
  }

  const totalFlags = history.reduce((s, h) => s + h.risk.flags.length, 0)
  const avgScan = history.length ? (history.reduce((s, h) => s + h.scan_time_seconds, 0) / history.length).toFixed(2) : null

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 36px' }}>

      {/* Header */}
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>
          Contract Dashboard
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text2)' }}>
          Upload a PDF — all 6 extractors run in one algorithmic pass. No LLM, no cloud.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 32 }}>
        {[
          { icon: FileText,   label: 'Analyzed',       value: history.length || '—', color: 'var(--accent)',  sub: 'this session' },
          { icon: ShieldAlert,label: 'Total Flags',     value: totalFlags || '—',     color: 'var(--red)',     sub: 'across all scans' },
          { icon: Zap,        label: 'Avg Scan Time',   value: avgScan ? avgScan + 's' : '—', color: 'var(--green)', sub: 'single-pass' },
        ].map(({ icon: Icon, label, value, color, sub }) => (
          <div key={label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '18px 20px',
            borderTop: `2px solid ${color}`,
            boxShadow: 'var(--shadow)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <Icon size={13} color={color} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 30, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Upload zone */}
      <div
        onClick={() => !loading && inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); analyze(e.dataTransfer.files[0]) }}
        style={{
          border: `2px dashed ${drag ? 'var(--accent)' : 'var(--border2)'}`,
          borderRadius: 'var(--radius-lg)', padding: '48px 24px',
          textAlign: 'center', cursor: loading ? 'default' : 'pointer',
          background: drag ? 'var(--accent-glow)' : 'var(--surface)',
          transition: 'all 0.2s', marginBottom: 32,
          boxShadow: 'var(--shadow)',
        }}
      >
        <div style={{
          width: 56, height: 56, background: 'var(--surface2)',
          border: '1px solid var(--border2)', borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px',
        }}>
          {loading
            ? <Loader2 size={26} color="var(--accent2)" style={{ animation: 'spin 1s linear infinite' }} />
            : <Upload size={24} color="var(--accent2)" />
          }
        </div>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
          {loading ? stage : 'Drop your PDF contract here'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>
          {loading
            ? 'Extracting with single algorithmic pass...'
            : <span>or <span style={{ color: 'var(--accent)' }}>click to browse</span> — fully local, no cloud, no LLM</span>
          }
        </div>
        {loading && (
          <div style={{ marginTop: 20, maxWidth: 360, margin: '20px auto 0' }}>
            <div style={{ height: 4, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
                borderRadius: 2, transition: 'width 0.35s ease',
              }} />
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>{progress}%</div>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => analyze(e.target.files[0])} />

      {error && (
        <div style={{
          padding: '11px 15px', marginBottom: 24,
          background: 'var(--red-bg)', border: '1px solid rgba(220,38,38,0.25)',
          borderRadius: 'var(--radius)', color: 'var(--red)', fontSize: 13,
        }}>{error}</div>
      )}

      {/* How it works */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '20px 22px', marginBottom: 28,
        boxShadow: 'var(--shadow)',
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
          How it works
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            ['01', 'Single PDF Scan', 'pdfminer.six reads all pages once, building a page-map for date location tracking.'],
            ['02', 'Parallel Extractors', '6 algorithmic extractors run simultaneously per line — parties, dates, jurisdiction, financials, renewal, classification.'],
            ['03', 'Single Pass Results', 'Parties, jurisdiction, dates with page numbers, financials, renewal terms and classification — all in one scan.'],
          ].map(([num, title, desc]) => (
            <div key={num}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', marginBottom: 5 }}>{num}</div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 13, fontWeight: 700, marginBottom: 5 }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.65 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity */}
      {history.length > 0 && (
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Recent Activity
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.slice(0, 5).map((h, i) => {
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', background: 'var(--surface)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow)',
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.filename}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{h.classification?.primary}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{h.scan_time_seconds}s</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
      <div style={{ height: 40 }} />
    </div>
  )
}

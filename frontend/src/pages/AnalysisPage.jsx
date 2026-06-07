import { useState } from 'react'
import {
  ArrowLeft, Users, Globe, Calendar, RefreshCw, DollarSign, Tag,
  ShieldAlert, AlertTriangle, CheckCircle, ChevronDown, FileText
} from 'lucide-react'
import PdfViewer from '../components/PdfViewer.jsx'

// ── Underlined clickable text ─────────────────────────────────────
function Clickable({ onClick, children, mono, color }) {
  return (
    <span
      onClick={onClick}
      style={{
        cursor: 'pointer',
        fontFamily: mono ? 'var(--font-mono)' : 'inherit',
        fontSize: mono ? 12 : 'inherit',
        color: color || (mono ? 'var(--green)' : 'inherit'),
        fontWeight: mono ? 600 : 'inherit',
        textDecoration: 'underline',
        textDecorationStyle: 'dashed',
        textDecorationColor: color || 'var(--accent)',
        textUnderlineOffset: 3,
        transition: 'opacity 0.15s',
      }}
      onMouseOver={e => e.currentTarget.style.opacity = '0.7'}
      onMouseOut={e => e.currentTarget.style.opacity = '1'}
    >{children}</span>
  )
}

// ── Expandable card ───────────────────────────────────────────────
function Card({ icon: Icon, title, count, color, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow)',
    }}>
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 18px', cursor: 'pointer',
        borderBottom: open ? '1px solid var(--border)' : 'none',
        userSelect: 'none', transition: 'background 0.12s',
      }}
        onMouseOver={e => e.currentTarget.style.background = 'var(--surface2)'}
        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={14} color={color} />
          </div>
          <span style={{ fontFamily: 'var(--font-head)', fontSize: 13, fontWeight: 700 }}>{title}</span>
          {count !== undefined && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, background: 'var(--surface3)', border: '1px solid var(--border2)', borderRadius: 4, padding: '1px 7px', color: 'var(--text3)' }}>{count}</span>
          )}
        </div>
        <ChevronDown size={14} color="var(--text3)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>
      {open && <div style={{ padding: '14px 18px' }}>{children}</div>}
    </div>
  )
}

function FieldRow({ label, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 0', borderBottom: '1px solid var(--border)', gap: 12,
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{label}</span>
      <span>{children}</span>
    </div>
  )
}

function Chip({ label, color = 'accent', onClick }) {
  const map = {
    accent: ['var(--accent-glow2)', 'var(--accent)', 'var(--accent2)'],
    amber: ['var(--amber-bg)', 'rgba(217,119,6,0.3)', 'var(--amber)'],
    blue: ['var(--blue-bg)', 'rgba(37,99,235,0.3)', 'var(--blue)'],
    green: ['var(--green-bg)', 'rgba(5,150,105,0.3)', 'var(--green)'],
    pink: ['var(--pink-bg)', 'rgba(219,39,119,0.3)', 'var(--pink)'],
    red: ['var(--red-bg)', 'rgba(220,38,38,0.3)', 'var(--red)'],
  }
  const [bg, border, text] = map[color] || map.accent
  return (
    <span onClick={onClick} style={{
      display: 'inline-block', fontSize: 11,
      background: bg, border: `1px solid ${border}`, color: text,
      borderRadius: 5, padding: '3px 9px', margin: '2px 2px',
      cursor: onClick ? 'pointer' : 'default',
      textDecoration: onClick ? 'underline' : 'none',
      textDecorationStyle: 'dashed',
      textDecorationColor: text,
      textUnderlineOffset: 2,
      transition: 'opacity 0.15s',
    }}
      onMouseOver={e => { if (onClick) e.currentTarget.style.opacity = '0.7' }}
      onMouseOut={e => { if (onClick) e.currentTarget.style.opacity = '1' }}
    >{label}</span>
  )
}

function Empty({ text, warn }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: warn ? 'var(--amber)' : 'var(--text3)', padding: '2px 0' }}>
      {warn && <AlertTriangle size={12} />} {text}
    </div>
  )
}

export default function AnalysisPage({ result, pdfFile, onBack }) {
  const [highlight, setHighlight] = useState(null) // opens viewer when set

  if (!result) return null

  const {
    filename, scan_time_seconds, char_count, page_count,
    parties, jurisdiction, key_dates, renewal_terms,
    financials, classification, risk, stats,
  } = result



  // Opens PDF viewer at the right page with the right text highlighted
  const open = (text, label, page) => {
    if (!pdfFile) return
    setHighlight({ text, label, page: page || 1 })
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px' }}>

      {/* PDF viewer overlay — only when highlight is set */}
      {highlight && (
        <PdfViewer
          file={pdfFile}
          highlight={highlight}
          onClose={() => setHighlight(null)}
        />
      )}

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 26 }}>
        <button onClick={onBack} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', color: 'var(--text2)', fontSize: 13,
          boxShadow: 'var(--shadow)', cursor: 'pointer',
        }}>
          <ArrowLeft size={13} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <FileText size={15} color="var(--accent2)" />
            <span style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 700 }}>{filename}</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            {char_count?.toLocaleString()} chars · {scan_time_seconds}s · {stats.lines_scanned} lines · {page_count} pages
          </div>
        </div>

      </div>

      {/* Hint — only shown when PDF available */}
      {pdfFile && (
        <div style={{
          padding: '8px 14px', marginBottom: 20,
          background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)',
          borderRadius: 'var(--radius)', fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--amber)',
        }}>
          ◆ Underlined items are clickable — click to jump to that clause in the PDF
        </div>
      )}

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          ['Parties', stats.parties_found, 'var(--accent)'],
          ['Jurisdiction', jurisdiction.length, 'var(--blue)'],
          ['Dates', stats.dates_found, 'var(--green)'],
          ['Renewal', stats.renewal_clauses, 'var(--amber)'],
          ['Financials', stats.financials_found, 'var(--pink)'],
          ['Risk Flags', stats.risk_flags, 'var(--red)'],
        ].map(([label, val, color]) => (
          <div key={label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '12px 14px', textAlign: 'center',
            boxShadow: 'var(--shadow)',
          }}>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, color }}>{val}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Extraction cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Parties */}
        <Card icon={Users} title="Entities" count={parties.length} color="var(--accent)">
          {parties.length === 0 ? <Empty text="No parties detected" />
            : <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {parties.map((p, i) => {
                const name = typeof p === 'string' ? p : p.name
                const page = typeof p === 'string' ? 1 : (p.page || 1)
                return (
                  <Chip key={i} label={name} color="accent"
                    onClick={pdfFile ? () => open(name, 'Party', page) : undefined} />
                )
              })}
            </div>}
        </Card>

        {/* Jurisdiction */}
        <Card icon={Globe} title="Jurisdiction" count={jurisdiction.length} color="var(--blue)">
          {jurisdiction.length === 0 ? <Empty text="No jurisdiction found" warn />
            : jurisdiction.map((j, i) => (
              <FieldRow key={i} label={j.place}>
                {pdfFile
                  ? <Clickable onClick={() => open(j.place, 'Jurisdiction', j.page)} color="var(--blue)">
                    {j.context?.substring(0, 80)}{j.context?.length > 80 ? '…' : ''}
                  </Clickable>
                  : <span style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>
                    {j.context?.substring(0, 80)}{j.context?.length > 80 ? '…' : ''}
                  </span>
                }
              </FieldRow>
            ))}
        </Card>

        {/* Key Dates */}
        <Card icon={Calendar} title="Key Dates" count={key_dates.length} color="var(--green)">
          {key_dates.length === 0 ? <Empty text="No dates detected" warn />
            : key_dates.slice(0, 12).map((d, i) => (
              <FieldRow key={i} label={d.label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {pdfFile
                    ? <Clickable mono onClick={() => open(d.value, d.label, d.page)}>
                      {d.value}
                    </Clickable>
                    : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--green)' }}>{d.value}</span>
                  }
                  {d.page && (
                    <span
                      onClick={pdfFile ? () => open(d.value, d.label, d.page) : undefined}
                      style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)',
                        background: 'var(--surface3)', border: '1px solid var(--border2)',
                        borderRadius: 3, padding: '1px 5px',
                        cursor: pdfFile ? 'pointer' : 'default',
                      }}
                    >p.{d.page}</span>
                  )}
                </div>
              </FieldRow>
            ))}
        </Card>

        {/* Renewal Terms */}
        <Card icon={RefreshCw} title="Renewal Terms" count={renewal_terms.length} color="var(--amber)">
          {renewal_terms.length === 0 ? <Empty text="No renewal clauses detected" />
            : renewal_terms.map((r, i) => (
              <div key={i} style={{ padding: '7px 0', borderBottom: i < renewal_terms.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <Chip label={r.label} color="amber" />
                <div style={{ marginTop: 5 }}>
                  {pdfFile
                    ? <Clickable onClick={() => open(r.clause?.substring(0, 50), r.label, r.page)} color="var(--text2)">
                      <span style={{ fontSize: 11, lineHeight: 1.6 }}>
                        {r.clause?.substring(0, 140)}{r.clause?.length > 140 ? '…' : ''}
                      </span>
                    </Clickable>
                    : <span style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6 }}>
                      {r.clause?.substring(0, 140)}{r.clause?.length > 140 ? '…' : ''}
                    </span>
                  }
                </div>
              </div>
            ))}
        </Card>

        {/* Financials */}
        <Card icon={DollarSign} title="Financials" count={financials.length} color="var(--pink)">
          {financials.length === 0 ? <Empty text="No financial terms detected" />
            : financials.slice(0, 12).map((f, i) => (
              <FieldRow key={i} label={f.label}>
                {pdfFile
                  ? <Clickable mono onClick={() => open(f.value, f.label, f.page)}>{f.value}</Clickable>
                  : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>{f.value}</span>
                }
              </FieldRow>
            ))}
        </Card>

        {/* Classification */}
        <Card icon={Tag} title="Classification" color="var(--red)">
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)', marginBottom: 5 }}>PRIMARY TYPE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              {pdfFile && classification.keyword
                ? <Clickable
                  onClick={() => open(classification.keyword, classification.primary, classification.page || 1)}
                  color="var(--accent2)"
                >
                  <span style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700 }}>{classification.primary}</span>
                </Clickable>
                : <span style={{ fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700, color: 'var(--accent2)' }}>{classification.primary}</span>
              }
              <Chip label={`${classification.confidence}%`} color="accent" />
            </div>
            {classification.secondary && (
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                Also matches:{' '}
                {pdfFile && classification.secondary_keyword
                  ? <Clickable
                    onClick={() => open(classification.secondary_keyword, classification.secondary, classification.secondary_page || 1)}
                    color="var(--blue)"
                  >
                    {classification.secondary}
                  </Clickable>
                  : <span style={{ color: 'var(--blue)' }}>{classification.secondary}</span>
                }
              </div>
            )}
            {classification.keyword && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                Matched keyword: <span style={{ color: 'var(--accent)' }}>{classification.keyword}</span>
                {classification.page && <span style={{
                  marginLeft: 6, background: 'var(--surface3)', border: '1px solid var(--border2)',
                  borderRadius: 3, padding: '1px 5px'
                }}>p.{classification.page}</span>}
              </div>
            )}
          </div>
          {classification.scores?.map((s, i) => {
            const pct = Math.round((s.score / classification.scores[0].score) * 100)
            return (
              <div key={i} style={{ marginBottom: 7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)', marginBottom: 3 }}>
                  {pdfFile && s.keyword
                    ? <Clickable
                      onClick={() => open(s.keyword, s.type, s.page || 1)}
                      color={i === 0 ? 'var(--accent2)' : 'var(--text2)'}
                    >
                      {s.type}
                    </Clickable>
                    : <span>{s.type}</span>
                  }
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {s.keyword && <span style={{ color: 'var(--text4)', fontStyle: 'italic', fontSize: 10 }}>"{s.keyword}"</span>}
                    {s.score}
                  </span>
                </div>
                <div style={{ height: 3, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: pct + '%', background: i === 0 ? 'var(--accent)' : 'var(--surface4)', borderRadius: 2 }} />
                </div>
              </div>
            )
          })}

        </Card>
      </div>

      {/* Risk Flags */}
      {risk.flags.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <Card icon={ShieldAlert} title="Risk Flags" count={risk.flags.length} color="var(--red)" defaultOpen={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {risk.flags.map((f, i) => {
                const isGood = f.delta < 0
                const fc = isGood ? 'var(--green)' : f.severity === 'high' ? 'var(--red)' : f.severity === 'medium' ? 'var(--amber)' : 'var(--text2)'
                const FI = isGood ? CheckCircle : AlertTriangle
                return (
                  <div key={i} style={{
                    display: 'flex', gap: 10, padding: '9px 12px',
                    background: isGood ? 'var(--green-bg)' : 'var(--surface2)',
                    border: `1px solid ${fc}30`, borderRadius: 8,
                  }}>
                    <FI size={13} color={fc} style={{ marginTop: 1, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: fc, fontWeight: 500 }}>{f.description}</div>
                      {f.context && (
                        <div style={{ fontSize: 11, marginTop: 2 }}>
                          {pdfFile
                            ? <Clickable onClick={() => open(f.context.substring(0, 50), f.description, f.page)} color="var(--text3)">
                              <span style={{ fontStyle: 'italic' }}>{f.context.substring(0, 100)}…</span>
                            </Clickable>
                            : <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>{f.context.substring(0, 100)}…</span>
                          }
                        </div>
                      )}
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: fc, flexShrink: 0 }}>
                      {isGood ? '' : '+'}{f.delta}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      <div style={{ height: 50 }} />
    </div>
  )
}

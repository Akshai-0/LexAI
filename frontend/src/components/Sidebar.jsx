import { LayoutDashboard, FileText, Sun, Moon } from 'lucide-react'

const NAV = [
  { id: 'dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'results',   label: 'Scan Results', icon: FileText },
]

export default function Sidebar({ activePage, hasResult, dark, onToggleTheme, onDashboard, onNavSection }) {
  return (
    <aside style={{
      width: 240, minWidth: 240,
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', boxShadow: 'var(--shadow)',
    }}>
      {/* Logo */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, background: 'var(--accent)',
            borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px var(--accent-glow2)',
          }}>
            <FileText size={16} color="white" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 17, fontWeight: 800, letterSpacing: '-0.4px', color: 'var(--text)' }}>LexAI</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text3)', letterSpacing: '0.08em' }}>CONTRACT ANALYZER</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {NAV.map(item => {
          const Icon = item.icon
          const isActive   = activePage === item.id
          const isDisabled = item.id === 'results' && !hasResult
          return (
            <div key={item.id} onClick={() => {
              if (isDisabled) return
              item.id === 'dashboard' ? onDashboard() : onNavSection('results')
            }} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 20px',
              borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
              background: isActive ? 'var(--accent-glow)' : 'transparent',
              color: isDisabled ? 'var(--text4)' : 'var(--text2)',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.45 : 1,
              fontSize: 13, fontWeight: 500,
              transition: 'all 0.13s', userSelect: 'none',
            }}
              onMouseOver={e => { if (!isDisabled) { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.color = 'var(--accent2)' } }}
              onMouseOut={e => { e.currentTarget.style.background = isActive ? 'var(--accent-glow)' : 'transparent'; e.currentTarget.style.color = isDisabled ? 'var(--text4)' : 'var(--text2)' }}
            >
              <Icon size={15} style={{ flexShrink: 0 }} />
              <span>{item.label}</span>
            </div>
          )
        })}
      </nav>

      {/* Theme toggle */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text2)' }}>
            {dark ? <Moon size={13} /> : <Sun size={13} />}
            {dark ? 'Dark mode' : 'Light mode'}
          </div>
          <div onClick={onToggleTheme} style={{
            width: 38, height: 22, background: dark ? 'var(--accent)' : 'var(--surface3)',
            borderRadius: 11, position: 'relative', cursor: 'pointer',
            transition: 'background 0.25s', border: '1px solid var(--border2)', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: 2, left: dark ? 17 : 2,
              width: 16, height: 16, background: dark ? 'white' : 'var(--text3)',
              borderRadius: '50%', transition: 'left 0.22s cubic-bezier(.4,0,.2,1)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text4)', letterSpacing: '0.06em' }}>
          SINGLE-PASS ENGINE
        </div>
      </div>
    </aside>
  )
}

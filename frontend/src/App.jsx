import { useState } from 'react'
import useTheme from './hooks/useTheme.js'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import AnalysisPage from './pages/AnalysisPage.jsx'

export default function App() {
  const { dark, toggle } = useTheme()
  const [result, setResult]         = useState(null)
  const [pdfFile, setPdfFile]       = useState(null)  // raw File object kept in memory
  const [history, setHistory]       = useState([])
  const [activePage, setActivePage] = useState('dashboard')

  const handleResult = (data, file) => {
    setResult(data)
    setPdfFile(file)
    setHistory(prev => [data, ...prev].slice(0, 20))
    setActivePage('results')
  }

  const handleNewAnalysis = () => {
    setResult(null)
    setPdfFile(null)
    setActivePage('dashboard')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        activePage={activePage}
        hasResult={!!result}
        dark={dark}
        onToggleTheme={toggle}
        onDashboard={handleNewAnalysis}
        onNavSection={() => setActivePage('results')}
      />
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activePage === 'dashboard'
          ? <Dashboard onResult={handleResult} history={history} />
          : <AnalysisPage result={result} pdfFile={pdfFile} onBack={handleNewAnalysis} />
        }
      </main>
    </div>
  )
}

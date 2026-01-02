import { useState } from 'react'
import { Header } from './components/Header'
import { BottomNav } from './components/BottomNav'
import { AnalyzePage } from './pages/AnalyzePage'
import { CalendarPage } from './pages/CalendarPage'
import { StatsPage } from './pages/StatsPage'
import { SettingsPage } from './pages/SettingsPage'
import { AnalysisProvider } from './hooks/useAnalysis'

type View = 'analyze' | 'calendar' | 'stats' | 'settings'

function App() {
  const [currentView, setCurrentView] = useState<View>('analyze')

  return (
    <AnalysisProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Header />
        <main className="max-w-md mx-auto px-4 pt-20 pb-24">
          {/* 全ページを常にマウントし、CSSで表示/非表示を切り替え（stateを保持するため） */}
          <div className={currentView === 'analyze' ? '' : 'hidden'}>
            <AnalyzePage />
          </div>
          <div className={currentView === 'calendar' ? '' : 'hidden'}>
            <CalendarPage />
          </div>
          <div className={currentView === 'stats' ? '' : 'hidden'}>
            <StatsPage />
          </div>
          <div className={currentView === 'settings' ? '' : 'hidden'}>
            <SettingsPage />
          </div>
        </main>
        <BottomNav currentView={currentView} onNavigate={setCurrentView} />
      </div>
    </AnalysisProvider>
  )
}

export default App

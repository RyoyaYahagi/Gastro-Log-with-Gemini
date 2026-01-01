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

  const renderPage = () => {
    switch (currentView) {
      case 'analyze':
        return <AnalyzePage />
      case 'calendar':
        return <CalendarPage />
      case 'stats':
        return <StatsPage />
      case 'settings':
        return <SettingsPage />
    }
  }

  return (
    <AnalysisProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Header />
        <main className="max-w-md mx-auto px-4 pt-20 pb-24">
          {renderPage()}
        </main>
        <BottomNav currentView={currentView} onNavigate={setCurrentView} />
      </div>
    </AnalysisProvider>
  )
}

export default App


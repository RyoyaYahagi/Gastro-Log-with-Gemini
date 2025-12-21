type View = 'analyze' | 'calendar' | 'stats' | 'settings'

interface BottomNavProps {
    currentView: View
    onNavigate: (view: View) => void
}

const navItems: { id: View; label: string; icon: string }[] = [
    { id: 'analyze', label: '記録', icon: '📝' },
    { id: 'calendar', label: 'カレンダー', icon: '📅' },
    { id: 'stats', label: '統計', icon: '📊' },
    { id: 'settings', label: '設定', icon: '⚙️' },
]

export function BottomNav({ currentView, onNavigate }: BottomNavProps) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-200/50 pb-safe z-50">
            <div className="max-w-md mx-auto flex justify-around items-center h-16">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`flex flex-col items-center justify-center w-16 h-full transition-all ${currentView === item.id
                                ? 'text-blue-600 scale-105'
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <span className="text-xl mb-0.5">{item.icon}</span>
                        <span className="text-xs font-medium">{item.label}</span>
                    </button>
                ))}
            </div>
        </nav>
    )
}

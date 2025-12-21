export function Header() {
    return (
        <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-b border-gray-200/50 z-50">
            <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">🍽️</span>
                    <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Gastro Log
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <button className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform">
                        ?
                    </button>
                </div>
            </div>
        </header>
    )
}

import { useFoodLogs } from '../hooks/useFoodLogs'
import { useSafeList } from '../hooks/useSafeList'

export function StatsPage() {
    const { logs } = useFoodLogs()
    const { filterIngredients } = useSafeList()

    // 成分をカウント（Safe List を除外）
    const ingredientCounts: Record<string, number> = {}
    logs.forEach((log) => {
        const filtered = filterIngredients(log.ingredients || [])
        filtered.forEach((ing) => {
            ingredientCounts[ing] = (ingredientCounts[ing] || 0) + 1
        })
    })

    // ソートしてトップ5
    const sortedIngredients = Object.entries(ingredientCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)

    const maxCount = sortedIngredients[0]?.[1] || 1

    const colors = [
        'from-red-500 to-orange-500',
        'from-orange-500 to-amber-500',
        'from-amber-500 to-yellow-500',
        'from-yellow-500 to-lime-500',
        'from-lime-500 to-green-500',
    ]

    // 今月の記録数
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const monthLogs = logs.filter((log) => log.date.startsWith(thisMonth))

    return (
        <div className="space-y-6">
            {/* 成分ランキング */}
            <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <span>📊</span> 注意成分ランキング
                </h2>

                {sortedIngredients.length > 0 ? (
                    <div className="space-y-4">
                        {sortedIngredients.map(([name, count], index) => (
                            <div key={name} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-gray-700 flex items-center gap-2">
                                        <span className="text-lg">
                                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📍'}
                                        </span>
                                        {name}
                                    </span>
                                    <span className="text-sm text-gray-500">{count}回</span>
                                </div>
                                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full bg-gradient-to-r ${colors[index]} rounded-full transition-all duration-500`}
                                        style={{ width: `${(count / maxCount) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-400 text-center py-8">データなし</p>
                )}
            </div>

            {/* サマリー */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/30">
                    <div className="text-3xl font-bold">{monthLogs.length}</div>
                    <div className="text-sm opacity-80">今月の記録数</div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/30">
                    <div className="text-3xl font-bold">{logs.length}</div>
                    <div className="text-sm opacity-80">総記録数</div>
                </div>
            </div>
        </div>
    )
}

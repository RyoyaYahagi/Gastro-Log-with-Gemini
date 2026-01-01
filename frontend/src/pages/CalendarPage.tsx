import { useState } from 'react'
import { useFoodLogs } from '../hooks/useFoodLogs'

export function CalendarPage() {
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const { getLogsByDate, deleteLog } = useFoodLogs()
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()

    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayOfMonth = new Date(year, month, 1).getDay()

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i)

    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

    const selectedLogs = selectedDate ? getLogsByDate(selectedDate) : []

    const handleDelete = (id: string) => {
        if (confirm('削除しますか？')) {
            deleteLog(id)
        }
    }

    return (
        <div className="space-y-6">
            {/* カレンダーヘッダー */}
            <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
                    {year}年 {monthNames[month]}
                </h2>

                {/* 曜日ヘッダー */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
                        <div
                            key={day}
                            className={`text-center text-sm font-medium py-2 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
                                }`}
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* カレンダー日付 */}
                <div className="grid grid-cols-7 gap-1">
                    {emptyDays.map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square" />
                    ))}
                    {days.map((day) => {
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                        const isToday = day === today.getDate()
                        const isSelected = selectedDate === dateStr
                        const hasLogs = getLogsByDate(dateStr).length > 0

                        return (
                            <button
                                key={day}
                                onClick={() => setSelectedDate(dateStr)}
                                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-all relative ${isSelected
                                    ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30'
                                    : isToday
                                        ? 'bg-blue-100 text-blue-600'
                                        : 'hover:bg-gray-100 text-gray-700'
                                    }`}
                            >
                                {day}
                                {hasLogs && !isSelected && (
                                    <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-green-500" />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* 選択日の記録 */}
            <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                    {selectedDate ? `${selectedDate} の記録` : '日付を選択してください'}
                </h3>

                {selectedDate ? (
                    selectedLogs.length > 0 ? (
                        <div className="space-y-4">
                            {selectedLogs.map((log) => (
                                <div key={log.id} className="border border-gray-100 rounded-xl p-4">
                                    {log.createdAt && (
                                        <p className="text-xs text-gray-400 mb-2">
                                            🕐 {new Date(log.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    )}
                                    {log.image && (
                                        <img
                                            src={log.image}
                                            alt="食事"
                                            className="w-full h-32 object-cover rounded-lg mb-3"
                                        />
                                    )}
                                    {log.memo && (
                                        <p className="text-gray-700 text-sm mb-2">{log.memo}</p>
                                    )}
                                    {log.ingredients && log.ingredients.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-3">
                                            {log.ingredients.map((ing, i) => (
                                                <span
                                                    key={i}
                                                    className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs"
                                                >
                                                    {ing}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => handleDelete(log.id)}
                                        className="text-red-500 text-sm hover:underline"
                                    >
                                        削除
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-center py-8">記録がありません</p>
                    )
                ) : (
                    <p className="text-gray-400 text-center py-8">📅 日付をタップして記録を確認</p>
                )}
            </div>
        </div>
    )
}

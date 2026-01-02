import { useState, useRef } from 'react'
import { useFoodLogs } from '../hooks/useFoodLogs'
import { useAnalysis } from '../hooks/useAnalysis'
import { resizeImage } from '../lib/imageUtils'

export function AnalyzePage() {
    const [image, setImage] = useState<string | null>(null)
    const [memo, setMemo] = useState('')
    const [stressLevel, setStressLevel] = useState<number | null>(null)
    const [sleepHours, setSleepHours] = useState('')
    const [sleepMinutes, setSleepMinutes] = useState('')
    const [lifestyleMemo, setLifestyleMemo] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { addLog } = useFoodLogs()
    const { isAnalyzing, detectedIngredients, resultMessage, startAnalysis, resetResult } = useAnalysis()

    // ストレスレベルの色を取得（1: 緑 → 10: 赤）
    const getStressColor = (level: number, isSelected: boolean) => {
        const colors = [
            'bg-green-500',      // 1
            'bg-green-400',      // 2
            'bg-lime-400',       // 3
            'bg-yellow-400',     // 4
            'bg-yellow-500',     // 5
            'bg-amber-500',      // 6
            'bg-orange-500',     // 7
            'bg-orange-600',     // 8
            'bg-red-500',        // 9
            'bg-red-600',        // 10
        ]
        if (isSelected) return colors[level - 1]
        return 'bg-gray-200 hover:bg-gray-300'
    }

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (e) => {
            const originalDataUrl = e.target?.result as string
            try {
                // 画像をリサイズして圧縮
                const resizedDataUrl = await resizeImage(originalDataUrl)
                setImage(resizedDataUrl)
            } catch (error) {
                console.error('Failed to resize image:', error)
                // リサイズに失敗した場合は元の画像を使用
                setImage(originalDataUrl)
            }
        }
        reader.readAsDataURL(file)
    }

    // ローカルタイムゾーンで今日の日付を取得
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const handleSimpleSave = () => {
        addLog({
            date: today,
            image: image || undefined,
            memo: memo || undefined,
            ingredients: [],
            life: (stressLevel || sleepHours || lifestyleMemo) ? {
                stress: stressLevel || undefined,
                sleepTime: sleepHours ? `${sleepHours}h${sleepMinutes ? ` ${sleepMinutes}m` : ''}` : undefined,
                exercise: lifestyleMemo || undefined,
            } : undefined,
        })
        resetForm()
        resetResult() // 以前の解析結果もクリア
    }

    const handleAnalyze = async () => {
        const imageToAnalyze = image
        const memoToAnalyze = memo

        const result = await startAnalysis(imageToAnalyze, memoToAnalyze)

        if (result.success) {
            // 解析成功時にログを保存
            addLog({
                date: today,
                image: imageToAnalyze || undefined,
                memo: memoToAnalyze || undefined,
                ingredients: result.ingredients,
                life: (stressLevel || sleepHours || lifestyleMemo) ? {
                    stress: stressLevel || undefined,
                    sleepTime: sleepHours ? `${sleepHours}h${sleepMinutes ? ` ${sleepMinutes}m` : ''}` : undefined,
                    exercise: lifestyleMemo || undefined,
                } : undefined,
            })

            // フォームをクリア
            setImage(null)
            setMemo('')
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const resetForm = () => {
        setImage(null)
        setMemo('')
        setStressLevel(null)
        setSleepHours('')
        setSleepMinutes('')
        setLifestyleMemo('')
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    return (
        <div className="space-y-6">
            {/* 画像アップロード */}
            <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span>📸</span> 食事を記録
                </h2>

                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl aspect-video flex items-center justify-center cursor-pointer transition-all hover:border-blue-400 hover:bg-blue-50/50 ${image ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200 bg-gray-50/50'
                        }`}
                >
                    {image ? (
                        <img src={image} alt="プレビュー" className="w-full h-full object-contain rounded-lg" />
                    ) : (
                        <div className="text-center text-gray-400">
                            <div className="text-4xl mb-2">📷</div>
                            <p className="text-sm">タップして画像を選択</p>
                        </div>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                    />
                </div>
            </div>

            {/* 食事メモ入力 */}
            <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span>🍽️</span> 食事メモ
                </h2>
                <p className="text-xs text-gray-400 mb-2">AI解析に使用されます</p>
                <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="食事の内容、食べた時間、飲んだもの..."
                    className="w-full p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50/50"
                    rows={2}
                />
            </div>

            {/* 生活習慣メモ入力 */}
            <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span>🏃</span> 運動・生活習慣
                </h2>
                <textarea
                    value={lifestyleMemo}
                    onChange={(e) => setLifestyleMemo(e.target.value)}
                    placeholder="散歩30分、ジム、ストレッチ、水2L飲んだ..."
                    className="w-full p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-gray-50/50"
                    rows={2}
                />
            </div>

            {/* ストレスレベル入力 */}
            <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span>😰</span> ストレスレベル
                </h2>
                <div className="flex justify-between gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                        <button
                            key={level}
                            onClick={() => setStressLevel(stressLevel === level ? null : level)}
                            className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${getStressColor(level, stressLevel === level)
                                } ${stressLevel === level ? 'text-white shadow-md scale-105' : 'text-gray-600'}`}
                        >
                            {level}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                    1 = リラックス、10 = 非常にストレスフル
                </p>
            </div>

            {/* 睡眠時間入力 */}
            <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span>😴</span> 睡眠時間
                </h2>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            max="24"
                            value={sleepHours}
                            onChange={(e) => setSleepHours(e.target.value)}
                            placeholder="0"
                            className="w-16 p-3 text-center text-lg font-bold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50/50"
                        />
                        <span className="text-gray-600 font-medium">時間</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            max="59"
                            value={sleepMinutes}
                            onChange={(e) => setSleepMinutes(e.target.value)}
                            placeholder="0"
                            className="w-16 p-3 text-center text-lg font-bold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50/50"
                        />
                        <span className="text-gray-600 font-medium">分</span>
                    </div>
                </div>
            </div>

            {/* 解析ボタン */}
            <div className="flex gap-3">
                <button
                    onClick={handleSimpleSave}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 px-4 rounded-xl transition-all"
                >
                    そのまま記録
                </button>
                <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="flex-[2] bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {isAnalyzing ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="animate-spin">⏳</span> 解析中...
                        </span>
                    ) : (
                        <span className="flex items-center justify-center gap-2">
                            <span>✨</span> 成分解析して記録
                        </span>
                    )}
                </button>
            </div>

            {/* 結果メッセージ */}
            {resultMessage && (
                <div className={`rounded-2xl p-4 ${resultMessage.type === 'success' ? 'bg-green-50 border border-green-200' :
                    resultMessage.type === 'warning' ? 'bg-amber-50 border border-amber-200' :
                        'bg-red-50 border border-red-200'
                    }`}>
                    <p className={`text-sm font-medium ${resultMessage.type === 'success' ? 'text-green-700' :
                        resultMessage.type === 'warning' ? 'text-amber-700' :
                            'text-red-700'
                        }`}>
                        {resultMessage.type === 'success' && '✅ '}
                        {resultMessage.type === 'warning' && '⚠️ '}
                        {resultMessage.type === 'error' && '❌ '}
                        {resultMessage.text}
                    </p>
                </div>
            )}

            {/* 検出された成分 */}
            {detectedIngredients.length > 0 && (
                <div className="bg-red-50 rounded-2xl p-4 border border-red-200">
                    <h3 className="text-sm font-bold text-red-700 mb-2">⚠️ 検出された注意成分</h3>
                    <div className="flex flex-wrap gap-2">
                        {detectedIngredients.map((ing, i) => (
                            <span key={i} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                                {ing}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}


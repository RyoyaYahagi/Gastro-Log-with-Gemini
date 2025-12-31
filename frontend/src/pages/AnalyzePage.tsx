import { useState, useRef } from 'react'
import { useFoodLogs } from '../hooks/useFoodLogs'
import { analyzeFood } from '../lib/gemini'

type ResultMessage = {
    type: 'success' | 'warning' | 'error'
    text: string
} | null

export function AnalyzePage() {
    const [image, setImage] = useState<string | null>(null)
    const [memo, setMemo] = useState('')
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [detectedIngredients, setDetectedIngredients] = useState<string[]>([])
    const [resultMessage, setResultMessage] = useState<ResultMessage>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { addLog } = useFoodLogs()

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            setImage(e.target?.result as string)
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
        })
        resetForm()
        setResultMessage({ type: 'success', text: '記録しました' })
    }

    const handleAnalyze = async () => {
        const apiKey = localStorage.getItem('gemini_api_key')
        const model = localStorage.getItem('gemini_model') || 'gemini-2.5-flash'

        if (!apiKey) {
            setResultMessage({ type: 'error', text: 'Gemini API Key を設定してください' })
            return
        }

        if (!image && !memo) {
            setResultMessage({ type: 'error', text: '画像またはメモを入力してください' })
            return
        }

        setIsAnalyzing(true)
        setDetectedIngredients([])
        setResultMessage(null)

        try {
            const ingredients = await analyzeFood(image, memo, apiKey, model)
            setDetectedIngredients(ingredients)

            // ログを保存
            addLog({
                date: today,
                image: image || undefined,
                memo: memo || undefined,
                ingredients,
            })

            if (ingredients.length > 0) {
                setResultMessage({ type: 'warning', text: `注意成分を検出しました` })
            } else {
                setResultMessage({ type: 'success', text: '注意成分は検出されませんでした。記録しました。' })
            }

            // 成功時はフォームをリセット（結果メッセージと検出成分は残す）
            setImage(null)
            setMemo('')
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        } catch (error) {
            setResultMessage({ type: 'error', text: `解析エラー: ${error instanceof Error ? error.message : '不明なエラー'}` })
        } finally {
            setIsAnalyzing(false)
        }
    }

    const resetForm = () => {
        setImage(null)
        setMemo('')
        setDetectedIngredients([])
        setResultMessage(null)
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

            {/* メモ入力 */}
            <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span>✏️</span> メモ
                </h2>
                <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="食事の内容、食べた時間など..."
                    className="w-full p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50/50"
                    rows={3}
                />
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


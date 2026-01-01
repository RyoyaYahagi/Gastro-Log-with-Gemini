import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'
import { analyzeFood } from '../lib/gemini'

type ResultMessage = {
    type: 'success' | 'warning' | 'error'
    text: string
} | null

interface AnalysisState {
    isAnalyzing: boolean
    detectedIngredients: string[]
    resultMessage: ResultMessage
}

interface AnalysisResult {
    success: boolean
    ingredients: string[]
}

interface AnalysisContextValue extends AnalysisState {
    startAnalysis: (image: string | null, memo: string) => Promise<AnalysisResult>
    resetResult: () => void
    setSuccessMessage: (message: string) => void
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null)

export function AnalysisProvider({ children }: { children: ReactNode }) {
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [detectedIngredients, setDetectedIngredients] = useState<string[]>([])
    const [resultMessage, setResultMessage] = useState<ResultMessage>(null)

    // 解析中かどうかを追跡するref（コンポーネントがアンマウントされても維持）
    const analyzingRef = useRef(false)

    const startAnalysis = useCallback(async (image: string | null, memo: string): Promise<AnalysisResult> => {
        const apiKey = localStorage.getItem('gemini_api_key')
        const model = localStorage.getItem('gemini_model') || 'gemini-2.5-flash'

        if (!apiKey) {
            setResultMessage({ type: 'error', text: 'Gemini API Key を設定してください' })
            return { success: false, ingredients: [] }
        }

        if (!image && !memo) {
            setResultMessage({ type: 'error', text: '画像またはメモを入力してください' })
            return { success: false, ingredients: [] }
        }

        // 既に解析中なら早期リターン
        if (analyzingRef.current) {
            return { success: false, ingredients: [] }
        }

        analyzingRef.current = true
        setIsAnalyzing(true)
        setDetectedIngredients([])
        setResultMessage(null)

        try {
            const ingredients = await analyzeFood(image, memo, apiKey, model)
            setDetectedIngredients(ingredients)

            if (ingredients.length > 0) {
                setResultMessage({ type: 'warning', text: `注意成分を検出しました` })
            } else {
                setResultMessage({ type: 'success', text: '注意成分は検出されませんでした。記録しました。' })
            }

            return { success: true, ingredients }
        } catch (error) {
            setResultMessage({ type: 'error', text: `解析エラー: ${error instanceof Error ? error.message : '不明なエラー'}` })
            return { success: false, ingredients: [] }
        } finally {
            analyzingRef.current = false
            setIsAnalyzing(false)
        }
    }, [])

    const resetResult = useCallback(() => {
        setDetectedIngredients([])
        setResultMessage(null)
    }, [])

    const setSuccessMessage = useCallback((message: string) => {
        setResultMessage({ type: 'success', text: message })
    }, [])

    return (
        <AnalysisContext.Provider value={{
            isAnalyzing,
            detectedIngredients,
            resultMessage,
            startAnalysis,
            resetResult,
            setSuccessMessage,
        }}>
            {children}
        </AnalysisContext.Provider>
    )
}

export function useAnalysis() {
    const context = useContext(AnalysisContext)
    if (!context) {
        throw new Error('useAnalysis must be used within AnalysisProvider')
    }
    return context
}


import { useState, useEffect } from 'react'

const STORAGE_KEY = 'safe_list'

export function useSafeList() {
    const [safeList, setSafeList] = useState<string[]>([])

    // 初期ロード
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            try {
                setSafeList(JSON.parse(saved))
            } catch {
                setSafeList([])
            }
        }
    }, [])

    // 成分を追加
    const addItem = (item: string) => {
        const trimmed = item.trim()
        if (!trimmed || safeList.includes(trimmed)) return

        const updated = [...safeList, trimmed]
        setSafeList(updated)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    }

    // 成分を削除
    const removeItem = (item: string) => {
        const updated = safeList.filter((i) => i !== item)
        setSafeList(updated)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    }

    // Safe List に含まれているかチェック
    const isInSafeList = (item: string) => {
        return safeList.includes(item)
    }

    // 成分リストから Safe List の成分を除外
    const filterIngredients = (ingredients: string[]) => {
        return ingredients.filter((ing) => !safeList.includes(ing))
    }

    return {
        safeList,
        addItem,
        removeItem,
        isInSafeList,
        filterIngredients,
    }
}

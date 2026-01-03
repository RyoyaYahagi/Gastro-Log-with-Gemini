import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { api } from '../lib/api'

const STORAGE_KEY = 'safe_list'

export function useSafeList() {
    const [safeList, setSafeList] = useState<string[]>([])
    const [isSyncing, setIsSyncing] = useState(false)
    const { user, getToken } = useAuth()
    const hasSyncedRef = useRef(false)

    // ローカルストレージからロード
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

    // クラウドから同期（ログイン時のみ、一度だけ）
    useEffect(() => {
        if (!user || hasSyncedRef.current) return

        const syncFromCloud = async () => {
            try {
                const token = await getToken()
                if (!token) return

                const cloudItems = await api.getSafeList(token)

                // ローカルとクラウドをマージ（重複排除）
                const localItems: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
                const merged = [...new Set([...cloudItems, ...localItems])]

                setSafeList(merged)
                localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))

                // マージ結果をクラウドにも保存
                if (merged.length !== cloudItems.length) {
                    await api.saveSafeList(token, merged)
                }

                hasSyncedRef.current = true
            } catch (error) {
                console.error('Failed to sync safe list from cloud:', error)
            }
        }

        syncFromCloud()
    }, [user, getToken])

    // クラウドに保存
    const saveToCloud = useCallback(async (items: string[]) => {
        if (!user) return

        setIsSyncing(true)
        try {
            const token = await getToken()
            if (token) {
                await api.saveSafeList(token, items)
            }
        } catch (error) {
            console.error('Failed to save safe list to cloud:', error)
        } finally {
            setIsSyncing(false)
        }
    }, [user, getToken])

    // 成分を追加
    const addItem = useCallback((item: string) => {
        const trimmed = item.trim()
        if (!trimmed || safeList.includes(trimmed)) return

        const updated = [...safeList, trimmed]
        setSafeList(updated)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        saveToCloud(updated)
    }, [safeList, saveToCloud])

    // 成分を削除
    const removeItem = useCallback((item: string) => {
        const updated = safeList.filter((i) => i !== item)
        setSafeList(updated)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        saveToCloud(updated)
    }, [safeList, saveToCloud])

    // Safe List に含まれているかチェック（部分一致）
    // 例: safeList に "卵" があれば "卵（アレルゲン）" もマッチする
    const isInSafeList = useCallback((item: string) => {
        return safeList.some(safe =>
            item.includes(safe) || safe.includes(item)
        )
    }, [safeList])

    // 成分リストから Safe List の成分を除外（部分一致）
    const filterIngredients = useCallback((ingredients: string[]) => {
        return ingredients.filter((ing) =>
            !safeList.some(safe => ing.includes(safe) || safe.includes(ing))
        )
    }, [safeList])

    return {
        safeList,
        addItem,
        removeItem,
        isInSafeList,
        filterIngredients,
        isSyncing,
    }
}

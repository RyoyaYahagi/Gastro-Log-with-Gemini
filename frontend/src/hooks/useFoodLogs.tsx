import { useState, useEffect, useRef, createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { type FoodLog, api } from '../lib/api'
import { useAuth } from './useAuth'

const STORAGE_KEY = 'food_history'

// localStorage 用に画像を除外したログを作成
const stripImageForStorage = (log: LocalStorageLog): LocalStorageLog => {
    const { image, ...rest } = log
    return rest as LocalStorageLog
}

// Context の型定義
// Context の型定義
interface LocalStorageLog extends FoodLog {
    synced?: boolean
}

interface FoodLogsContextType {
    logs: LocalStorageLog[]
    addLog: (log: Omit<FoodLog, 'id' | 'createdAt'>) => FoodLog
    deleteLog: (id: string) => Promise<void>
    getLogsByDate: (date: string) => FoodLog[]
}

// Context 作成
const FoodLogsContext = createContext<FoodLogsContextType | null>(null)

// Provider コンポーネント
export function FoodLogsProvider({ children }: { children: ReactNode }) {
    const [logs, setLogs] = useState<LocalStorageLog[]>([])
    const { user, getToken } = useAuth()
    const hasSyncedRef = useRef(false)
    const lastUserIdRef = useRef<string | null>(null)

    // 初期ロードと同期
    useEffect(() => {
        const userId = user?.id || null

        if (hasSyncedRef.current && lastUserIdRef.current === userId) {
            return
        }

        if (lastUserIdRef.current !== userId) {
            hasSyncedRef.current = false
            lastUserIdRef.current = userId
            setLogs([]) // ユーザー切り替え時にクリア
        }

        const syncLogs = async () => {
            // ローカルデータを常に取得しておく
            const localSaved = localStorage.getItem(STORAGE_KEY)
            let localLogs: LocalStorageLog[] = []
            if (localSaved) {
                try {
                    localLogs = JSON.parse(localSaved)
                } catch {
                    localLogs = []
                }
            }

            if (user) {
                try {
                    const token = await getToken()
                    if (token) {
                        // クラウドからデータを取得
                        const cloudLogs = await api.getLogs(token)

                        // 未同期データを特定 (synced === false のみ)
                        const unsyncedLogs = localLogs.filter(l => l.synced === false)

                        if (unsyncedLogs.length > 0) {
                            await api.saveLogs(token, unsyncedLogs)
                            const syncedLogs = await api.getLogs(token)
                            const mergedLogs: LocalStorageLog[] = syncedLogs.map(l => ({ ...l, synced: true }))
                            setLogs(mergedLogs)
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedLogs.map(stripImageForStorage)))
                        } else {
                            // 未同期がない場合、クラウドのデータを正とする
                            const mergedLogs: LocalStorageLog[] = cloudLogs.map(l => ({ ...l, synced: true }))
                            setLogs(mergedLogs)
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedLogs.map(stripImageForStorage)))
                        }

                        hasSyncedRef.current = true
                    }
                } catch (e) {
                    console.error('Failed to sync logs:', e)
                    setLogs(localLogs)
                }
            } else {
                setLogs(localLogs)
                hasSyncedRef.current = true
            }
        }
        syncLogs()
    }, [user?.id, getToken])

    // 保存処理
    const saveLogsData = async (newLogs: LocalStorageLog[]) => {
        // まずUI反映とローカル保存（synced状態はそのまま）
        setLogs(newLogs)
        try {
            const stripped = newLogs.map(stripImageForStorage)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped))
        } catch (e) {
            console.error('Failed to save to localStorage:', e)
        }

        if (user) {
            try {
                const token = await getToken()
                if (token) {
                    // ここでは全量渡しているが、API側はUPSERTなのでOK
                    // 最適化するなら unsynced だけ渡すべきだが、今回は安全策で
                    await api.saveLogs(token, newLogs)

                    // 成功したら全アイテムを synced: true に更新
                    const syncedLogs = newLogs.map(l => ({ ...l, synced: true }))
                    setLogs(syncedLogs)
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(syncedLogs.map(stripImageForStorage)))
                }
            } catch (e) {
                console.error('Failed to save to cloud:', e)
                // 失敗した場合、newLogs (一部 synced: false) のままなので、次回起動時に再試行される
            }
        }
    }

    // ログ追加
    const addLog = (log: Omit<FoodLog, 'id' | 'createdAt'>) => {
        const newLog: LocalStorageLog = {
            ...log,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            synced: false, // 新規作成時は未同期
        }
        const updated = [newLog, ...logs]
        saveLogsData(updated)
        return newLog
    }

    // ログ削除
    const deleteLog = async (id: string) => {
        const updated = logs.filter((log) => log.id !== id)
        setLogs(updated)

        // ローカルストレージも更新
        try {
            const stripped = updated.map(stripImageForStorage)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped))
        } catch (e) {
            console.error('Failed to save to localStorage:', e)
        }

        if (user) {
            try {
                const token = await getToken()
                if (token) {
                    await api.deleteLog(token, id)
                }
            } catch (e) {
                console.error('Failed to delete from cloud:', e)
            }
        }
    }

    // 日付でフィルター
    const getLogsByDate = (date: string) => {
        return logs.filter((log) => log.date === date)
    }

    return (
        <FoodLogsContext.Provider value={{ logs, addLog, deleteLog, getLogsByDate }
        }>
            {children}
        </FoodLogsContext.Provider>
    )
}

// カスタムフック（Context から値を取得）
export function useFoodLogs(): FoodLogsContextType {
    const context = useContext(FoodLogsContext)
    if (!context) {
        throw new Error('useFoodLogs must be used within a FoodLogsProvider')
    }
    return context
}

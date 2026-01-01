import { useState, useEffect, useRef } from 'react'
import { type FoodLog, api } from '../lib/api'
import { useAuth } from './useAuth'

const STORAGE_KEY = 'food_history'

// localStorage 用に画像を除外したログを作成
const stripImageForStorage = (log: FoodLog): FoodLog => {
    const { image, ...rest } = log
    return rest
}

export function useFoodLogs() {
    const [logs, setLogs] = useState<FoodLog[]>([])
    const { user, getToken } = useAuth()
    const hasSyncedRef = useRef(false)
    const lastUserIdRef = useRef<string | null>(null)

    // 初期ロードと同期
    useEffect(() => {
        const userId = user?.id || null

        // 同じユーザーで既に同期済みの場合はスキップ
        if (hasSyncedRef.current && lastUserIdRef.current === userId) {
            return
        }

        // ユーザーが変わった場合はリセット
        if (lastUserIdRef.current !== userId) {
            hasSyncedRef.current = false
            lastUserIdRef.current = userId
        }

        const syncLogs = async () => {
            // ローカルデータを常に取得しておく
            const localSaved = localStorage.getItem(STORAGE_KEY)
            let localLogs: FoodLog[] = []
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
                        // 1. クラウドからデータを取得
                        const cloudLogs = await api.getLogs(token)

                        // 2. ローカルにあってクラウドにないデータを探す（IDで比較）
                        // ※ IDだけでなく、オフラインで編集された可能性も考慮すべきだが、
                        //    今回は「IDが存在しないもの＝新規作成されたもの」として同期する
                        const cloudIds = new Set(cloudLogs.map(l => l.id))
                        const unsyncedLogs = localLogs.filter(l => !cloudIds.has(l.id))

                        if (unsyncedLogs.length > 0) {
                            console.log(`Syncing ${unsyncedLogs.length} logs to cloud...`)
                            // 画像も含めてアップロード
                            await api.saveLogs(token, unsyncedLogs)

                            // 同期後に再度取得して最新状態にする
                            const syncedLogs = await api.getLogs(token)
                            setLogs(syncedLogs)
                        } else {
                            setLogs(cloudLogs)
                        }

                        // 同期成功
                        hasSyncedRef.current = true
                    }
                } catch (e) {
                    console.error('Failed to sync logs:', e)
                    // エラー時はローカルデータを表示（オフライン対応）
                    setLogs(localLogs)
                    // エラーでも同期済みとして扱う（無限リトライを防ぐ）
                    hasSyncedRef.current = true
                }
            } else {
                // 未ログイン時はローカルデータを表示
                setLogs(localLogs)
                hasSyncedRef.current = true

                // ローカルデータのマイグレーション（画像削除）
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const hasImage = localLogs.some((log: any) => log.image && log.image.length > 100)
                if (hasImage) {
                    console.log('Migrating data: removing images from storage')
                    const stripped = localLogs.map(stripImageForStorage)
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped))
                }
            }
        }
        syncLogs()
    }, [user?.id, getToken])

    // 保存処理（ログイン状態により分岐）
    const saveLogsData = async (newLogs: FoodLog[]) => {
        setLogs(newLogs)

        if (user) {
            try {
                const token = await getToken()
                if (token) {
                    // 画像も含めてクラウドに保存
                    // 注意: Base64画像は大きいため、将来的にはR2等の専用ストレージが望ましい
                    await api.saveLogs(token, newLogs)
                }
            } catch (e) {
                console.error('Failed to save to cloud:', e)
            }
        } else {
            // ローカル保存
            try {
                const stripped = newLogs.map(stripImageForStorage)
                localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped))
            } catch (e) {
                console.error('Failed to save to localStorage:', e)
            }
        }
    }

    // ログ追加
    const addLog = (log: Omit<FoodLog, 'id' | 'createdAt'>) => {
        const newLog: FoodLog = {
            ...log,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
        }
        const updated = [newLog, ...logs]
        saveLogsData(updated)
        return newLog
    }

    // ログ削除
    const deleteLog = async (id: string) => {
        const updated = logs.filter((log) => log.id !== id)
        setLogs(updated) // UIを先に更新（Optimistic UI）

        if (user) {
            try {
                const token = await getToken()
                if (token) {
                    await api.deleteLog(token, id)
                }
            } catch (e) {
                console.error('Failed to delete from cloud:', e)
                // ロールバック等の処理が必要だが今回は省略
            }
        } else {
            // ローカル保存
            try {
                const stripped = updated.map(stripImageForStorage)
                localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped))
            } catch (e) {
                console.error('Failed to save to localStorage:', e)
            }
        }
    }

    // 日付でフィルター
    const getLogsByDate = (date: string) => {
        return logs.filter((log) => log.date === date)
    }

    return {
        logs,
        addLog,
        deleteLog,
        getLogsByDate,
    }
}


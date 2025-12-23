import { useState, useEffect } from 'react'
import { type FoodLog } from '../lib/api'

const STORAGE_KEY = 'food_history'

// localStorage 用に画像を除外したログを作成
const stripImageForStorage = (log: FoodLog): FoodLog => {
    const { image, ...rest } = log
    return rest
}

export function useFoodLogs() {
    const [logs, setLogs] = useState<FoodLog[]>([])

    // 初期ロードとマイグレーション
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                setLogs(parsed)

                // 画像データが含まれていたら削除して再保存（マイグレーション）
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const hasImage = parsed.some((log: any) => log.image && log.image.length > 100)
                if (hasImage) {
                    console.log('Migrating data: removing images from storage')
                    const stripped = parsed.map(stripImageForStorage)
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped))
                }
            } catch {
                setLogs([])
            }
        }
    }, [])

    // localStorage に保存（画像を除外）
    const saveToStorage = (logsToSave: FoodLog[]) => {
        try {
            const stripped = logsToSave.map(stripImageForStorage)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped))
        } catch (e) {
            console.error('Failed to save to localStorage:', e)
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
        setLogs(updated)
        saveToStorage(updated)
        return newLog
    }

    // ログ削除
    const deleteLog = (id: string) => {
        const updated = logs.filter((log) => log.id !== id)
        setLogs(updated)
        saveToStorage(updated)
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


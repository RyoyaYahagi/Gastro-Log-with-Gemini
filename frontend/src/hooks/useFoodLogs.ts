import { useState, useEffect } from 'react'
import { type FoodLog } from '../lib/api'

const STORAGE_KEY = 'food_history'

export function useFoodLogs() {
    const [logs, setLogs] = useState<FoodLog[]>([])

    // 初期ロード
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            try {
                setLogs(JSON.parse(saved))
            } catch {
                setLogs([])
            }
        }
    }, [])

    // ログ追加
    const addLog = (log: Omit<FoodLog, 'id' | 'createdAt'>) => {
        const newLog: FoodLog = {
            ...log,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
        }
        const updated = [newLog, ...logs]
        setLogs(updated)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        return newLog
    }

    // ログ削除
    const deleteLog = (id: string) => {
        const updated = logs.filter((log) => log.id !== id)
        setLogs(updated)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
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

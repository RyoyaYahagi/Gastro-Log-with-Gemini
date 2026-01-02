// 食事ログの型定義
export interface FoodLog {
    id: string
    date: string
    image?: string
    memo?: string
    ingredients?: string[]
    life?: LifeData
    createdAt?: string
    updatedAt?: string
}

export interface LifeData {
    sleepTime?: string
    sleepQuality?: string
    medication?: string
    exercise?: string
    steps?: string
    stress?: number
}

// API ベース URL (末尾スラッシュを除去)
const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787').replace(/\/$/, '')

// API クライアント
export const api = {
    // ログ取得
    async getLogs(token: string): Promise<FoodLog[]> {
        const res = await fetch(`${API_BASE}/api/logs`, {
            headers: { 'Authorization': `Bearer ${token}` },
        })
        const data = await res.json()
        return data.logs || []
    },

    // ログ保存
    async saveLogs(token: string, logs: FoodLog[]): Promise<void> {
        await fetch(`${API_BASE}/api/logs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ logs }),
        })
    },

    // ログ削除
    async deleteLog(token: string, id: string): Promise<void> {
        await fetch(`${API_BASE}/api/logs/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        })
    },

    // セーフリスト取得
    async getSafeList(token: string): Promise<string[]> {
        const res = await fetch(`${API_BASE}/api/safelist`, {
            headers: { 'Authorization': `Bearer ${token}` },
        })
        const data = await res.json()
        return data.items || []
    },

    // セーフリスト保存
    async saveSafeList(token: string, items: string[]): Promise<void> {
        await fetch(`${API_BASE}/api/safelist`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ items }),
        })
    },
}

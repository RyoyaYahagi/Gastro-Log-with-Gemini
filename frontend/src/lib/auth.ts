import { createAuthClient } from 'better-auth/react'

// Neon Auth Base URL（Neon Console から取得）
const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || ''

export const authClient = createAuthClient({
    baseURL: AUTH_BASE_URL,
})

// 型エクスポート
export type Session = typeof authClient.$Infer.Session
export type User = Session['user']

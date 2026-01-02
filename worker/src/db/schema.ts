import { pgTable, uuid, text, timestamp, jsonb, integer, boolean } from 'drizzle-orm/pg-core';

// ========================================
// Neon Auth テーブル（自動生成）
// ========================================
// Neon Auth が自動的に以下のテーブルを管理:
// - auth.users
// - auth.sessions
// - auth.accounts
// - auth.passkeys

// ========================================
// アプリケーションテーブル
// ========================================

// 食事ログ
export const foodLogs = pgTable('food_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    clientId: text('client_id').notNull(), // ローカルで生成されたID
    date: text('date').notNull(),
    image: text('image'),
    memo: text('memo'),
    ingredients: jsonb('ingredients').$type<string[]>().default([]),
    life: jsonb('life').$type<{
        sleepTime?: string;
        sleepQuality?: string;
        medication?: string;
        exercise?: string;
        steps?: string;
        stress?: number;
    }>(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// 薬履歴
export const medicationHistory = pgTable('medication_history', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

// セーフリスト（安全な成分リスト）
export const safeList = pgTable('safe_list', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    item: text('item').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

// 型エクスポート
export type FoodLog = typeof foodLogs.$inferSelect;
export type NewFoodLog = typeof foodLogs.$inferInsert;
export type Medication = typeof medicationHistory.$inferSelect;
export type NewMedication = typeof medicationHistory.$inferInsert;
export type SafeListItem = typeof safeList.$inferSelect;
export type NewSafeListItem = typeof safeList.$inferInsert;


import { createDb } from './db';
import { foodLogs, medicationHistory, safeList } from './db/schema';
import { eq, and } from 'drizzle-orm';

// 環境変数
interface Env {
    DATABASE_URL: string;
    FRONTEND_URL: string;
}

// CORS ヘッダー
function corsHeaders(origin: string, env: Env): HeadersInit {
    const isLocalhost = origin?.startsWith('http://localhost:') ||
        origin?.startsWith('http://127.0.0.1:') ||
        origin === 'null';

    // Cloudflare Pagesのプレビューデプロイも許可
    // 例: https://046ab0ab.gastro-log.pages.dev
    const frontendDomain = env.FRONTEND_URL?.replace('https://', '') || '';
    const isPreviewDeploy = origin?.endsWith(`.${frontendDomain}`) ||
        origin?.match(/^https:\/\/[a-f0-9]+\.gastro-log\.pages\.dev$/);
    const isAllowedOrigin = isLocalhost || origin === env.FRONTEND_URL || isPreviewDeploy;
    const allowOrigin = isAllowedOrigin ? origin : env.FRONTEND_URL;

    return {
        'Access-Control-Allow-Origin': allowOrigin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
    };
}

function jsonResponse(data: unknown, status: number, origin: string, env: Env): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin, env) },
    });
}

// JWT トークンからユーザーID を取得
function getUserIdFromToken(authHeader: string | null): string | null {
    if (!authHeader?.startsWith('Bearer ')) return null;
    try {
        const token = authHeader.split(' ')[1];
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub || null;
    } catch {
        return null;
    }
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;
        const origin = request.headers.get('Origin') || '';

        // CORS Preflight
        if (method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
        }

        const db = createDb(env.DATABASE_URL);

        try {
            // ========================================
            // 認証エンドポイント（Neon Auth は別途フロントエンドで処理）
            // ========================================

            // ユーザー情報取得
            if (path === '/api/auth/me' && method === 'GET') {
                const userId = getUserIdFromToken(request.headers.get('Authorization'));
                if (!userId) {
                    return jsonResponse({ error: 'Unauthorized' }, 401, origin, env);
                }
                return jsonResponse({ user: { id: userId } }, 200, origin, env);
            }

            // ========================================
            // 食事ログ CRUD
            // ========================================

            // ログ取得
            if (path === '/api/logs' && method === 'GET') {
                const userId = getUserIdFromToken(request.headers.get('Authorization'));
                if (!userId) {
                    return jsonResponse({ error: 'Unauthorized' }, 401, origin, env);
                }

                const dbLogs = await db.select().from(foodLogs).where(eq(foodLogs.userId, userId));

                // フロントエンドの形式に変換（clientId を id として返す）
                const logs = dbLogs.map(log => ({
                    id: log.clientId,
                    date: log.date,
                    image: log.image,
                    memo: log.memo,
                    ingredients: log.ingredients,
                    life: log.life,
                    createdAt: log.createdAt?.toISOString(),
                    updatedAt: log.updatedAt?.toISOString(),
                }));

                return jsonResponse({ logs }, 200, origin, env);
            }

            // ログ一括保存（アップサート）
            if (path === '/api/logs' && method === 'POST') {
                const userId = getUserIdFromToken(request.headers.get('Authorization'));
                if (!userId) {
                    return jsonResponse({ error: 'Unauthorized' }, 401, origin, env);
                }

                const { logs } = await request.json() as { logs: any[] };

                for (const log of logs) {
                    // 既存ログをチェック
                    const existing = await db.select()
                        .from(foodLogs)
                        .where(and(eq(foodLogs.userId, userId), eq(foodLogs.clientId, String(log.id))))
                        .limit(1);

                    if (existing.length > 0) {
                        // 更新
                        await db.update(foodLogs)
                            .set({
                                date: log.date,
                                image: log.image,
                                memo: log.memo,
                                ingredients: log.ingredients,
                                life: log.life,
                                updatedAt: new Date(),
                            })
                            .where(eq(foodLogs.id, existing[0].id));
                    } else {
                        // 新規作成
                        await db.insert(foodLogs).values({
                            userId,
                            clientId: String(log.id),
                            date: log.date,
                            image: log.image,
                            memo: log.memo,
                            ingredients: log.ingredients || [],
                            life: log.life,
                        });
                    }
                }

                return jsonResponse({ success: true, count: logs.length }, 200, origin, env);
            }

            // ログ削除
            if (path.startsWith('/api/logs/') && method === 'DELETE') {
                const userId = getUserIdFromToken(request.headers.get('Authorization'));
                if (!userId) {
                    return jsonResponse({ error: 'Unauthorized' }, 401, origin, env);
                }

                const clientId = path.split('/').pop();
                if (!clientId) {
                    return jsonResponse({ error: 'Invalid ID' }, 400, origin, env);
                }

                await db.delete(foodLogs)
                    .where(and(eq(foodLogs.userId, userId), eq(foodLogs.clientId, clientId)));

                return jsonResponse({ success: true }, 200, origin, env);
            }

            // ========================================
            // 薬履歴
            // ========================================

            // 薬履歴取得
            if (path === '/api/medications' && method === 'GET') {
                const userId = getUserIdFromToken(request.headers.get('Authorization'));
                if (!userId) {
                    return jsonResponse({ error: 'Unauthorized' }, 401, origin, env);
                }

                const meds = await db.select().from(medicationHistory).where(eq(medicationHistory.userId, userId));
                return jsonResponse({ medications: meds.map(m => m.name) }, 200, origin, env);
            }

            // 薬履歴保存
            if (path === '/api/medications' && method === 'POST') {
                const userId = getUserIdFromToken(request.headers.get('Authorization'));
                if (!userId) {
                    return jsonResponse({ error: 'Unauthorized' }, 401, origin, env);
                }

                const { medications } = await request.json() as { medications: string[] };

                // 既存を削除して再作成
                await db.delete(medicationHistory).where(eq(medicationHistory.userId, userId));

                if (medications.length > 0) {
                    await db.insert(medicationHistory).values(
                        medications.map(name => ({ userId, name }))
                    );
                }

                return jsonResponse({ success: true }, 200, origin, env);
            }

            // ========================================
            // セーフリスト
            // ========================================

            // セーフリスト取得
            if (path === '/api/safelist' && method === 'GET') {
                const userId = getUserIdFromToken(request.headers.get('Authorization'));
                if (!userId) {
                    return jsonResponse({ error: 'Unauthorized' }, 401, origin, env);
                }

                const items = await db.select().from(safeList).where(eq(safeList.userId, userId));
                return jsonResponse({ items: items.map(i => i.item) }, 200, origin, env);
            }

            // セーフリスト保存
            if (path === '/api/safelist' && method === 'POST') {
                const userId = getUserIdFromToken(request.headers.get('Authorization'));
                if (!userId) {
                    return jsonResponse({ error: 'Unauthorized' }, 401, origin, env);
                }

                const { items } = await request.json() as { items: string[] };

                // 既存を削除して再作成
                await db.delete(safeList).where(eq(safeList.userId, userId));

                if (items.length > 0) {
                    await db.insert(safeList).values(
                        items.map(item => ({ userId, item }))
                    );
                }

                return jsonResponse({ success: true }, 200, origin, env);
            }

            // ========================================
            // ヘルスチェック
            // ========================================
            if (path === '/api/health') {
                // DB接続テスト
                try {
                    await db.select().from(foodLogs).limit(1);
                    return jsonResponse({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() }, 200, origin, env);
                } catch (dbError) {
                    const dbMessage = dbError instanceof Error ? dbError.message : 'Unknown DB error';
                    return jsonResponse({ status: 'ok', db: 'error', dbError: dbMessage, timestamp: new Date().toISOString() }, 200, origin, env);
                }
            }

            // 404
            return jsonResponse({ error: 'Not found' }, 404, origin, env);
        } catch (error) {
            console.error('API Error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            return jsonResponse({ error: 'Internal server error', details: message }, 500, origin, env);
        }
    },
};

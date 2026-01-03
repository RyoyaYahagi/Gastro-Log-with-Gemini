import { createDb } from './db';
import { foodLogs, medicationHistory, safeList } from './db/schema';
import { eq, and } from 'drizzle-orm';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { z } from 'zod';

// 環境変数
interface Env {
    DATABASE_URL: string;
    FRONTEND_URL: string;
    GEMINI_API_KEY: string;
    CLERK_JWKS_URL: string; // e.g., https://<clerk>.clerk.accounts.dev/.well-known/jwks.json
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

// JWT トークンからユーザーID を取得（署名検証付き）
async function verifyAndGetUserId(authHeader: string | null, env: Env): Promise<string | null> {
    if (!authHeader?.startsWith('Bearer ')) return null;
    try {
        const token = authHeader.split(' ')[1];

        // Clerk JWKS を使用して署名検証
        const JWKS = createRemoteJWKSet(new URL(env.CLERK_JWKS_URL));
        const { payload } = await jwtVerify(token, JWKS);

        return (payload.sub as string) || null;
    } catch (error) {
        console.error('JWT verification failed:', error);
        return null;
    }
}

// Zod スキーマ定義（基本検証のみ）
const logSchema = z.object({
    id: z.string(),
    date: z.string(),
    image: z.string().nullable().optional(),
    memo: z.string().nullable().optional(),
    ingredients: z.array(z.string()).nullable().optional(),
    life: z.unknown().optional(),
});

const logsRequestSchema = z.object({
    logs: z.array(logSchema),
});

const safeListRequestSchema = z.object({
    items: z.array(z.string()),
});

const analyzeRequestSchema = z.object({
    image: z.string().nullable(),
    memo: z.string(),
    model: z.string().optional(),
});

// Gemini API 用プロンプト
const FODMAP_PROMPT = `あなたは低FODMAP食と消化器系の専門家です。
以下の食事画像または食事メモから、消化器系（特に過敏性腸症候群：IBS）に影響を与える可能性のある成分をすべて抽出してください。

## 解析対象（必ず全てチェックすること）
1. 高FODMAP成分：フルクタン（小麦、玉ねぎ、にんにく）、ガラクトオリゴ糖（豆類）、乳糖（牛乳、チーズ）、フルクトース過剰、ポリオール（ソルビトール、マンニトール等）
2. 刺激物：カフェイン、アルコール、香辛料、炭酸
3. アレルゲン/不耐症：グルテン、乳製品、大豆、卵
4. 人工添加物：人工甘味料、保存料、着色料
5. 脂質：高脂肪食品、揚げ物、バター

## 重要なルール
- 画像から見える食材、または推測される食材をすべて挙げる
- 一般的なレシピで使われる「隠れた成分」も含める（例：オムライスには通常、玉ねぎ、バター、牛乳が含まれる）
- 同一成分を複数回出さない
- 各成分は「成分名（カテゴリ）」形式で記載
- カテゴリ: 高FODMAP, 刺激物, アレルゲン, 添加物, 高脂肪

## 出力形式（純粋なJSONのみ返すこと）
{"ingredients": ["成分名（カテゴリ）", "成分名（カテゴリ）"]}

問題が見つからない場合のみ：{"ingredients": []}`;

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
                const userId = await verifyAndGetUserId(request.headers.get('Authorization'), env);
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
                const userId = await verifyAndGetUserId(request.headers.get('Authorization'), env);
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
                const userId = await verifyAndGetUserId(request.headers.get('Authorization'), env);
                if (!userId) {
                    return jsonResponse({ error: 'Unauthorized' }, 401, origin, env);
                }

                const body = await request.json();
                const parseResult = logsRequestSchema.safeParse(body);
                if (!parseResult.success) {
                    return jsonResponse({ error: 'Invalid request body', details: parseResult.error.errors }, 400, origin, env);
                }
                const { logs } = parseResult.data;

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
                                life: log.life as typeof foodLogs.$inferInsert.life,
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
                            life: log.life as typeof foodLogs.$inferInsert.life,
                        });
                    }
                }

                return jsonResponse({ success: true, count: logs.length }, 200, origin, env);
            }

            // ログ削除
            if (path.startsWith('/api/logs/') && method === 'DELETE') {
                const userId = await verifyAndGetUserId(request.headers.get('Authorization'), env);
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
                const userId = await verifyAndGetUserId(request.headers.get('Authorization'), env);
                if (!userId) {
                    return jsonResponse({ error: 'Unauthorized' }, 401, origin, env);
                }

                const meds = await db.select().from(medicationHistory).where(eq(medicationHistory.userId, userId));
                return jsonResponse({ medications: meds.map(m => m.name) }, 200, origin, env);
            }

            // 薬履歴保存
            if (path === '/api/medications' && method === 'POST') {
                const userId = await verifyAndGetUserId(request.headers.get('Authorization'), env);
                if (!userId) {
                    return jsonResponse({ error: 'Unauthorized' }, 401, origin, env);
                }

                const body = await request.json();
                const parseResult = z.object({ medications: z.array(z.string()) }).safeParse(body);
                if (!parseResult.success) {
                    return jsonResponse({ error: 'Invalid request body' }, 400, origin, env);
                }
                const { medications } = parseResult.data;

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
                const userId = await verifyAndGetUserId(request.headers.get('Authorization'), env);
                if (!userId) {
                    return jsonResponse({ error: 'Unauthorized' }, 401, origin, env);
                }

                const items = await db.select().from(safeList).where(eq(safeList.userId, userId));
                return jsonResponse({ items: items.map(i => i.item) }, 200, origin, env);
            }

            // セーフリスト保存
            if (path === '/api/safelist' && method === 'POST') {
                const userId = await verifyAndGetUserId(request.headers.get('Authorization'), env);
                if (!userId) {
                    return jsonResponse({ error: 'Unauthorized' }, 401, origin, env);
                }

                const body = await request.json();
                const parseResult = safeListRequestSchema.safeParse(body);
                if (!parseResult.success) {
                    return jsonResponse({ error: 'Invalid request body' }, 400, origin, env);
                }
                const { items } = parseResult.data;

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
            // Gemini API プロキシ（SEC-02/03対応）
            // ========================================
            if (path === '/api/analyze' && method === 'POST') {
                const userId = await verifyAndGetUserId(request.headers.get('Authorization'), env);
                if (!userId) {
                    return jsonResponse({ error: 'Unauthorized' }, 401, origin, env);
                }

                const body = await request.json();
                const parseResult = analyzeRequestSchema.safeParse(body);
                if (!parseResult.success) {
                    return jsonResponse({ error: 'Invalid request body' }, 400, origin, env);
                }
                const { image, memo, model } = parseResult.data;

                if (!image && !memo) {
                    return jsonResponse({ error: '画像またはメモを入力してください' }, 400, origin, env);
                }

                if (!env.GEMINI_API_KEY) {
                    return jsonResponse({ error: 'Gemini API Key is not configured' }, 500, origin, env);
                }

                // Gemini API リクエスト構築
                const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
                parts.push({ text: FODMAP_PROMPT });

                if (image) {
                    const base64Data = image.split(',')[1] || image;
                    parts.push({
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: base64Data,
                        },
                    });
                }

                if (memo) {
                    parts.push({ text: `食事のメモ: ${memo}` });
                }

                const geminiModel = model || 'gemini-2.5-flash';
                const geminiResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${env.GEMINI_API_KEY}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts }],
                            generationConfig: {
                                temperature: 0.1,
                                maxOutputTokens: 2048,
                            },
                        }),
                    }
                );

                if (!geminiResponse.ok) {
                    console.error('Gemini API error:', geminiResponse.status);
                    return jsonResponse({ error: 'AI解析に失敗しました' }, 500, origin, env);
                }

                const geminiData = await geminiResponse.json() as {
                    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
                };
                let text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

                // マークダウンのコードブロック記法を除去
                text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

                // JSON 抽出
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                let ingredients: string[] = [];
                if (jsonMatch) {
                    try {
                        const parsed = JSON.parse(jsonMatch[0]);
                        ingredients = parsed.ingredients || [];
                    } catch {
                        // JSON パースエラーは無視
                    }
                }

                return jsonResponse({ ingredients }, 200, origin, env);
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
                    // SEC-07: 本番環境では詳細エラーを隠す
                    console.error('DB error:', dbError);
                    return jsonResponse({ status: 'ok', db: 'error', timestamp: new Date().toISOString() }, 200, origin, env);
                }
            }

            // 404
            return jsonResponse({ error: 'Not Found' }, 404, origin, env);
        } catch (error) {
            console.error('API Error:', error);
            return jsonResponse({ error: 'Internal server error' }, 500, origin, env);
        }
    },
};

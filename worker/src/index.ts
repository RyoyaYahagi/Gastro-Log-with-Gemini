/**
 * Gastro Log API - Cloudflare Workers
 * Supabase プロキシ + Google OAuth 認証
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface Env {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    FRONTEND_URL: string;
}

// CORS ヘッダー
function corsHeaders(origin: string, env: Env): HeadersInit {
    const allowedOrigins = [
        env.FRONTEND_URL,
        'http://localhost:8787',
        'http://localhost:3000',
        'http://127.0.0.1:5500',  // Live Server
        'null'  // file:// からのアクセス
    ];
    const allowOrigin = allowedOrigins.includes(origin) ? origin : env.FRONTEND_URL;

    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
    };
}

// JSON レスポンス
function jsonResponse(data: unknown, status: number, origin: string, env: Env): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(origin, env),
        },
    });
}

// Supabase クライアント（Admin）
function getAdminClient(env: Env): SupabaseClient {
    return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
    });
}

// Supabase クライアント（ユーザートークン付き）
function getUserClient(env: Env, accessToken: string): SupabaseClient {
    return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        global: {
            headers: { Authorization: `Bearer ${accessToken}` }
        },
        auth: { persistSession: false }
    });
}

// Authorization ヘッダーからトークン取得
function getTokenFromHeader(request: Request): string | null {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return null;
    return auth.slice(7);
}

// ルーティング
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

        try {
            // ====== Auth Routes ======
            if (path === '/api/auth/google') {
                // Google OAuth 開始
                const supabase = getAdminClient(env);
                const redirectTo = `${url.origin}/api/auth/callback`;

                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo }
                });

                if (error || !data.url) {
                    return jsonResponse({ error: 'OAuth failed' }, 500, origin, env);
                }

                return Response.redirect(data.url, 302);
            }

            if (path === '/api/auth/callback') {
                // OAuth コールバック
                const code = url.searchParams.get('code');
                if (!code) {
                    return new Response('Missing code', { status: 400 });
                }

                const supabase = getAdminClient(env);
                const { data, error } = await supabase.auth.exchangeCodeForSession(code);

                if (error || !data.session) {
                    return new Response('Auth failed', { status: 400 });
                }

                // フロントエンドにトークンを渡す
                const frontendCallback = `${env.FRONTEND_URL}?access_token=${data.session.access_token}&refresh_token=${data.session.refresh_token}`;
                return Response.redirect(frontendCallback, 302);
            }

            if (path === '/api/auth/refresh' && method === 'POST') {
                // トークンリフレッシュ
                const body = await request.json() as { refresh_token?: string };
                if (!body.refresh_token) {
                    return jsonResponse({ error: 'Missing refresh_token' }, 400, origin, env);
                }

                const supabase = getAdminClient(env);
                const { data, error } = await supabase.auth.refreshSession({
                    refresh_token: body.refresh_token
                });

                if (error || !data.session) {
                    return jsonResponse({ error: 'Refresh failed' }, 401, origin, env);
                }

                return jsonResponse({
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                    user: data.user
                }, 200, origin, env);
            }

            if (path === '/api/auth/me' && method === 'GET') {
                // 現在のユーザー取得
                const token = getTokenFromHeader(request);
                if (!token) {
                    return jsonResponse({ error: 'Unauthorized' }, 401, origin, env);
                }

                const supabase = getUserClient(env, token);
                const { data, error } = await supabase.auth.getUser();

                if (error || !data.user) {
                    return jsonResponse({ error: 'Invalid token' }, 401, origin, env);
                }

                return jsonResponse({ user: data.user }, 200, origin, env);
            }

            // ====== Food Logs Routes ======
            if (path === '/api/logs' && method === 'GET') {
                const token = getTokenFromHeader(request);
                if (!token) {
                    return jsonResponse({ error: 'Unauthorized' }, 401, origin, env);
                }

                const supabase = getUserClient(env, token);
                const { data: userData } = await supabase.auth.getUser();
                if (!userData.user) {
                    return jsonResponse({ error: 'Unauthorized' }, 401, origin, env);
                }

                const { data, error } = await supabase
                    .from('food_logs')
                    .select('*')
                    .eq('user_id', userData.user.id)
                    .order('created_at', { ascending: false })
                    .limit(100);

                if (error) {
                    return jsonResponse({ error: error.message }, 500, origin, env);
                }

                return jsonResponse({ logs: data }, 200, origin, env);
            }

            if (path === '/api/logs' && method === 'POST') {
                const token = getTokenFromHeader(request);
                if (!token) {
                    return jsonResponse({ error: 'Unauthorized' }, 401, origin, env);
                }

                const supabase = getUserClient(env, token);
                const { data: userData } = await supabase.auth.getUser();
                if (!userData.user) {
                    return jsonResponse({ error: 'Unauthorized' }, 401, origin, env);
                }

                const body = await request.json() as { logs?: unknown[] };
                if (!body.logs || !Array.isArray(body.logs)) {
                    return jsonResponse({ error: 'Invalid body' }, 400, origin, env);
                }

                // Upsert logs
                const logsWithUser = body.logs.map((log: unknown) => ({
                    ...(log as Record<string, unknown>),
                    user_id: userData.user!.id
                }));

                const { data, error } = await supabase
                    .from('food_logs')
                    .upsert(logsWithUser, { onConflict: 'id' })
                    .select();

                if (error) {
                    return jsonResponse({ error: error.message }, 500, origin, env);
                }

                return jsonResponse({ synced: data?.length || 0 }, 200, origin, env);
            }

            if (path.startsWith('/api/logs/') && method === 'DELETE') {
                const token = getTokenFromHeader(request);
                if (!token) {
                    return jsonResponse({ error: 'Unauthorized' }, 401, origin, env);
                }

                const logId = path.split('/').pop();
                if (!logId) {
                    return jsonResponse({ error: 'Missing log ID' }, 400, origin, env);
                }

                const supabase = getUserClient(env, token);
                const { error } = await supabase
                    .from('food_logs')
                    .delete()
                    .eq('id', parseInt(logId));

                if (error) {
                    return jsonResponse({ error: error.message }, 500, origin, env);
                }

                return jsonResponse({ deleted: true }, 200, origin, env);
            }

            // ====== Medication Routes ======
            if (path === '/api/medications' && method === 'GET') {
                const token = getTokenFromHeader(request);
                if (!token) {
                    return jsonResponse({ error: 'Unauthorized' }, 401, origin, env);
                }

                const supabase = getUserClient(env, token);
                const { data: userData } = await supabase.auth.getUser();
                if (!userData.user) {
                    return jsonResponse({ error: 'Unauthorized' }, 401, origin, env);
                }

                const { data, error } = await supabase
                    .from('medication_history')
                    .select('name')
                    .eq('user_id', userData.user.id);

                if (error) {
                    return jsonResponse({ error: error.message }, 500, origin, env);
                }

                return jsonResponse({ medications: data?.map(m => m.name) || [] }, 200, origin, env);
            }

            if (path === '/api/medications' && method === 'POST') {
                const token = getTokenFromHeader(request);
                if (!token) {
                    return jsonResponse({ error: 'Unauthorized' }, 401, origin, env);
                }

                const supabase = getUserClient(env, token);
                const { data: userData } = await supabase.auth.getUser();
                if (!userData.user) {
                    return jsonResponse({ error: 'Unauthorized' }, 401, origin, env);
                }

                const body = await request.json() as { medications?: string[] };
                if (!body.medications || !Array.isArray(body.medications)) {
                    return jsonResponse({ error: 'Invalid body' }, 400, origin, env);
                }

                const records = body.medications.map(name => ({
                    user_id: userData.user!.id,
                    name
                }));

                const { error } = await supabase
                    .from('medication_history')
                    .upsert(records, { onConflict: 'user_id,name', ignoreDuplicates: true });

                if (error) {
                    return jsonResponse({ error: error.message }, 500, origin, env);
                }

                return jsonResponse({ synced: true }, 200, origin, env);
            }

            // 404
            return jsonResponse({ error: 'Not found' }, 404, origin, env);

        } catch (e) {
            console.error(e);
            return jsonResponse({ error: 'Internal server error' }, 500, origin, env);
        }
    },
};

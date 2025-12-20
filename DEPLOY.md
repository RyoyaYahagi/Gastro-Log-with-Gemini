# Gastro Log デプロイガイド

Cloudflare + Supabase へのデプロイ手順書

---

## 1. Supabase セットアップ

### 1.1 テーブル作成

Supabase Dashboard → **SQL Editor** → 以下を実行:

```sql
-- supabase_setup.sql の内容をコピー＆ペースト
```

### 1.2 Google OAuth 有効化

1. **Authentication** → **Providers** → **Google**
2. **Enabled** を ON
3. Google Cloud Console で OAuth 認証情報を作成:
   - https://console.cloud.google.com/apis/credentials
   - **OAuth 2.0 クライアント ID** を作成
   - **承認済みのリダイレクト URI** に追加:
     ```
     https://fbyrpgjiwqkdxwdmitqh.supabase.co/auth/v1/callback
     ```
4. クライアント ID とシークレットを Supabase に貼り付け
5. **Save**

---

## 2. Cloudflare Workers デプロイ

### 2.1 依存関係インストール

```bash
cd /Users/yappa/code/app/gastro/worker
npm install
```

### 2.2 シークレット設定

```bash
npx wrangler secret put SUPABASE_URL
# 入力: https://fbyrpgjiwqkdxwdmitqh.supabase.co

npx wrangler secret put SUPABASE_ANON_KEY
# 入力: sb_publishable_u75mxFIQUbB3qgR8t7fX5Q_tmNOMe-c

npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# 入力: (service_role key)
```

### 2.3 デプロイ

```bash
npx wrangler deploy
```

デプロイ後、Workers の URL をメモ (例: `https://gastro-log-api.xxx.workers.dev`)

### 2.4 フロントエンドの API_BASE を更新

`index.html` の `API_BASE` を Workers URL に変更:

```javascript
const API_BASE = 'https://gastro-log-api.xxx.workers.dev';
```

---

## 3. Cloudflare Pages デプロイ

```bash
cd /Users/yappa/code/app/gastro
npx wrangler pages deploy . --project-name=gastro-log
```

または GitHub 連携で自動デプロイ設定。

---

## 4. wrangler.toml の FRONTEND_URL 更新

Pages の URL が確定したら、`worker/wrangler.toml` を更新:

```toml
[vars]
FRONTEND_URL = "https://gastro-log.pages.dev"
```

再デプロイ:

```bash
cd /Users/yappa/code/app/gastro/worker
npx wrangler deploy
```

---

## 5. Google OAuth リダイレクト URI 追加

Google Cloud Console で以下を追加:

```
https://gastro-log-api.xxx.workers.dev/api/auth/callback
```

---

## 動作確認

1. Pages URL にアクセス
2. 設定画面で「Googleでログイン」
3. ログイン後、同期インジケーターが表示される
4. 食事を記録 → 同期が実行される

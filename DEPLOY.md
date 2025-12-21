# Gastro Log デプロイガイド

## 概要

Gastro Log は以下の2つのコンポーネントで構成されています：

- **Frontend**: Vite + React アプリ → Cloudflare Pages
- **Worker**: Cloudflare Workers API → Neon DB

## 必要な GitHub Secrets

GitHub リポジトリの Settings → Secrets and variables → Actions で以下を設定：

### 必須

| Secret                  | 説明                                                           |
| ----------------------- | -------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare API トークン                                        |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare アカウント ID                                       |
| `DATABASE_URL`          | Neon DB 接続文字列                                             |
| `VITE_AUTH_BASE_URL`    | Neon Auth Base URL                                             |
| `VITE_API_BASE_URL`     | Workers API URL (例: `https://gastro-log-api.xxx.workers.dev`) |

## デプロイフロー

### 自動デプロイ

- **main ブランチ**: Pages + Worker 両方デプロイ
- **dev ブランチ**: Pages のみデプロイ（プレビュー）

### 手動デプロイ

```bash
# Frontend
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=gastro-log

# Worker
cd worker
npx wrangler deploy
```

## ローカル開発

```bash
# Frontend (http://localhost:5173)
cd frontend
npm run dev

# Worker (http://localhost:8787)
cd worker
npm run dev
```

## 環境変数

### Frontend (.env)

```
VITE_AUTH_BASE_URL=https://xxx.neonauth.ap-southeast-1.aws.neon.tech/neondb/auth
VITE_API_BASE_URL=http://localhost:8787
```

### Worker (.dev.vars)

```
DATABASE_URL=postgresql://...
```

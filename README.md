# 🍽️ Gastro Log with Gemini

食事を写真で記録し、Gemini AIで栄養分析を行うPWAアプリケーションです。

## ✨ 機能

- 📸 **写真記録** - 食事の写真を撮影・アップロード
- 🤖 **AI分析** - Gemini AIによる栄養成分の自動分析
- 📅 **カレンダー表示** - 日別の食事履歴を一覧
- 📊 **統計ダッシュボード** - 栄養摂取の傾向を可視化
- 💾 **クラウド同期** - ログインでデータをクラウド保存
- 📱 **PWA対応** - ホーム画面に追加してアプリとして使用

## 🏗️ アーキテクチャ

```
gastro/
├── frontend/         # React + Vite + Tailwind CSS
│   └── src/
│       ├── pages/    # AnalyzePage, CalendarPage, StatsPage, SettingsPage
│       ├── hooks/    # useAuth, useFoodLogs, useAnalysis
│       └── lib/      # ユーティリティ
└── worker/           # Cloudflare Workers API
    └── src/
        └── db/       # Drizzle ORM + Neon DB
```

## 🛠️ 技術スタック

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4
- **認証**: Clerk
- **PWA**: vite-plugin-pwa

### Backend
- **Runtime**: Cloudflare Workers
- **Database**: Neon (PostgreSQL)
- **ORM**: Drizzle ORM

### インフラ
- **Frontend Hosting**: Cloudflare Pages
- **API Hosting**: Cloudflare Workers
- **CI/CD**: GitHub Actions

## 🚀 セットアップ

### 必要条件

- Node.js 20+
- npm

### 環境変数

#### Frontend (.env)

```bash
cp frontend/.env.example frontend/.env
```

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_xxx  # Clerkの公開キー
VITE_API_BASE_URL=http://localhost:8787
```

#### Worker (.dev.vars)

```env
DATABASE_URL=postgresql://...  # Neon接続文字列
```

### ローカル開発

```bash
# Frontend (http://localhost:5173)
cd frontend
npm install
npm run dev

# Worker (http://localhost:8787)
cd worker
npm install
npm run dev
```

## 📦 デプロイ

詳細は [DEPLOY.md](./DEPLOY.md) を参照してください。

### 自動デプロイ

- **main ブランチ**: Frontend + Worker 両方デプロイ
- **dev ブランチ**: Frontend のみ（プレビュー）

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

## 📁 ディレクトリ構成

```
frontend/src/
├── pages/
│   ├── AnalyzePage.tsx    # 食事記録・AI分析
│   ├── CalendarPage.tsx   # カレンダー表示
│   ├── StatsPage.tsx      # 統計ダッシュボード
│   └── SettingsPage.tsx   # 設定・ログイン
├── hooks/
│   ├── useAuth.tsx        # Clerk認証
│   ├── useFoodLogs.tsx    # 食事ログ管理
│   ├── useAnalysis.tsx    # 分析状態管理
│   └── ...
├── components/
│   ├── Header.tsx
│   └── BottomNav.tsx
└── lib/
    └── api.ts             # API クライアント
```

## 🔗 関連リンク

- [Cloudflare Pages](https://pages.cloudflare.com/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Neon Database](https://neon.tech/)
- [Clerk Auth](https://clerk.com/)
- [Drizzle ORM](https://orm.drizzle.team/)

## 📄 ライセンス

Private

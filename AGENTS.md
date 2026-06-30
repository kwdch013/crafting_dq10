# AGENTS.md

## プロジェクト

DQ10 職人支援ツールの作業レポジトリです。

## 起動

```bash
docker compose up --build -d
```

フロント:

```text
http://localhost:3000
```

API:

```text
http://localhost:8000
```

## 構成

- `frontend/`: Nodeによる静的フロント配信
- `api/`: Python標準ライブラリによるJSON API
- `api/data/`: 職人一覧とレシピJSON
- `app/`: フロント画面、職人設定、計算エンジン
- `docs/`: 要件、設計、操作方法

## 開発ルール

- 作業前に `dev` ブランチを作成または最新化します。
- 個別作業は `dev` から目的別の作業ブランチを切って行います。
- `main` へ直接コミットせず、作業ブランチから `dev` へ取り込み、安定確認後に `main` へ反映します。
- レシピの実数値は `api/data/crafts/<職人>/recipes.json` に追加します。
- フロント側の `app/crafts/<職人>/recipes.js` はAPI停止時のフォールバックとして扱います。
- 会心判定では、基準値 `target` に届く場合は超過せず `target` で停止します。
- ドキュメントは1ファイル300行以内を維持します。
- 変更後は `docker compose up --build -d --remove-orphans` とAPI疎通確認を行います。

## GitHub Issues

実装完了後、現状の問題点と残タスクをGitHub issueとしてタスク単位に分割します。

issue化の前に、以下を確認します。

- 再現条件
- 期待する動作
- 現在の動作
- 完了条件
- 関連ファイル

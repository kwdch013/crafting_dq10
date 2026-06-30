# 設計書トップ

DQ10 職人支援ツールの設計ドキュメントです。

1ファイルあたり300行以内に収め、必要な情報へすぐ移動できる構成にしています。

## ドキュメント一覧

- [全体設計](./01-architecture.md)
- [シーケンス図](./02-sequences.md)
- [操作方法](./03-operations.md)
- [職人設定の保守方法](./04-craft-config-maintenance.md)
- [盤面表示設計](./05-display-layout.md)
- [レシピデータ設計](./06-recipe-data.md)
- [GitHub Issue候補](../issues.md)

## 現在の実装範囲

- Docker Composeで起動するWebアプリ
- 手入力による職人状態の管理
- 成功範囲との差分表示
- 通常後、会心後の範囲表示
- 確定会心、会心狙い、超過注意、危険の判定
- 職人ごとの設定ファイル分離

## 設計上の優先順位

1. 安全性
2. 保守性
3. 軽量動作
4. 職人追加のしやすさ
5. 画面認識の後付けしやすさ

## 関連ファイル

- アプリ入口: `app/index.html`
- UI制御: `app/main.js`
- 共通計算エンジン: `app/engine.js`
- 職人設定: `app/crafts/<職人>/config.js`
- コンテナ: `Dockerfile`
- 起動定義: `docker-compose.yml`

# DQ10 職人ダメージ計算 要件サマリー

このファイルは要件書の入口です。
読みやすさを優先し、詳細は300行で警告、500行で要修正とする分割ドキュメントに整理しています。

## 分割ドキュメント

- [概要とスコープ](./requirements/01-overview-and-scope.md)
- [機能要件](./requirements/02-functional-requirements.md)
- [非機能要件と開発ロードマップ](./requirements/03-nonfunctional-and-roadmap.md)

## 初期ゴール

調理職人について、手入力された現在の焼け具合をもとに、以下を別ウィンドウ相当のWeb画面に表示します。

- 各具材の成功範囲との差分
- 通常ダメージ範囲
- 会心時判定
- 確定会心候補
- 超過リスク

この段階では画面認識は未実装でもよく、まずは手入力でも正しく動く調理計算エンジンを優先します。

## 設計ドキュメント

- [設計書トップ](./design/README.md)
- [全体設計](./design/01-architecture.md)
- [シーケンス図](./design/02-sequences.md)
- [操作方法](./design/03-operations.md)
- [職人設定の保守方法](./design/04-craft-config-maintenance.md)

## 現在の実装方針

- Webアプリとして実装します。
- Docker Composeで起動できるようにします。
- 基本機能はオフラインで動作します。
- GPU、Local LLM、外部APIは必須にしません。
- 職人ごとの細かな数値は `app/crafts/<職人>/config.js` に分離します。

## 対象外

- ゲーム操作の自動化
- DQ10プロセスのメモリ読み取り
- マクロ操作
- 外部サーバーへの画面送信
- LLMによる数値判定

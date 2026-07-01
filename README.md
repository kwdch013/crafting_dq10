# DQ10 職人支援ツール

`docs/requirements.md` に基づく、職人支援ツールの手入力MVPです。

初期ゴールとして、画面認識なしで現在値を入力し、成功範囲との差分、通常ダメージ範囲、会心時判定、確定会心候補、超過リスクを表示します。

## 起動

```bash
docker compose up --build -d
```

ブラウザで `http://localhost:3000` を開きます。

APIは `http://localhost:8000` で起動します。

## 停止

```bash
docker compose down
```

## 実装済み

- 職人ごとの設定ディレクトリ
- 調理職人、武器鍛冶、防具鍛冶、道具鍛冶、裁縫、木工、ランプ錬金、ツボ錬金の設定
- 品目名、職人レベル、使用道具、道具の★数、残りターン/残り手数、火力状態の入力
- レベルと道具設定による集中力の自動計算
- マス/具材ごとの現在値、成功下限、成功上限の入力
- 調理のフライパン配置から右クリックで現在値とレシピ特性に応じた光・戻り状態を編集
- 下限まで、上限までの差分表示
- 選択特技ごとの通常後、会心後の範囲表示
- 確定会心、会心狙い、超過注意、危険、超過の判定
- 候補手のスコア表示と理由表示
- 職人別設定ファイルによる特技ダメージと集中力の管理
- 設定の `localStorage` 保存
- JSON Import / Export
- 画面共有プレビューの接続口
- frontend / api の2コンテナ構成
- APIからのレシピ一覧取得
- 会心発生時に基準値へ届く場合、超過せず誤差0で止まる判定
- 調理レシピ特性の `光`、`光・戻り`、`回復` 選択
- 調理の複数マス食材グループ移動と方向入れ替え

## ドキュメント

- [要件サマリー](./docs/requirements.md)
- [設計書トップ](./docs/design/README.md)
- [操作方法](./docs/design/03-operations.md)
- [GitHub issue一覧](./docs/issues.md)

## GitHub

```text
https://github.com/kwdch013/crafting_dq10
```

ブランチ運用:

- `main`: 安定版
- `dev`: 開発統合ブランチ
- 作業ブランチ: `dev` から目的別に作成

残タスクはGitHub issueで管理します。

## 設定ファイル構成

職人固有の数値や表示名は `app/crafts/<職人>/config.js` に分離しています。

API側のレシピJSONは `api/data/crafts/<職人>/recipes.json` に分離しています。

```text
api/
  main.py
  data/catalog.json
  data/crafts/<職人>/recipes.json
frontend/
  server.js
app/
  board-layout.js
app/crafts/
  registry.js
  shared/cooking-damage.js
  shared/smithing-damage.js
  shared/sewing-damage.js
  shared/woodworking-damage.js
  cooking/config.js
  weapon-smithing/config.js
  armor-smithing/config.js
  tool-smithing/config.js
  sewing/config.js
  woodworking/config.js
  lamp-alchemy/config.js
  pot-alchemy/config.js
```

各 `config.js` では、職人名、入力ラベル、レベル別集中力、道具種類と★数ごとの補正、火力状態、特技ごとの消費集中力・通常範囲・会心範囲、初期マスを管理します。

調理の位置別ダメージは `app/crafts/shared/cooking-damage.js` に集約しています。
鍛冶系の温度別ダメージは `app/crafts/shared/smithing-damage.js` に集約しています。
このファイルでは、各温度と威力ごとの最小値・最大値だけを保持します。
裁縫と木工の基礎データも `app/crafts/shared/` に分離しています。

調理のフライパン配置入れ替えは `app/board-layout.js` に分離しています。
同じ `ingredientGroupId` を持つ具材は、選択、移動、入れ替え、上へずらす操作で同時に扱います。

## 後続フェーズ

- DQ10ウィンドウ選択
- 職人UI範囲のキャリブレーション
- OpenCV / OCR による値の自動認識
- 認識信頼度と手入力補正の統合
- 他職人エンジンの追加

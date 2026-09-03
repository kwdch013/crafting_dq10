# マスタ参照API

レシピ追加画面が分類・特性・食材を選ぶために参照するAPIです。
[レシピDB実装方針](./11-recipe-db-implementation.md) の段階3a (B3-2) で追加しました。

真実源はPostgreSQLです。テーブル構成は [レシピDB設計](./09-recipe-db-schema.md) と
[レシピDBテーブル定義](./10-recipe-db-tables.md) を参照します。

## エンドポイント

```text
GET /api/crafts/{craftId}/masters
```

分類・特性・食材を職人ごとに1本へまとめています。3種を個別のエンドポイントへ分けるより、
職人切替が1往復・DB接続1回で済むこと、段階3dで追加する分類作成の
`POST /api/crafts/{craftId}/categories` と並びが揃うことを優先しました。

## レスポンス (200)

```json
{
  "craftId": "tool-smithing",
  "categories": [
    { "categoryId": 0, "legacyId": null, "name": "未分類", "cells": [] },
    { "categoryId": 1, "legacyId": "smithing-hammer", "name": "ハンマー",
      "cells": [{ "name": "A", "row": 1, "column": 1 }] }
  ],
  "traits": [
    { "charaId": 0, "legacyId": null, "name": "なし", "description": "なし、もしくは未追加" },
    { "charaId": 1, "legacyId": "light", "name": "光", "description": "4ターンごとに光が発生する" }
  ],
  "materials": [
    { "materialId": 1, "name": "肉", "imagePath": "./assets/cooking/ingredient-meat.png",
      "pairDirection": "horizontal" }
  ]
}
```

## 項目の意味

| 項目 | 由来 | 意味 |
| --- | --- | --- |
| `categories[].categoryId` | `*_category.category_id` | DBの主キー。分類を一意に指す安定キー |
| `categories[].legacyId` | `*_category.legacy_category_id` | 現行JSONの `categoryId`。移行後に追加した分類では `null` |
| `categories[].name` | `*_category.category_name` | 画面に出す分類名 |
| `categories[].cells` | 職人別 (下表) | その分類が使うマスの座標 |
| `traits[].charaId` | `*_character.chara_id` | DBの主キー。特性を一意に指す安定キー |
| `traits[].legacyId` | `*_character.legacy_trait_id` | 現行JSONの `traitId`。移行後に追加した特性では `null` |
| `traits[].name` | `*_character.chara_name` | 画面に出す特性名 |
| `traits[].description` | `*_character.chara_desc` | 特性の説明。未設定は `null` |
| `materials[].materialId` | `cooking_materials.material_id` | DBの主キー |
| `materials[].name` | `cooking_materials.material_name` | 食材名 |
| `materials[].imagePath` | `cooking_materials.image_path` | 食材画像のパス。未設定は `null` |
| `materials[].pairDirection` | `cooking_materials.pair_direction` | 2マス食材の並び方向。1マス食材は `null` |

`legacyId` は現行JSONとの対応づけ専用です。画面の内部キーには `categoryId` / `charaId` を使います。

## 職人による違い

`cells` の導出元が職人ごとに変わります。理由は
[レシピDB設計](./09-recipe-db-schema.md) の分類テーブルの設計方針を参照します。

| 職人 | `cells` の導出元 | `materials` |
| --- | --- | --- |
| `tool-smithing` / `weapon-smithing` / `armor-smithing` | `row_<マス>` / `col_<マス>` の座標。マス名から座標を復元できないため座標を保持している | 空配列 |
| `sewing` / `woodworking` | `exist_<マス>` が真のマスを3行3列の座標へ展開する | 空配列 |
| `cooking` | 同一分類でも使用マスが揃わないため分類はマスを持たない。常に空配列 | 6件 |

`cells` の並びはマス名 (A, B, C…) の昇順です。

**盤面サイズの真実源は引き続き `app/crafts/<職人>/config.js` です。**
分類が持つのは使用マスだけで、盤面の行数・列数はAPIから取得できません。

## 絞り込みと並び順

- `is_active = false` の行は3種とも除外します。
- 並び順は `category_id` / `chara_id` / `material_id` の昇順です。
- `未分類` (`category_id` 0) と特性の `なし` (`chara_id` 0) も返します。
  API側では暗黙に絞り込みません。
- ただし段階3b時点のフロントは、`legacyId` を持たない分類 (未分類・DB移行時の変換用テンプレート) を大項目の選択肢に出しません。
  レシピ側の `categoryId` は `legacyId` の文字列であり、`legacyId` のない分類を選んでも該当レシピが0件になるためです。
  未分類を画面で選べるようにするかは、レシピ登録経路を変更する段階3cと、分類の新規作成を扱う段階3dで決めます。

## エラー

| 条件 | 応答 |
| --- | --- |
| 未知の `craftId` | 404 `{"error": "not_found"}` |
| `RECIPE_STORE=json` | 503 `{"error": "masters_unavailable"}` |

JSONストアはマスタを保持しません。404や空配列ではなく専用コードを返すことで、
「職人IDの誤り」「分類が0件」と区別できるようにしています。
フロントはこれを見て `config.js` のフォールバックへ確実に落とせます。

## 実装の所在

| ファイル | 役割 |
| --- | --- |
| `api/main.py` | ルーティングと、`MastersUnavailableError` の503への変換 |
| `api/repository/queries_master.py` | 分類・特性・食材のSELECTと、API形式への組み立て |
| `api/repository/postgres_store.py` | `load_masters()`。DB接続の管理 |
| `api/repository/json_store.py` | `load_masters()`。`MastersUnavailableError` を送出 |
| `tests/api_http_masters.test.py` | 実HTTPでの契約テスト |

## 段階3での使われ方

| 段階 | 用途 |
| --- | --- |
| 3a (本ドキュメント) | APIの追加のみ。フロントは未使用 |
| 3b | 分類の選択肢をAPI由来へ移行済み。`config.js` はAPI停止時のフォールバックとテンプレートの引継ぎに残し、並び順は `config.js` を維持する。`legacyId` を持たない分類 (未分類・DB移行時の変換用テンプレート) は選択肢に出さず、分類の新規作成を扱う3dで扱う |
| 3c | レシピ登録をPOSTへ変更 (実装済み)。仕様は [レシピ登録API](./15-recipe-post-api.md) |
| 3d | 分類の新規作成APIを追加し、鍛冶では `cells` が使用マスを決める |

# レシピ登録API (段階3c)

レシピの新規登録をサーバー発番の `POST` へ移す設計です。
[レシピDB実装方針](./11-recipe-db-implementation.md) の段階3c (B3-1、F3-1、F3-2、F3-5) に対応します。

## 何が変わるか

| 項目 | 段階3bまで | 段階3c以降 |
| --- | --- | --- |
| レシピIDの発番 | フロントが `user-<職人>-<時刻>` を生成 | サーバーが `craft_master.id` を発番 |
| 真実源 | `localStorage` (API反映は補助) | DB (`localStorage` はオフライン時の控え) |
| 保存失敗時 | ブラウザには保存され、画面に残る | 保存されず、エラーとして扱う |

## エンドポイント

```text
POST /api/crafts/{craftId}/recipes
```

リクエスト本文は現行JSON形式のレシピです。**`id` を含めてはいけません。**

成功時は `201` と、サーバーが発番したIDを持つレシピを返します。

```json
{ "craftId": "cooking", "recipe": { "id": "db-71", "name": "...", "items": [] } }
```

`PUT /api/crafts/{craftId}/recipes/{recipeId}` は**既存レシピの更新用として存置**します。
画面は新規追加で `POST`、編集で `PUT` を使います。

### 応答コード

| 条件 | 応答 |
| --- | --- |
| 登録成功 | 201 |
| 本文に `id` がある | 400 `recipe_id_not_allowed` |
| 本文がJSONとして壊れている | 400 `invalid_json` |
| 名前・マスの検証に失敗 | 400 (`invalid_recipe_name` など) |
| 同名の有効なレシピがある | 400 `recipe_name_already_exists` |
| 既存分類と使用マスが不一致 (鍛冶) | 400 `recipe_cells_mismatch_category` |
| 未知の `craftId` | 404 `not_found` |

`json.JSONDecodeError` と `IntegrityError` はどちらも `ValueError` の派生のため、
`Handler.do_POST` の `except` はこの2つを `except ValueError` より前に置きます。

## ID発番の方式

`craft_master.id` を発番し、`legacy_id` へ `db-<id>` を書きます。
**APIが返すレシピの `id` は従来どおり文字列 (= `legacy_id`) のまま**です。

読み取り・`PUT`・`DELETE`・エクスポート・`localStorage` のレシピ選択状態は、
いずれも `legacy_id` でレシピを引き当てています。
`craft_master.id` (数値) をそのままレシピIDにするとこれらすべての互換対応が必要になるため、
段階3cでは採用しません。

`PostgresRecipeStore.create()` の手順:

1. `build_plan` はIDを参照するため、発番前は仮ID `(新規レシピ)` で計画を組む
   (検証エラーの本文にそのまま出るため、利用者が読める文言にしています)
2. `_validate_upsert_conflicts` で同名レシピを検証する。既存 `upsert` と同じ防御を通します
3. 同名の**論理削除済み**レシピがあれば、その行を再利用して復活させる。
   このとき `legacy_id` は**既存の値を維持**します (`cooking-003` のような移行前IDを壊さないため)
4. 復活対象が無ければ `insert_recipe_header` で発番し、`legacy_id = db-<id>` を設定する
5. `sort_order` は復活時は既存値、新規時は職人内の `max + 1`

`JsonRecipeStore.create()` は採番列を持たないため、
ファイル内の `db-<職人ID>-<連番>` から最大値 + 1 を採ります。職人IDを含めるため職人をまたいでも衝突しません。

## 保存失敗時の画面挙動 (F3-2)

DBが真実源になるため、「ブラウザには保存しました」という扱いは使えません。

- 失敗時は `localStorage` に**書きません**
- レシピ追加ダイアログを**閉じず**、エラーを表示して再試行を促します
- 成功時のみ `localStorage` へ「オフライン時の控え」として書きます
- 削除も同様に、成功時のみ控えへ反映します

## 既存レシピの取り込み (F3-5)

`localStorage` に残るユーザー追加レシピを、起動時に自動でDBへ移します。

- 対象はAPI取得に成功した職人のみ (`apiHydratedCraftIds`)
- 各控えは、ローカル削除記録、サーバー削除済みID、API一覧の既存IDの順に判定します
- 職人ごとに `GET /api/crafts/{craftId}/deleted-recipes` で論理削除済みIDを確認し、一致する控えはPOSTせず、控えから除去し、ローカル削除記録へ追加してフォールバック表示も抑止します
- API一覧の取得後に別ブラウザで削除されたIDを取りこぼさないため、サーバー削除済みIDはAPI一覧の既存IDより先に判定します
- API側に同じIDが存在するレシピは取り込み済みとして飛ばします
- 削除済みIDの取得に失敗した職人は、安全のためその回の取り込みを見送りします
- `sort_order` の採番競合 (#231) を避けるため、`POST` は1件ずつ直列に実行します
- 失敗しても他の職人・他のレシピの取り込みは続けます。`alert` は出さず警告ログのみです
- **失敗したレシピは `localStorage` から消しません。** 名前重複も同様です

### 選択中レシピのIDの引き継ぎ

取り込みでIDが変わるため、`state.recipeId` の読み替えが必要です。
**`loadState()` より前に、保存状態そのもののIDを読み替えます。**

`loadState()` は内部で `normalizeState()` を呼び、
保存済みのIDが現在のレシピ一覧に無ければ既定レシピのIDへ差し替えます。
取り込み後は旧IDのレシピが一覧に存在しないため、`loadState()` の後で読み替えても手遅れです。

## 実装の所在

| ファイル | 役割 |
| --- | --- |
| `api/main.py` | `do_POST` と削除済みID取得のルーティング・応答コードの割り当て |
| `api/repository/postgres_store.py` | `create()` の発番と復活の判定、`load_deleted_ids()` の論理削除済みID取得 |
| `api/repository/json_store.py` | `create()` のファイル内発番、`load_deleted_ids()` の空配列応答 |
| `api/repository/queries_write.py` | `insert_recipe_header()`、`SERVER_LEGACY_ID_PREFIX` |
| `api/repository/validation.py` | `validate_recipe(recipe, require_id=False)` |
| `app/main.js` | `createRecipeOnApi`、削除済みID取得、控えの削除、`saveManagedRecipe`、`applyImportedRecipeIds` |
| `app/recipe-sync.js` | `importLocalRecipes()`。削除済みIDを確認して行う起動時の取り込み |

## 対象外

- 分類の新規作成と鍛冶の使用マス連動 (段階3d、#221)
- 不正なJSONのPUTで `invalid_json` が返らない件 (#227)
- 変換用分類と未分類レシピの扱い (#239)

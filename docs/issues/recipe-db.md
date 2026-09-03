# Issue明細: レシピDB移行

レシピデータをJSONからPostgreSQLへ移行する一連のタスクです。

設計は [レシピDB移行設計](../design/08-recipe-db-migration.md)、[レシピDB設計](../design/09-recipe-db-schema.md)、[レシピDBテーブル定義](../design/10-recipe-db-tables.md)、[レシピDB実装方針](../design/11-recipe-db-implementation.md) を参照します。

### #215 レシピデータのPostgreSQL移行設計を作成する

現状:

- レシピデータは `api/data/crafts/<職人>/recipes.json` で管理しています。
- APIがファイルを丸ごと読み書きするため、同時更新が後勝ちで消えます。
- 基準値の範囲やマス重複を検証する仕組みがありません。

完了条件:

- 移行設計、テーブル設計、テーブル定義、実装方針のドキュメントがある。
- 適用可能なマイグレーションSQLがある。
- 現行データがDDLの制約に適合し、ラウンドトリップが一致することを実DBで確認している。

URL: https://github.com/kwdch013/crafting_dq10/issues/215

### #216 レシピDB移行 段階1: DB基盤の追加

現状:

- APIは標準ライブラリのみで動作し、DB接続の仕組みがありません。

完了条件:

- `api` コンテナから `postgres_db:5432` へ接続できる。
- マイグレーションが適用でき、再実行しても二重適用されない。
- 6職人70レシピ303マスを投入でき、ラウンドトリップが一致する。
- 既存テストが変更なしで通る。

URL: https://github.com/kwdch013/crafting_dq10/issues/216

### #217 レシピDB移行 段階2: 保存先の切り替え

現状:

- `api/main.py` がHTTP処理とファイル読み書きを兼ねています。

完了条件:

- `RECIPE_STORE` でJSONとPostgreSQLを切り替えられる。
- `postgres` 指定時のレスポンスが現行JSONと同じ形式になる。
- 既定を `postgres` にした状態で画面が従来どおり動作する。

URL: https://github.com/kwdch013/crafting_dq10/issues/217

### #218 レシピDB移行 段階3a: 分類・特性・食材マスタの参照APIを追加する

2026-09-03 に PR #236 で対応済みです。仕様は [マスタ参照API](../design/14-recipe-master-api.md) を参照します。

現状:

- 分類や特性の一覧を返すAPIがありません。

完了条件:

- 職人ごとの分類一覧、特性一覧、食材一覧が取得できる。
- 鍛冶の分類では使用マスの座標が取得できる。

URL: https://github.com/kwdch013/crafting_dq10/issues/218

### #219 レシピDB移行 段階3b: 分類の選択肢をAPI由来へ移す

2026-09-03 に PR #238 で対応済みです。マージ規則は [マスタ参照API](../design/14-recipe-master-api.md) を参照します。

分類の選択肢は `GET /api/crafts/{craftId}/masters` 由来になり、`config.js` はAPI停止時のフォールバックと、表示順・使用マステンプレートの供給元として残ります。`legacyId` を持たない分類 (未分類・DB移行時の変換用テンプレート) は選択肢に出しません。残課題は #239 で扱います。

現状:

- 大項目は `app/crafts/<職人>/config.js` の `recipeCategoryOptions` が真実源です。
- DB移行後は分類テーブルと二重管理になります。

完了条件:

- レシピ追加画面の大項目がAPI由来の値で表示される。
- API停止時は `config.js` の値にフォールバックする。

URL: https://github.com/kwdch013/crafting_dq10/issues/219

### #220 レシピDB移行 段階3c: レシピ登録の入口をPOSTへ変更する

現状:

- フロントがIDを生成し、`localStorage` を真実源として保存しています。
- APIへのPUTは一時反映で、失敗しても画面には保存済みとして残ります。

完了条件:

- 画面からのレシピ追加でサーバーがIDを発番し、DBへ保存される。
- 保存失敗時にエラーが表示され、成功したかのような表示にならない。
- 既存の `localStorage` のユーザー追加レシピがDBへ取り込まれる。

URL: https://github.com/kwdch013/crafting_dq10/issues/220

### #221 レシピDB移行 段階3d: 分類の新規作成と鍛冶の使用マス連動

現状:

- 鍛冶はマス名から座標を復元できないため、分類テーブルが座標を持ちます。
- 新しい盤面形状のレシピを追加するには分類の作成が先になります。

完了条件:

- 鍛冶で新しい盤面形状の分類を画面から作成できる。
- 鍛冶のレシピ追加で、分類を選ぶと使用マスが決まる。

URL: https://github.com/kwdch013/crafting_dq10/issues/221

### #224 レシピDB: 素材・単価・使用道具と大成功損益計算のデータ設計を検討する

現状:

- レシピJSONにも既存18テーブルにも、レベル、使用道具、必要素材の個数、単価を表す項目がありません。
- `craft_master` の `recipe_price` と `master_level` は将来拡張用に確保した未使用列です。
- 使用道具は `app/crafts/registry.js` と各 `config.js` が集中力加算としてのみ扱っています。
- 原価・販売価格・損益を扱う機能はUIにもAPIにもありません。

完了条件:

- 品目、必要素材、価格履歴、使用道具のテーブル案と論点が整理されている。
- 大成功の損益分岐計算に必要な入力と、DQ10仕様として要確認の点が列挙されている。
- バザー価格の自動取得について、公式に提供された連携手段の有無が整理されている。
- 着手順序が既存の移行段階 (#217 から #221) との関係で提案されている。

着手はレシピDB移行の段階3完了後を想定します。仕様確認とデータモデルの詳細化は先行できます。

URL: https://github.com/kwdch013/crafting_dq10/issues/224

### #231 共通: sort_order と category_id の採番が並行登録で衝突する

`craft_master.sort_order` と分類テーブルの `category_id` は、いずれも既存の最大値 + 1 で採番しています。2つのリクエストが同時に新規登録すると双方が同じ値を採番し、一意制約により片方の保存が失敗します。PR #229 で DB の `UniqueViolation` を 400 の固定エラー識別子 (`recipe_sort_order_conflict` 等) へ変換したため 500 や空応答にはなりませんが、競合そのものは残っています。`craft_master_sort_order_unique` は DEFERRABLE INITIALLY DEFERRED のため、違反は `commit()` の時点で発生します。対応方針はテーブルロックによる直列化か、シーケンス / IDENTITY への移行です。`category_id` は #221 (段階3d) で分類の作成APIを実装する際に同じ判断が必要になるため、あわせて決めるのが効率的です。利用者が1人であれば実際には競合しないため優先度は低いです。URL: https://github.com/kwdch013/crafting_dq10/issues/231


### #239 共通: DB移行時の変換用分類と未分類レシピの扱いを決める

現状:

- DB移行時に、既存の大項目に当てはまらない盤面形状のレシピ用として `legacy_category_id` が NULL の変換用分類が作られています。
- 該当レシピの `categoryId` は `null` になり、大項目で絞り込む画面には表示されません。
- 段階3bでは、選んでも0件になる空の大項目が増えるのを避けるため、`legacyId` を持たない分類を選択肢から除外しています。

完了条件:

- 変換用分類と変換用レシピの扱いが決まっている。
- `未分類` を画面の大項目として出すかどうかが決まっている。
- 決定内容が設計ドキュメントへ反映されている。

URL: https://github.com/kwdch013/crafting_dq10/issues/239

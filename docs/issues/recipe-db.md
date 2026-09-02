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

現状:

- 分類や特性の一覧を返すAPIがありません。

完了条件:

- 職人ごとの分類一覧、特性一覧、食材一覧が取得できる。
- 鍛冶の分類では使用マスの座標が取得できる。

URL: https://github.com/kwdch013/crafting_dq10/issues/218

### #219 レシピDB移行 段階3b: 分類の選択肢をAPI由来へ移す

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

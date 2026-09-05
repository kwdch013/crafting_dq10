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

分類の選択肢は `GET /api/crafts/{craftId}/masters` 由来になり、`config.js` はAPI停止時のフォールバックと、表示順・使用マステンプレートの供給元として残ります。未分類 (`category_id` 0) は選択肢に出しません。DB移行時の変換用分類は#239で実分類へ再割当し、無効化しました。

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

2026-09-03 に PR #241 で対応済みです。仕様は [レシピ登録API](../design/15-recipe-post-api.md) を参照します。

サーバーが `craft_master.id` を発番し `legacy_id` へ `db-<id>` を書きます。APIが返すレシピの `id` は従来どおり文字列のままです。保存に失敗した場合は `localStorage` にも書かず、ダイアログを閉じずにエラーを表示します。`localStorage` の控えは成功時のみ更新します。起動時の取り込みは `app/recipe-sync.js` が担当し、削除済みIDのレシピは対象から外します。別ブラウザで削除したレシピが復活する経路は #242 (PR #245) で対応済みです。

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


### #239 共通: 変換用分類を実分類へ再割当し、未分類レシピを肉料理へ暫定分類する (2026-09-05 close済み)

決定済みの対応:

- 変換用分類の使用マスは同一職人の実分類と完全に一致していたため、レシピを片手剣・盾・木工刀・ハンマーへ再割り当てし、変換用分類4件を無効化する。
- 調理の `category_id = 0` の11件は、正しい料理区分を別issueで決めるまで肉料理へ暫定分類する。
- `未分類` (`category_id` 0) はレシピ登録時の既定値としてDBに残すが、画面の大項目には出さない。
- 0005マイグレーションの適用後にフォールバックレシピを再生成し、全ての有効かつ未archiveのレシピが有効な実分類に属することを回帰テストで確認する。

2026-09-05 に PR #248 で対応済みです。適用は `api/migrations/0005_reassign_conversion_categories.sql` で、IDは `legacy_id` / `legacy_category_id` / `category_name` の副問い合わせで解決しているため、0001→0005 を通した新規DBでも同じ結果になります。正しい料理区分への再分類は#247で扱います。

URL: https://github.com/kwdch013/crafting_dq10/issues/239

### #242 共通: 別ブラウザで削除したレシピが起動時の取り込みで復活する (2026-09-04 close済み)

段階3c (#220 / PR #241) の取り込みは「API側のレシピ一覧に同じIDが無いもの」を対象にします。`GET /api/recipes` は論理削除済みのレシピを返さないため、DBで削除済みのレシピと未取り込みのレシピをIDだけでは区別できません。

ブラウザAで削除したレシピはブラウザBの `localStorage` に残るため、B の起動時に取り込み対象となり、`PostgresRecipeStore.create()` が同名の論理削除済み行を復活させます。削除の記録 (`deletedIds`) はブラウザごとに独立しているため、PR #241 で入れた防御では防げません。

対応 (PR #245): 削除済みIDだけを返す `GET /api/crafts/{craftId}/deleted-recipes` を追加し、取り込みで一致する控えは `POST` せず、控えを除去してローカル削除記録へ追加します。判定順は ローカル削除記録 → サーバー削除済みID → API一覧の既存ID とし、一覧取得後に別ブラウザが削除した場合の取りこぼしを防ぎます。削除済みIDを取得できなかった職人は、その回の取り込みを見送ります。

`PostgresRecipeStore.create()` の復活処理は、利用者が同名で作り直す経路 (#217) を維持するため残しています。

URL: https://github.com/kwdch013/crafting_dq10/issues/242

### #247 調理職人: 暫定で肉料理へ寄せたレシピ11件を正しい料理区分へ割り当てる

#239 の派生タスクです。#239 では表示されないレシピを無くすことを優先し、`category_id = 0` だった調理11件 (きようさにくまん / パワフルステーキ / バランスパスタ / あいじょうオムレツ / ファイアタルト / ダークタルト / アイスタルト / ストームタルト / スマッシュポテト / クイックケーキ / ライトタルト) を暫定的に一律で肉料理へ寄せました。

ゲーム内の実際の料理区分 (肉料理 / 魚料理 / パスタ＆ライス / スイーツ) を確認したうえで、新しいマイグレーションで `cooking_recipes.category_id` を更新し、`export_recipes.py` でフォールバックを再生成します。

URL: https://github.com/kwdch013/crafting_dq10/issues/247

### #249 共通: export_recipes.py をコンテナ内で実行してもホストの recipes.js が更新されない (2026-09-05 close済み)

`api/Dockerfile` は `COPY api/ ./` のみで `app/` をイメージへ含めていません。`export_recipes.py` の `DEFAULT_APP_DIR` は `Path(__file__).resolve().parents[2] / "app"` で、コンテナ内ではこれが `WORKDIR` と同じ `/usr/src/app` を指します。

このため `docker compose exec api python scripts/export_recipes.py` を実行しても、`recipes.js` は既存内容と比較されないまま `/usr/src/app/crafts/<職人>/` へ新規生成され、ホストのコミット対象ファイルへは反映されません。`--dry-run` の「変更」表示もホストとの差分ではないため当てになりません。出力内容自体はDB由来のため正しいものです。

暫定対応として、PR #248 で `docker cp` による取り出し手順を [運用手順](../design/13-recipe-db-operations.md) へ追記しました。

対応: composeでホストの `./app/crafts` を `/usr/src/frontend-app/crafts` へマウントし、`APP_DIR` に `/usr/src/frontend-app` を渡します。`export_recipes.py` は出力先を `--app-dir`、`APP_DIR`、リポジトリ構成からの推定の順で決めるため、コンテナ内実行でもホストの `recipes.js` が更新され、`--dry-run` もホスト側との差分を表示します。WORKDIR の `/usr/src/app` へ重ねるとAPIのソースが隠れるため、マウント先は別パスにしています。`docker cp` の暫定手順は削除しました。

2026-09-05 に PR #251 で対応済みです。CIでDB依存テストが実行されない点は #252 へ切り出しました。

URL: https://github.com/kwdch013/crafting_dq10/issues/249

### #252 共通: CI に PostgreSQL を用意して DB 依存テストを実行する

PR #251 (#249) のレビューで判明した、CIの構成課題です。`.github/workflows/ci.yml` はPostgreSQLを用意しないため、`TEST_DATABASE_URL` を使うテスト8ファイルがすべてスキップされます。CIは成功しますが、DBに関わる振る舞いは検証されていません。

CIでPostgreSQLを起動して `TEST_DATABASE_URL` を渡し、DB依存テストも実行される状態にします。各テストは `DROP SCHEMA IF EXISTS public CASCADE` を実行するため、CI専用の使い捨てDBを使います。

URL: https://github.com/kwdch013/crafting_dq10/issues/252

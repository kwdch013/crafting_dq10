# レシピDB移行設計

## 目的

レシピデータの真実源はPostgreSQLです。

`api/data/crafts/<職人>/recipes.json` はDBからの追跡対象外の生成物として残し、
`app/crafts/<職人>/recipes.js` はAPI停止時のコミット対象フォールバックとして残します。
空のDBを初期化する唯一のレシピ入力は `api/migrations/0004_seed_recipes.sql` です。

現行のレシピ仕様そのものは [レシピデータ設計](./06-recipe-data.md) を真実源とし、本書は保存先の移行だけを扱います。

## 現状と課題

現状はAPIがJSONを読み、`PUT` / `DELETE` でファイルを丸ごと書き換えています。

| 課題 | 内容 |
| --- | --- |
| 同時更新 | ファイル全体を読み書きするため、複数ブラウザからの更新が後勝ちで消える |
| 整合性 | 基準値の範囲やマス重複を検証する仕組みがなく、投入後に気づけない |
| 検索性 | 大項目や特性でレシピを絞る処理をAPI側で行えず、全件返却に依存している |
| 履歴 | 誰がいつ値を変えたかが git のコミット単位でしか追えない |

## 移行方針

段階移行とし、各段階で単体でも動作する状態を保ちます。

| フェーズ | 内容 | 真実源 |
| --- | --- | --- |
| Phase 0 | DB・ロール作成、コンテナ間疎通確認 | JSON |
| Phase 1 | スキーマ定義とマイグレーション基盤、投入スクリプト | JSON |
| Phase 2 | リポジトリ層を抽象化し、`RECIPE_STORE` で保存先を切替 | JSON |
| Phase 3 | 既定を `postgres` に切替、JSONはエクスポートで自動生成 | DB (対応済み) |
| Phase 4 | JSON手編集の廃止、運用ルールの決定とドキュメント更新 | DB |

[レシピDB実装方針](./11-recipe-db-implementation.md) の段階との対応は以下です。

| Phase | 段階 | 真実源 |
| --- | --- | --- |
| Phase 0-1 | 段階1 | JSON |
| Phase 2 | 段階2 (B2-1 から B2-4) | JSON |
| Phase 3 | 段階2 (B2-5) | DB。ただしブラウザ追加分は `localStorage` に残る |
| Phase 4 | 段階3 | DB |

Phase 3 の時点では、既存の `localStorage` に残るユーザー追加レシピがまだDBへ取り込まれていません。
この期間は現行どおり `localStorage` の内容をAPI由来データへ重ねて表示し、取り込みは段階3cで行います。

## 接続先PostgreSQL

本サーバー上の既存コンテナを利用し、新規にPostgreSQLコンテナは立てません。

| 項目 | 値 |
| --- | --- |
| コンテナ | `postgres_db` (postgres:15) |
| ネットワーク | `database_default` (外部ネットワークとして参照) |
| ホスト名 | `postgres_db` (エイリアス `postgres`) |
| データベース | `crafting_dq10` (新規作成) |
| ロール | `crafting_dq10` (新規作成、当該DBのみ所有) |

`price_games` と同じ構成に合わせます。既存DBへは相乗りしません。

`docker-compose.yml` の `api` サービスへ以下を追加します。

```yaml
services:
  api:
    environment:
      RECIPE_STORE: ${RECIPE_STORE:-postgres}
      DATABASE_URL: ${DATABASE_URL:-}
    networks:
      - default
      - database

networks:
  database:
    external: true
    name: database_default
```

`DATABASE_URL` は `.env` にのみ記載し、`.env.example` にはプレースホルダを置きます。
`.env` は `.gitignore` 済みのため、認証情報はコミットされません。

## スキーマ設計

職人ごとにレシピテーブルを分け、盤面のマスを列に展開します。
レシピ共通の見出しは `craft_master` に集約し、職人別テーブルはマスの値だけを持ちます。

| 分類 | テーブル |
| --- | --- |
| 共通 | `craft_master` |
| 特性 | `smith_character`、`sewing_character`、`wood_character`、`cooking_character` |
| 食材 | `cooking_materials` |
| 分類 | `tool_category`、`weapon_category`、`armor_category`、`sewing_category`、`wood_category`、`cooking_category` |
| レシピ | `tool_recipes`、`weapon_recipes`、`armor_recipes`、`sewing_recipes`、`wood_recipes`、`cooking_recipes` |

設計方針は [レシピDB設計](./09-recipe-db-schema.md)、列定義は [レシピDBテーブル定義](./10-recipe-db-tables.md)、現行JSONとの相互変換は [レシピDB変換仕様](./12-recipe-db-conversion.md) を参照します。

## 既存データの適合性

現行の6職人・70レシピ・303マスを本設計で検証した結果、以下を確認しました。

| 検証 | 結果 |
| --- | --- |
| マス名から座標を復元できるか | 調理・裁縫・木工は可能。鍛冶は不可のため分類テーブルで座標を定義する |
| 分類ごとに使用マスが決まるか | 鍛冶・裁縫・木工は決まる。調理は決まらないためレシピ単位で判定する |
| 調理の基準値幅 | 全133マスで30。上限は下限 + 30 で算出できる |
| 鍛冶の基準値幅 | 0から16までばらつく。下限と上限の両方を保持する |
| 調理の `optionId` | 座標から一意に決まるため保持しない |
| 木工の木目 | レシピ内で混在するためマス単位で保持する |
| 調理の食材グループ | 同一レシピに同じ食材のグループが複数あるためグループ番号を保持する |

## API層の設計

保存先を差し替えられるよう、`api/main.py` からデータアクセスを分離します。

```text
api/
  main.py              HTTPハンドラのみ
  repository/
    __init__.py        RECIPE_STORE を見てリポジトリを選択
    json_store.py      現行のファイル読み書き
    postgres_store.py  DB読み書き
  migrations/
    0001_init.sql
    apply.py           未適用SQLを順に実行
  scripts/
    import_recipes.py  JSON -> DB
    export_recipes.py  DB -> JSON / recipes.js
tests/
  repository_mapping.test.py    JSON と行データの相互変換 (DB不要)
  repository_postgres.test.py   リポジトリのCRUDとラウンドトリップ (DB必要)
```

リポジトリの公開インターフェースは現行API相当の4操作に限定します。

- `list_crafts()`
- `list_recipes(craft_id)`
- `upsert_recipe(craft_id, recipe)`
- `delete_recipe(craft_id, recipe_id)`

`upsert_recipe` は `craft_master` と対応する職人別レシピ1行のUPSERTを、同一トランザクションで行います。
マスは列として同じ行に載るため、マス単位の差分更新は発生しません。使用しなくなったマスはNULLで上書きします。

`delete_recipe` は `craft_master.is_active` を `false` に更新する論理削除です。詳細は [レシピDB設計](./09-recipe-db-schema.md) の削除方式を参照します。

HTTPのエンドポイントとレスポンス形式は変更しません。フロント側の変更は不要です。

## ドライバとイメージ

現在のAPIは標準ライブラリのみで動作し `python:3.14-alpine` を使っているため、PostgreSQL接続用の外部ドライバを以下から選択します。

| 案 | 内容 | 評価 |
| --- | --- | --- |
| A | ベースを `python:3.14-slim` に変更し `psycopg[binary]` を使う | 採用。wheelがそのまま入り、ビルド時間が増えない |
| B | alpineのまま `build-base` と `libpq-dev` を入れてビルド | イメージとビルド時間が増える |
| C | 純Python実装の `pg8000` を使う | alpineのままで動くが利用実績が少ない |

案Aを採用します。musl向けのバイナリwheelが提供されていないためです。
標準ライブラリのみという方針からは外れるため、Phase 2 で `AGENTS.md` の構成説明も併せて更新します。

## マイグレーション管理

Alembicは SQLAlchemy への依存が増えるため採用せず、SQLファイルと適用スクリプトで管理します。

```sql
CREATE TABLE schema_migration (
	version    text PRIMARY KEY,
	applied_at timestamptz NOT NULL DEFAULT now()
);
```

`apply.py` は `migrations/*.sql` を昇順に読み、`schema_migration` に無いものだけをトランザクション内で実行します。
適用済みSQLは編集せず、変更は常に新しい連番ファイルとして追加します。

## 移行手順

Phase 0

1. `postgres_db` に `crafting_dq10` ロールとDBを作成する。
2. `.env` に `DATABASE_URL` を設定する。
3. `api` コンテナから `postgres_db:5432` への疎通を確認する。

Phase 1

4. `0001_init.sql` を追加し、`apply.py` で適用する。
5. `import_recipes.py` で現行JSONを全件投入する。
6. `export_recipes.py` の出力が現行JSONと値レベルで一致することを確認する。

Phase 2

7. リポジトリ層を分離し、`RECIPE_STORE=json` で従来どおり動くことを確認する。
8. `RECIPE_STORE=postgres` でGET・PUT・DELETEの動作を確認する。

Phase 3

9. 既定を `postgres` に変更する。
10. レシピ更新時に `export_recipes.py` を実行し、JSONとフォールバック `recipes.js` を再生成する。

Phase 4

11. JSON手編集を廃止し、後述の運用ルールを決定して `AGENTS.md` と関連ドキュメントへ反映する。

各フェーズを個別のissueとして起票し、フェーズごとにブランチとPRを分けます。

## 移行スクリプト

`import_recipes.py` は `catalog.json` から `craft` を投入し、各 `recipes.json` を配列順に読んで `sort_order` を採番します。
再実行時はUPSERTで上書きする冪等な処理とします。

`export_recipes.py` は `sort_order` 順にDBから取得し、`recipes.json` を現行と同じ整形 (indent 2、末尾改行、`ensure_ascii=False`) で出力します。
同じ内容から `app/crafts/<職人>/recipes.js` も生成します。

## テスト設計

| 種別 | 内容 | 実行 |
| --- | --- | --- |
| 単体 | JSON と行データの相互変換関数 | DB不要 |
| 結合 | リポジトリのCRUD、制約違反時のエラー | テスト用DB `crafting_dq10_test` |
| ラウンドトリップ | フォールバック `recipes.js` とDBからの復元結果の一致 (キー順序を除く) | テスト用DB |
| 既存 | `tests/*.test.js` の全件 | 変更なしで通ること |

ラウンドトリップテストを移行の妥当性判定の基準とし、値の差分が出た場合は移行を進めません。
フォールバックのキー順序に依存しないよう、比較はキー順序を無視した値の一致で行います。
Pythonテストは既存の `tests/api_recipe_persistence.test.py` と同じく `tests/` 直下へ置き、`python3 tests/<名前>.test.py` で直接実行します。ファイル名が `.test.py` のため `unittest discover` では読み込めません。
テスト用DBは本番DBと同じマイグレーションを適用し、テストごとにトランザクションをロールバックします。

## ロールバック

JSONへ切り戻す前に、DBから `export_recipes.py` を実行して生成物を用意し、APIを再起動します。
DBに障害が出た場合は、最後にエクスポートしたJSONで一時運用し、復旧後にDBへ戻します。
フロント側の `recipes.js` フォールバックは移行後も維持するため、API停止時の動作は変わりません。

## 運用ルール

移行後のレシピ登録は以下とします。レシピ追加・更新・削除はPostgreSQLへ行い、`recipes.json` を手編集しません。

| 項目 | 決定 |
| --- | --- |
| 登録の入口 | 画面のレシピ追加機能から登録する。API経由でDBへ反映する |
| SQL直接登録 | 一括投入や修正手段として可とする。効くのはDDLの制約だけで、後述の4項目は事前検証が必要 |
| `recipes.json` | DBからエクスポートする追跡対象外の生成物 |
| `recipes.js` | DBからエクスポートするコミット対象のフォールバック |

`recipes.json` は `.gitignore` で除外します。`recipes.js` は同じくエクスポート生成物ですが、
API停止時にも画面を動作させるためコミット対象として維持します。

### 初期化と復旧

`recipes.json` を除外すると、新規cloneと空のDBには投入元がなくなります。
`export_recipes.py` は空のDBからは出力できないため、初期化の入力をコミット対象として別に持ちます。

| 用途 | 入力 |
| --- | --- |
| 新規cloneでの初期化 | `api/migrations/0004_seed_recipes.sql` (移行時点の全レシピ) |
| 障害からの復旧 | `pg_dump` のバックアップ。無い場合は上記シードまで巻き戻す |

シードSQLは移行時点のスナップショットです。移行後に追加したレシピは含まれないため、定期的な `pg_dump` を運用手順に加えます。
シードSQLは初期化専用とし、レシピを追加するたびに更新することはしません。
`apply.py` が各SQLをトランザクションで包むため、シードSQL自身は `BEGIN` / `COMMIT` を持ちません。

SQLで直接登録する場合、DDLで強制されない4項目 ([レシピDB設計](./09-recipe-db-schema.md) のDDLで強制しない整合性) は自分で担保する必要があります。
確実なのは、画面または投入スクリプト経由で登録することです。

## 未決事項

- 更新履歴テーブルを持つか。現時点ではgitのコミット履歴で足りると判断し、Phase 4 の対象外とします。
- 複数ブラウザからの同時更新に楽観ロック (`updated_at` 比較) を入れるか。利用者が単独のため後日判断します。
- `category_id` と `trait_id` のマスタ化。`config.js` 側の整理が済んだ段階で再検討します。

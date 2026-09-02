# レシピDB運用手順

## 目的

レシピDBのマイグレーション適用、データ投入、テスト実行の手順をまとめます。

移行の方針は [レシピDB移行設計](./08-recipe-db-migration.md)、段階分けは
[レシピDB実装方針](./11-recipe-db-implementation.md) を参照します。

## 接続先の設定

`.env` に接続先を書きます。認証情報を含むため `.env.example` にはプレースホルダのみを置きます。

```bash
RECIPE_STORE=json
DATABASE_URL=postgresql://crafting_dq10:<password>@postgres_db:5432/crafting_dq10
TEST_DATABASE_URL=postgresql://crafting_dq10:<password>@postgres_db:5432/crafting_dq10_test
```

`api` サービスは `database_default` ネットワークを外部参照し、`postgres_db` へ接続します。

## DBとロールの作成

初回のみ、`postgres_db` に対して実行します。ロールは当該DBのみを所有します。

```bash
docker exec postgres_db psql -U postgres -d postgres \
  -c "CREATE ROLE crafting_dq10 LOGIN PASSWORD '<password>';" \
  -c "CREATE DATABASE crafting_dq10 OWNER crafting_dq10;" \
  -c "CREATE DATABASE crafting_dq10_test OWNER crafting_dq10;"
```

`postgres_db` は共有サーバー上の既存コンテナです。接続ユーザーは `postgres` です。

## マイグレーションの適用

`api/migrations/*.sql` のうち、`schema_migration` に記録の無いものだけを昇順に適用します。
再実行しても二重適用されません。

```bash
docker compose exec api python migrations/apply.py

# 適用対象の確認だけを行う場合
docker compose exec api python migrations/apply.py --dry-run
```

適用済みのSQLは編集せず、変更は常に新しい連番ファイルとして追加します。
各SQLは `apply.py` がトランザクションで包むため、SQL側に `BEGIN` / `COMMIT` を書きません。

## レシピの投入

`api/data/crafts/<職人>/recipes.json` を配列順に読み、`sort_order` を採番して登録します。
UPSERTのため再実行できます。DDLで強制しない整合性は投入前に検証し、違反があれば
何も書き込まずに終了します。

```bash
docker compose exec api python scripts/import_recipes.py
```

`0004_seed_recipes.sql` を適用済みのDBに対して実行した場合は、同じ内容で上書きされます。

## レシピファイルのエクスポート

DBを保存先に切り替えた後、DBで追加・更新・削除したレシピをフォールバックの
`recipes.json` と `app/crafts/<職人>/recipes.js` へ反映するために実行します。
事前確認では `--dry-run` を使い、差分を確認してから通常実行してください。

```bash
# 全職人を確認してから出力する
docker compose exec api python scripts/export_recipes.py --dry-run
docker compose exec api python scripts/export_recipes.py

# 1職人だけを出力する場合
docker compose exec api python scripts/export_recipes.py --craft cooking
```

出力先を検証用ディレクトリへ変える場合は、`--data-dir` と `--app-dir` を指定します。
`--database-url` を省略すると `DATABASE_URL` を使います。

DBからの復元時には、`items[].id` は読み順で `part-1` から再採番され、`items` は読み順に
並びます。鍛冶では欠落していた `items[].target` が `ceil((successMin + successMax) / 2)` で補われ、
調理の食材グループ番号も再採番されます。これらは仕様上の再生成差分です。

## シードSQLの再生成

`0004_seed_recipes.sql` は空のDBを初期化する唯一のレシピ入力です。移行後にレシピを追加・更新し、
初期スナップショットにも反映する場合は、DB反映後にシードも再生成します。実行前に必ず差分を確認します。

```bash
docker compose exec api python scripts/export_seed.py --dry-run
docker compose exec api python scripts/export_seed.py

# 検証用の出力先を使う場合
docker compose exec api python scripts/export_seed.py --output /tmp/0004_seed_recipes.sql
```

既存シード先頭の運用コメントは維持されます。`apply.py` がトランザクションを管理するため、
生成SQLに `BEGIN` / `COMMIT` を追加してはいけません。

## テストの実行

DBを必要とするテストは `TEST_DATABASE_URL` がある場合のみ実行され、未設定ならスキップします。
CIはDBに接続しないため、単体テストだけが動きます。

```bash
# DB不要の単体テストのみ (CIと同条件)
docker run --rm -v "$PWD":/work -w /work python:3.14-slim \
  sh -c 'for f in tests/*.test.py; do python "$f" || exit 1; done'

# DBを使う結合テストとラウンドトリップテストを含めて実行
docker run --rm -v "$PWD":/work -w /work --network database_default \
  -e TEST_DATABASE_URL="$(grep '^TEST_DATABASE_URL=' .env | cut -d= -f2-)" \
  crafting_dq10-api sh -c 'for f in tests/*.test.py; do python "$f" || exit 1; done'
```

DBを使うテストは、テスト用DBのスキーマを毎回作り直します。
`TEST_DATABASE_URL` に本番DBを指定しないでください。

## 障害からの復旧

| 用途 | 入力 |
| --- | --- |
| 新規cloneでの初期化 | `api/migrations/0004_seed_recipes.sql` (移行時点の全レシピ) |
| 障害からの復旧 | `pg_dump` のバックアップ。無い場合は上記シードまで巻き戻す |

シードSQLは移行時点のスナップショットです。移行後に追加したレシピは含まれません。

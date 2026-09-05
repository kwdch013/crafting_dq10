# レシピDB運用手順

## 目的

レシピDBのマイグレーション適用、データ投入、テスト実行の手順をまとめます。

移行の方針は [レシピDB移行設計](./08-recipe-db-migration.md)、段階分けは
[レシピDB実装方針](./11-recipe-db-implementation.md) を参照します。

## 接続先の設定

`.env` に接続先を書きます。認証情報を含むため `.env.example` にはプレースホルダのみを置きます。

```bash
RECIPE_STORE=postgres
DATABASE_URL=postgresql://crafting_dq10:<password>@postgres_db:5432/crafting_dq10
TEST_DATABASE_URL=postgresql://crafting_dq10:<password>@postgres_db:5432/crafting_dq10_test
```

`api` サービスは `database_default` ネットワークを外部参照し、`postgres_db` へ接続します。

`RECIPE_STORE` の既定は `postgres` です。JSONへ切り戻す場合のみ `json` を指定します。

**切り戻す前に `export_recipes.py` を実行してください。** `api/data/crafts/<職人>/recipes.json` は
生成物として追跡対象外のため、新規cloneの直後には存在しません。この状態で `json` を指定すると
APIはレシピを0件で返します (画面はフォールバックの `app/crafts/<職人>/recipes.js` で動作します)。
一度エクスポートすれば、以後はDBを停止していても `json` で従来どおり動作します。

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

新規cloneの空DBには、まず `api/migrations/0004_seed_recipes.sql` を含むマイグレーションを適用します。
これが空のDBを初期化する唯一のレシピ入力です。

`import_recipes.py` は移行時、または `api/data/crafts/<職人>/recipes.json` が手元にある場合だけ使います。
同ファイルを配列順に読み、`sort_order` を採番して登録します。
UPSERTのため再実行できます。DDLで強制しない整合性は投入前に検証し、違反があれば
何も書き込まずに終了します。

```bash
docker compose exec api python scripts/import_recipes.py
```

`0004_seed_recipes.sql` を適用済みのDBに対して実行した場合は、JSONが手元にあれば同じ内容で上書きされます。

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

`api/data` はホストの `./api/data` をマウントしているため、`recipes.json` はホストへ直接反映されます。

`app/` もホストの `./app` を `/usr/src/frontend-app` へマウントし、composeが `APP_DIR` でその位置を
コンテナへ渡しています。`export_recipes.py` は出力先を `--app-dir`、環境変数 `APP_DIR`、
リポジトリ構成からの推定の順で決めるため、コンテナ内実行でもホストの
`app/crafts/<職人>/recipes.js` が直接更新され、`--dry-run` もホスト側との差分を表示します。

APIイメージのWORKDIR `/usr/src/app` は `api/` の配置先です。ここへ `app/` を重ねると
APIのソースが隠れて起動できなくなるため、マウント先は別のパスにしています。

出力後は `git diff` でフォールバックの差分を確認してからコミットします。

DBからの復元時には、`items[].id` は読み順で `part-1` から再採番され、`items` は読み順に
並びます。鍛冶では欠落していた `items[].target` が `ceil((successMin + successMax) / 2)` で補われ、
調理の食材グループ番号も再採番されます。これらは仕様上の再生成差分です。

## シードSQLの再生成

`export_seed.py` は、B2-5で保存先をDBへ切り替える際に初期スナップショットを確定するための一回限りの再生成に使います。
切り替え前にスキーマまたは変換規則を変更した場合も、初期スナップショットを作り直すために実行し、実行前に必ず差分を確認します。
移行後の日常的なレシピ追加・更新では実行せず、`export_recipes.py` でJSON/JSを再生成し、`pg_dump` でバックアップします。
シードは移行時点のスナップショットであり、切り替え前に確定した後は適用済みSQLを編集しない原則に従って触りません。

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

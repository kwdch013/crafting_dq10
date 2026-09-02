# レシピDBテーブル定義

## 表記ルール

設計方針と原案からの変更点は [レシピDB設計](./09-recipe-db-schema.md)、現行JSONとの相互変換は [レシピDB変換仕様](./12-recipe-db-conversion.md) を参照します。

- 「必須」は `NOT NULL` を表します。
- マスごとの列は A から H (鍛冶) または A から I (裁縫・木工・調理) まで同じ形で繰り返します。定義では A の行だけを示します。
- 監査列 (`created_at`、`updated_at`、`is_active`) は全テーブル共通のため、各テーブルの定義から省略します。
- 列名はPostgreSQLの畳み込みに合わせて小文字です。盤面上の位置としてのマス名だけを大文字のA-Iで表記します。

| 列 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `created_at` | timestamptz | o | 作成日時。既定は `now()` |
| `updated_at` | timestamptz | o | 最終更新日時。トリガーで自動更新 |
| `is_active` | boolean | o | 有効フラグ。既定は `true`、削除時に `false` |

## craft_master

全職人共通のレシピ見出しです。IDはこのテーブルで発番します。

| 列 | 論理名 | 型 | 必須 | unique | 説明 |
| --- | --- | --- | --- | --- | --- |
| `id` | ID | integer | o | o | 主キー。`GENERATED ALWAYS AS IDENTITY` |
| `legacy_id` | 移行前ID | text | | o | 現行JSONの `id`。移行後の新規レシピはNULL |
| `name` | 名前 | text | o | | `UNIQUE (class, name)` |
| `class` | 分類 | smallint | o | | 1-6のみ許容。1=道具、2=武器、3=防具、4=裁縫、5=木工、6=調理 |
| `sort_order` | 並び順 | integer | o | | JSON配列内の並び順を保持する |
| `archived` | 非表示 | boolean | o | | `true` で選択欄に表示しない。既定は `false` |
| `recipe_name` | レシピ名 | text | | | 未使用。将来の拡張用 |
| `recipe_place` | レシピ入手場所 | text | | | 未使用。将来の拡張用 |
| `recipe_price` | レシピ価格 | integer | | | 未使用。将来の拡張用 |
| `master_level` | 習得可能レベル | integer | | | 未使用。将来の拡張用 |

`name` は職人をまたぐと重複しうるため、`class` との複合uniqueにします。現行データに職人をまたぐ同名レシピはありません。

以下の制約も持たせます。

| 制約 | 目的 |
| --- | --- |
| `UNIQUE (id, class)` | 職人別テーブルからの識別子付き外部キーの参照先 |
| `UNIQUE (class, sort_order)` | 並び順の重複を防ぎ、エクスポート順を一意にする。並べ替え中の一時的な重複を許すため `DEFERRABLE INITIALLY DEFERRED` とする |

## 特性マスタ

`smith_character`、`sewing_character`、`wood_character`、`cooking_character` は同じ構造です。
鍛冶3職人 (class 1-3) は `smith_character` を共有します。

| 列 | 論理名 | 型 | 必須 | unique | 説明 |
| --- | --- | --- | --- | --- | --- |
| `chara_id` | ID | smallint | o | o | 主キー |
| `chara_name` | 特性名 | text | o | o | |
| `chara_desc` | 特性説明 | text | | | |
| `legacy_trait_id` | 移行前特性ID | text | | o | 現行JSONの `traitId` |

各テーブルに `(0, 'なし', 'なし、もしくは未追加')` を登録します。

## cooking_materials

調理の食材マスタです。

| 列 | 論理名 | 型 | 必須 | unique | 説明 |
| --- | --- | --- | --- | --- | --- |
| `material_id` | 食材ID | integer | o | o | 主キー |
| `material_name` | 食材名 | text | o | o | 現行の `ingredientGroupLabel` に対応する |
| `image_path` | 画像パス | text | | | 食材画像のパス |
| `pair_direction` | 隣マス方向 | text | | | `vertical` または `horizontal`。1マス食材はNULL |

`pair_direction` は2マス食材の並び方向です。肉は `horizontal`、魚は `vertical` を設定します。
食材の種類と画像パスは `app/cooking-ingredients.js` の定義に合わせ、肉・魚・野菜・麺・卵・小麦の6種類を登録します。
原案の `next` ("ver" / "hori") から、現行データの表記に合わせて改名しました。

## 分類テーブル (鍛冶3職人)

`tool_category`、`weapon_category`、`armor_category` は同じ構造です。
マス名から座標を復元できないため、使用有無ではなく座標を持ちます。

| 列 | 論理名 | 型 | 必須 | unique | 説明 |
| --- | --- | --- | --- | --- | --- |
| `category_id` | 分類ID | integer | o | o | 主キー |
| `category_name` | 分類名 | text | o | o | |
| `legacy_category_id` | 移行前分類ID | text | | o | 現行JSONの `categoryId` |
| `row_a` | Aマスの行 | smallint | | | 1以上。未使用マスはNULL |
| `col_a` | Aマスの列 | smallint | | | 1以上。未使用マスはNULL |

`row_a` と `col_a` の組は B から H まで同じ形で続きます。
片方だけがNULLになる状態を防ぐため、`CHECK ((row_a IS NULL) = (col_a IS NULL))` を各マスに設定します。
同じ座標を複数のマスへ割り当てないよう、投入時に重複を検証します。

`category_id = 0` を「未分類」として登録します。現行のテンプレートレシピが大項目を持たないためです。

## 分類テーブル (裁縫・木工)

`sewing_category` と `wood_category` は同じ構造です。
マス名が3行3列の座標順に固定対応するため、使用有無だけを持ちます。

| 列 | 論理名 | 型 | 必須 | unique | 説明 |
| --- | --- | --- | --- | --- | --- |
| `category_id` | 分類ID | integer | o | o | 主キー |
| `category_name` | 分類名 | text | o | o | |
| `legacy_category_id` | 移行前分類ID | text | | o | 現行JSONの `categoryId` |
| `exist_a` | Aマスの存在 | boolean | o | | `true` で使用。左上 |

`exist_a` は B から I まで同じ形で続きます。座標との対応は A=(1,1)、B=(1,2)、C=(1,3)、D=(2,1)、E=(2,2)、F=(2,3)、G=(3,1)、H=(3,2)、I=(3,3) です。

裁縫と木工の盤面はどちらも3行3列です。現行の木工レシピは2列目までしか使っていませんが、3列目を使うレシピも登録できます。

## cooking_category

調理の大項目です。同一分類内でも使用マスが揃わないため、マスの定義は持ちません。

| 列 | 論理名 | 型 | 必須 | unique | 説明 |
| --- | --- | --- | --- | --- | --- |
| `category_id` | 分類ID | integer | o | o | 主キー |
| `category_name` | 分類名 | text | o | o | 肉料理、魚料理、パスタ・ごはん、スイーツ |
| `legacy_category_id` | 移行前分類ID | text | | o | 現行JSONの `categoryId` |

## レシピテーブル (鍛冶3職人)

`tool_recipes`、`weapon_recipes`、`armor_recipes` は同じ構造です。
基準値は範囲で決まるため、マスごとに下限と上限を持ちます。

| 列 | 論理名 | 型 | 必須 | unique | 説明 |
| --- | --- | --- | --- | --- | --- |
| `id` | ID | integer | o | o | 主キー。`craft_master` への外部キー |
| `class` | 分類 | smallint | o | | 自職人に固定する。道具は `1`、武器は `2`、防具は `3` |
| `category_id` | 分類ID | integer | o | | 外部キー。既定は `0` |
| `chara_id` | 特性ID | smallint | o | | `smith_character` への外部キー。既定は `0` |
| `a_min` | Aマスの基準下限 | integer | | | 分類で未使用のマスはNULL |
| `a_max` | Aマスの基準上限 | integer | | | 分類で未使用のマスはNULL |

`class` は `CHECK (class = <固定値>)` で自職人に固定し、外部キーは `(id, class)` の複合で `craft_master` を参照します。
これにより、別の職人の見出しへ紐付けたり、同一IDを複数の職人別テーブルへ登録したりできなくなります。

`a_min` と `a_max` の組は B から H まで同じ形で続きます。
各マスに `CHECK (a_min <= a_max)` と `CHECK ((a_min IS NULL) = (a_max IS NULL))` を設定します。

## sewing_recipes

裁縫は固定基準値のため、マスごとに1つの値だけを持ちます。

| 列 | 論理名 | 型 | 必須 | unique | 説明 |
| --- | --- | --- | --- | --- | --- |
| `id` | ID | integer | o | o | 主キー。`craft_master` への外部キー |
| `class` | 分類 | smallint | o | | `4` に固定する |
| `category_id` | 分類ID | integer | o | | 外部キー。既定は `0` |
| `chara_id` | 特性ID | smallint | o | | `sewing_character` への外部キー。既定は `0` |
| `value_a` | Aマスの基準値 | integer | | | 分類で未使用のマスはNULL |

`value_a` は B から I まで同じ形で続きます。

## wood_recipes

木工は固定基準値に加え、マスごとの木目を持ちます。

| 列 | 論理名 | 型 | 必須 | unique | 説明 |
| --- | --- | --- | --- | --- | --- |
| `id` | ID | integer | o | o | 主キー。`craft_master` への外部キー |
| `class` | 分類 | smallint | o | | `5` に固定する |
| `category_id` | 分類ID | integer | o | | 外部キー。既定は `0` |
| `chara_id` | 特性ID | smallint | o | | `wood_character` への外部キー。既定は `0` |
| `value_a` | Aマスの基準値 | integer | | | 分類で未使用のマスはNULL |
| `grain_a` | Aマスの木目 | boolean | | | `true` で縦 (逆目)、`false` で横。未使用マスはNULL |

`value_a` と `grain_a` の組は B から I まで同じ形で続きます。

木目をレシピ単位ではなくマス単位にしたのは、現行データに縦と横が混在するレシピがあるためです。
`vertical` を `true`、`horizontal` を `false` として保存します。

## cooking_recipes

調理はマスごとに食材と基準値を持ちます。基準値の上限は下限 + 30 で算出します。

| 列 | 論理名 | 型 | 必須 | unique | 説明 |
| --- | --- | --- | --- | --- | --- |
| `id` | ID | integer | o | o | 主キー。`craft_master` への外部キー |
| `class` | 分類 | smallint | o | | `6` に固定する |
| `category_id` | 分類ID | integer | o | | 外部キー。既定は `0` |
| `chara_id` | 特性ID | smallint | o | | `cooking_character` への外部キー。既定は `0` |
| `material_a` | Aマスの食材ID | integer | | | `cooking_materials` への外部キー。未使用マスはNULL |
| `group_a` | Aマスの食材グループ | smallint | | | 同一レシピ内で同じ番号なら同一食材。1マス食材はNULL |
| `a_min` | Aマスの基準下限 | integer | | | 未使用マスはNULL |

`material_a`、`group_a`、`a_min` の組は B から I まで同じ形で続きます。

マスの使用有無は `*_min` で判定します。現行データの調理133マスのうち73マスは食材が未設定のため、食材とマスの対を強制しません。

`group_*` は、同一レシピ内に同じ食材の2マスグループが複数ある場合に区別するための列です。
現行データでは肉4マスが2グループに分かれるレシピと、魚4マスが2グループに分かれるレシピが存在します。
番号はレシピ内で一意であればよく、他のレシピとの連続性は持ちません。

基準値の上限を持たないのは、現行の全133マスで上限と下限の幅が30だったためです。
幅が異なるレシピが見つかった場合は `a_max` 列の追加を検討します。

## 初期データ

固定シード (`api/migrations/0003_seed_master.sql`) で投入するものは以下です。

| テーブル | 内容 |
| --- | --- |
| `smith_character` | `0` なし、光、戻り、倍・半分、集中変化 |
| `cooking_character` | `0` なし、光、光・戻り、回復 |
| `sewing_character` / `wood_character` | `0` なしのみ。特性が未整理のため |
| `cooking_materials` | 肉、魚、野菜、麺、卵、小麦。肉は `horizontal`、魚は `vertical` |
| 各分類テーブル | `category_id = 0` (未分類) のみ |

移行時のスナップショット (`api/migrations/0004_seed_recipes.sql`) で投入するものは以下です。

| テーブル | 内容 | 投入元 |
| --- | --- | --- |
| 各分類テーブル | 大項目と使用マス | レシピ登録済みは実レシピ、未登録は `config.js` の `recipeCategoryOptions` |
| `craft_master` と各レシピテーブル | 移行時点の全レシピ | `0004_seed_recipes.sql` の確定内容 |

鍛冶の分類には、レシピが未登録の大項目 (片手剣、両手剣など) も含めます。座標の定義が職人設定にあるためです。
優先順位の詳細は [レシピDB設計](./09-recipe-db-schema.md) の分類テーブルの投入元を参照します。

`smith_character` の内容は現行の道具鍛冶データが持つ特性 (`light`、`return`、`double-half`、`focus-change`、`none`) に対応します。
`none` は移行時に `chara_id = 0` へ寄せます。

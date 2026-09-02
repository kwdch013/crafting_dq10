# レシピDB変換仕様

## 目的

PostgreSQLと、DBから生成する `recipes.json` / フォールバック `recipes.js` の間で、値をどう変換するかを定めます。

テーブル構成は [レシピDB設計](./09-recipe-db-schema.md)、列定義は [レシピDBテーブル定義](./10-recipe-db-tables.md) を参照します。

## エクスポート時に再生成する項目

以下は生成物で値が統一されていないため、DBには保持せずエクスポート時に規則で再生成します。
`recipes.json` はコミット対象外で、`recipes.js` は同じ復元結果をコミットするため、再生成による差分は問題になりません。

| 項目 | 現行データの状態 | 再生成の規則 |
| --- | --- | --- |
| `items[].id` | `part-1`、`item-1`、`slot-3-2` が混在 | 使用マスの読み順で `part-1` から採番 |
| `items` の並び順 | 道具鍛冶の2レシピが座標順でない | 座標の読み順 (行→列) |
| `items[].ingredientGroupId` | `battle-steak-meat-top` などレシピ固有の文字列 | レシピ内の出現順で `group-1` から採番 |
| 鍛冶の `items[].target` | 道具鍛冶の46マスで欠落 | `ceil((下限 + 上限) / 2)` で算出 |
| `traitId` が `none` | 道具鍛冶の1レシピ | 特性なし (`chara_id = 0`) として出力しない |
| `category` / `categoryId` が空文字 | 調理の11レシピ | 未分類 (`category_id = 0`) として扱い、キーごと出力しない |

鍛冶の `target` を保持しないのは、下限と上限から算出できるためです。
現行の全11マスで `ceil((下限 + 上限) / 2)` と一致し、判定には下限と上限を使うため ([レシピデータ設計](./06-recipe-data.md))、値が増えても挙動は変わりません。

## 基準値の導出

| 職人 | 保持する列 | `target` | `successMin` | `successMax` |
| --- | --- | --- | --- | --- |
| 鍛冶3職人 | `*_min`、`*_max` | `ceil((min + max) / 2)` | `min` | `max` |
| 裁縫・木工 | `value_*` | `value` | `value` | `value` |
| 調理 | `*_min` | `min + 15` | `min` | `min + 30` |

現行データの全マスでこの規則が成立することを確認済みです。

## 生成するレシピ形式とのマッピング

| JSON | 移行先 |
| --- | --- |
| `id` | `craft_master.legacy_id` |
| `name` | `craft_master.name` |
| 職人ディレクトリ名 | `craft_master.class` |
| `archived` | `craft_master.archived` |
| `category` / `categoryId` | 各 `*_category` の行。レシピからは `category_id` で参照 |
| `traitId` | 各 `*_character` の行。レシピからは `chara_id` で参照 |
| `items[].name` | 列名の接尾辞 (A-I) |
| `items[].gridCell` | 鍛冶は `*_category.row_*`/`col_*`、他は列名から導出 |
| `items[].successMin` / `successMax` | 鍛冶は `*_min` / `*_max`、調理は `*_min` のみ |
| `items[].target` | 裁縫・木工は `value_*` |
| `items[].optionId` | 木工は `grain_*`、調理は座標から導出するため保持しない |
| `items[].ingredientGroupLabel` | `cooking_materials.material_name` |
| `items[].ingredientGroupId` | `cooking_recipes.group_*` |
| `items[].ingredientSize` | `cooking_materials.pair_direction` の有無から導出 |
| `items[].current` | 保持しない。現行データは全マスで `0` の初期値のみ |

## 検証結果

検証用DBにマイグレーションを適用し、フォールバックの6職人・70レシピ・303マスで往復を確認しました。

| 検証 | 結果 |
| --- | --- |
| DDLの適用 | 成功 (18テーブル) |
| シードSQLによる初期化 | 成功。空のDBから70レシピを投入できる |
| 分類内でのマス名と座標の矛盾 | 0件 |
| ラウンドトリップ (フォールバック → DB → 復元) | 全6職人で一致 |
| 識別子付き外部キー | 別職人の見出しへの紐付けを拒否する |
| `sort_order` の一意制約 | 同一職人内の重複を拒否する |
| 盤面座標の上限 | 鍛冶で4行2列を超える座標を拒否する |

比較は、上記「エクスポート時に再生成する項目」を両側で揃えたうえで行っています。

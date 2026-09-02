# レシピDB設計

## 目的

レシピデータをPostgreSQLで管理するための設計です。

各テーブルの列定義は [レシピDBテーブル定義](./10-recipe-db-tables.md)、移行の進め方は [レシピDB移行設計](./08-recipe-db-migration.md)、レシピ項目の意味は [レシピデータ設計](./06-recipe-data.md) を参照します。

## 設計方針

職人ごとにレシピテーブルを分け、盤面のマスを列に展開します。

- 職人ごとに構造が違う (鍛冶は基準範囲、裁縫と木工は固定基準値、調理は食材) ため、テーブルを分けると型で構造差を表現できます。
- 1レシピが1行になり、SQLから直接読み書きするときに内容を把握しやすくなります。
- レシピ共通の項目は `craft_master` に集約し、職人別テーブルはマスの値だけを持ちます。

盤面サイズはゲーム仕様で固定のため、マスの列展開でDDL変更が頻発することはありません。

## テーブル一覧

| 分類 | テーブル | 内容 |
| --- | --- | --- |
| 共通 | `craft_master` | 全職人共通のレシピ見出し。IDを発番する |
| 特性 | `smith_character` | 鍛冶3職人 (class 1-3) 共通の特性 |
| 特性 | `sewing_character` | 裁縫の特性 |
| 特性 | `wood_character` | 木工の特性 |
| 特性 | `cooking_character` | 調理の特性 |
| 食材 | `cooking_materials` | 調理の食材マスタ |
| 分類 | `tool_category` | 道具鍛冶の大項目と使用マス |
| 分類 | `weapon_category` | 武器鍛冶の大項目と使用マス |
| 分類 | `armor_category` | 防具鍛冶の大項目と使用マス |
| 分類 | `sewing_category` | 裁縫の大項目と使用マス |
| 分類 | `wood_category` | 木工の大項目と使用マス |
| 分類 | `cooking_category` | 調理の大項目 |
| レシピ | `tool_recipes` | 道具鍛冶のマス別基準範囲 |
| レシピ | `weapon_recipes` | 武器鍛冶のマス別基準範囲 |
| レシピ | `armor_recipes` | 防具鍛冶のマス別基準範囲 |
| レシピ | `sewing_recipes` | 裁縫のマス別基準値 |
| レシピ | `wood_recipes` | 木工のマス別基準値と木目 |
| レシピ | `cooking_recipes` | 調理のマス別食材と基準値 |

## 共通ルール

### 型

| 原案の型 | 採用する型 | 理由 |
| --- | --- | --- |
| `int` | `integer` | |
| `smallint` | `smallint` | 分類・特性IDなど値域の小さい列で使用する |
| `varchar` | `text` | PostgreSQLでは長さ指定に性能上の利点がない |
| `datetime` | `timestamptz` | PostgreSQLに `datetime` 型はない |
| `bool` | `boolean` | |

日時はUTCで保持する `timestamptz` とし、JSTでの表示は取得側で変換します。
DBにJST固定で保存すると、サーバーのタイムゾーン設定に依存して値がずれるためです。

### 列名

PostgreSQLは引用符なしの識別子を小文字へ畳み込むため、列名はすべて小文字で定義します。
マスを表す接尾辞も `a_min`、`value_a`、`exist_a` のように小文字にします。
本書と [レシピDBテーブル定義](./10-recipe-db-tables.md) では、盤面上の位置としてのマス名だけを大文字のA-Iで表記します。

### 監査列

全テーブルに以下を持たせます。

| 列 | 型 | 説明 |
| --- | --- | --- |
| `created_at` | timestamptz | 作成日時。既定は `now()` |
| `updated_at` | timestamptz | 最終更新日時。トリガーで自動更新 |
| `is_active` | boolean | 有効フラグ。既定は `true`、削除時に `false` |

`is_active` は原案の `delete_flg` に相当します。原案では `bool` で `TRUE` が有効のテーブルと、`smallint` で `0` が有効のテーブルが混在していたため、`boolean` に統一しました。
名前を変えたのは、`delete_flg` という名前で `TRUE` が有効だと意味が逆に読めるためです。

### ID

`craft_master.id` を全職人共通の連番とし、各 `*_recipes.id` が同じ値を主キー兼外部キーとして持つサブタイプ構成にします。

現行の文字列ID (`cooking-003`、`super-smithing-hammer` など) は `craft_master.legacy_id` に保持します。
ブラウザの `localStorage` に保存済みのレシピ選択状態と、JSONエクスポートの互換を保つためです。

### 0番のマスタ行

各特性マスタに `chara_id = 0` (なし)、各分類マスタに `category_id = 0` (未分類) を用意します。
現行データには大項目を持たないテンプレートレシピが存在するため、参照先が必要です。

## ER図

```mermaid
erDiagram
  craft_master ||--o| tool_recipes : "id"
  craft_master ||--o| weapon_recipes : "id"
  craft_master ||--o| armor_recipes : "id"
  craft_master ||--o| sewing_recipes : "id"
  craft_master ||--o| wood_recipes : "id"
  craft_master ||--o| cooking_recipes : "id"

  smith_character ||--o{ tool_recipes : "chara_id"
  smith_character ||--o{ weapon_recipes : "chara_id"
  smith_character ||--o{ armor_recipes : "chara_id"
  sewing_character ||--o{ sewing_recipes : "chara_id"
  wood_character ||--o{ wood_recipes : "chara_id"
  cooking_character ||--o{ cooking_recipes : "chara_id"

  tool_category ||--o{ tool_recipes : "category_id"
  weapon_category ||--o{ weapon_recipes : "category_id"
  armor_category ||--o{ armor_recipes : "category_id"
  sewing_category ||--o{ sewing_recipes : "category_id"
  wood_category ||--o{ wood_recipes : "category_id"
  cooking_category ||--o{ cooking_recipes : "category_id"

  cooking_materials ||--o{ cooking_recipes : "material_a..i"

  craft_master {
    integer id PK
    text legacy_id
    text name
    smallint class
    boolean archived
  }
  tool_recipes {
    integer id PK_FK
    integer category_id FK
    smallint chara_id FK
  }
  tool_category {
    integer category_id PK
    smallint row_a
    smallint col_a
  }
  cooking_recipes {
    integer id PK_FK
    integer material_a FK
    smallint group_a
    integer a_min
  }
```

## 職人の分類コード

`craft_master.class` は原案どおり1から6で、現行の職人IDと以下で対応します。

| `class` | 職人 | 現行の `craft_id` | 盤面 | マス名 |
| --- | --- | --- | --- | --- |
| 1 | 道具鍛冶 | `tool-smithing` | 4行2列 | A-H |
| 2 | 武器鍛冶 | `weapon-smithing` | 3行1列 | A-H |
| 3 | 防具鍛冶 | `armor-smithing` | 2行2列 | A-H |
| 4 | 裁縫 | `sewing` | 3行3列 | A-I |
| 5 | 木工 | `woodworking` | 3行2列 | A-I |
| 6 | 調理 | `cooking` | 3行3列 | A-I |

## マス名と座標の対応

マス名から盤面座標を決められるかは職人によって異なります。現行データで確認した結果は以下のとおりです。

| 職人 | 命名規則 | 座標の決まり方 |
| --- | --- | --- |
| 調理・裁縫・木工 | 空きマスを含む3行3列の座標順 | A=(1,1) から I=(3,3) に固定対応する |
| 鍛冶3職人 | 占有マスだけの読み順 | 固定対応しないため、分類テーブルで座標を定義する |

調理・裁縫・木工は、全レシピでマス名と3行3列の座標順が一致していました。
木工は3行2列のため、C・F・I は常に未使用です。

鍛冶では、道具鍛冶のマス名 `B` が座標 (1,2) と (2,1) の両方に、`C` が (2,1) と (3,1) の両方に現れます。
単一列のレシピを A/B/C と採番する規則 ([レシピデータ設計](./06-recipe-data.md)) があるためで、マス名だけでは座標を復元できません。

そのため鍛冶3職人の分類テーブルは、原案の `exist_a` (使用有無) ではなく `row_a` と `col_a` (座標) を持ちます。
どちらもNULLならそのマスは未使用です。裁縫・木工・調理は座標が固定のため、原案どおり `exist_*` を使います。

## 使用マスが分類で決まるか

| 職人 | 分類ごとの使用マス | 分類テーブルでの定義 |
| --- | --- | --- |
| 道具鍛冶・武器鍛冶・防具鍛冶 | 分類ごとに1種類 | 可能 |
| 裁縫・木工 | 分類ごとに1種類 | 可能 |
| 調理 | 同一分類内で4種類から11種類に分かれる | 不可。レシピごとに `*_min` がNULLかで判定する |

このため `cooking_category` は大項目名だけを持ち、使用マスの定義は持ちません。

## 未分類レシピの扱い

現行データには大項目を持たないレシピが14件あります。鍛冶4件と調理10件です。

鍛冶の分類テーブルは座標を持つため、`category_id = 0` (未分類、座標なし) のままでは盤面を復元できません。
鍛冶の未分類レシピはいずれも盤面形状のテンプレートのため、移行時に形状ごとの分類を作って割り当てます。

| 職人 | 追加する分類 | 使用マス |
| --- | --- | --- |
| 道具鍛冶 | テンプレート (縦3マス) | (1,1)、(2,1)、(3,1) |
| 道具鍛冶 | テンプレート (2×2) | (1,1)、(1,2)、(2,1)、(2,2) |
| 武器鍛冶 | テンプレート (縦3マス) | (1,1)、(2,1)、(3,1) |
| 防具鍛冶 | テンプレート (2×2) | (1,1)、(1,2)、(2,1)、(2,2) |

調理は分類で使用マスを定義しないため、未分類レシピは `category_id = 0` のままで問題ありません。

## 原案からの変更点

| # | 原案 | 変更後 | 理由 |
| --- | --- | --- | --- |
| 1 | 鍛冶の `exist_a`〜`exist_h` | `row_a`/`col_a`〜`row_h`/`col_h` | マス名から座標を復元できないため |
| 2 | `wood_recipes.grain` (レシピ単位) | `grain_a`〜`grain_i` (マス単位) | 現行データに木目が混在するレシピがあるため |
| 3 | 調理のマスに食材IDのみ | `group_a`〜`group_i` を追加 | 同一レシピ内に同じ食材の2マスグループが複数あるため |
| 4 | `cooking_recipes` の主キーが `category_id` | `id` を主キーにし、分類列を `cooking_category` へ分離 | レシピテーブルに分類テーブルの列が混在していたため |
| 5 | `delete_flg` (bool/smallintが混在) | `is_active` (boolean) | 型と意味がテーブル間で逆転していたため |
| 6 | `datetime` | `timestamptz` | PostgreSQLに `datetime` 型がないため |
| 7 | `chara_id` が参照元smallint・参照先int | 全て `smallint` | 外部キーの型を一致させるため |
| 8 | 各 `*_recipes` に `name` や `place` など | `craft_master` へ集約 | `craft_master.name` との二重管理を避けるため |
| 9 | 非表示レシピの受け皿なし | `craft_master.archived` を追加 | 現行の `archived: true` を表現するため |
| 10 | 連番IDのみ | `legacy_id` と `sort_order` を追加 | 現行の文字列IDとJSON配列順を保持するため |
| 11 | `cooking_materials.next` ("ver"/"hori") | `pair_direction` (`vertical`/`horizontal`) | 現行データの表記に合わせるため |
| 12 | `cooking_materials.images` がunique | uniqueを外す | 複数の食材が同じ画像を使う場合に登録できなくなるため |

## 原案から変えなかった点

現行データで妥当性を確認できたため、以下は原案どおりとします。

- 調理のマスに `optionId` (`center`/`corner`/`cross`) を持たない。座標から一意に決まります (中央=center、四隅=corner、それ以外=cross)。
- 調理の基準値は `*_min` だけを持ち、最大は `min + 30` として算出する。現行の全133マスで幅が30でした。
- 鍛冶は `*_min` と `*_max` の両方を持つ。幅が0から16までばらついており、算出できません。
- 裁縫と木工は `value_*` だけを持つ。固定基準値のため範囲を持ちません。

## エクスポート時に再生成する項目

以下は現行JSONで値が統一されていないため、DBには保持せずエクスポート時に規則で再生成します。
JSONはコミット対象から外すため、再生成による差分は問題になりません。

| 項目 | 現行データの状態 | 再生成の規則 |
| --- | --- | --- |
| `items[].id` | `part-1`、`item-1`、`slot-3-2` が混在 | 使用マスの読み順で `part-1` から採番 |
| `items` の並び順 | 道具鍛冶の2レシピが座標順でない | 座標の読み順 (行→列) |
| `items[].ingredientGroupId` | `battle-steak-meat-top` などレシピ固有の文字列 | レシピ内の出現順で `group-1` から採番 |
| 鍛冶の `items[].target` | 道具鍛冶の46マスで欠落 | `ceil((下限 + 上限) / 2)` で算出 |
| `traitId` が `none` | 道具鍛冶の1レシピ | 特性なし (`chara_id = 0`) として出力しない |

鍛冶の `target` を保持しないのは、下限と上限から算出できるためです。
現行の全11マスで `ceil((下限 + 上限) / 2)` と一致し、判定には下限と上限を使うため ([レシピデータ設計](./06-recipe-data.md))、値が増えても挙動は変わりません。

## 基準値の導出

| 職人 | 保持する列 | `target` | `successMin` | `successMax` |
| --- | --- | --- | --- | --- |
| 鍛冶3職人 | `*_min`、`*_max` | `ceil((min + max) / 2)` | `min` | `max` |
| 裁縫・木工 | `value_*` | `value` | `value` | `value` |
| 調理 | `*_min` | `min + 15` | `min` | `min + 30` |

現行データの全マスでこの規則が成立することを確認済みです。

## 現行JSONとのマッピング

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

検証用DBにマイグレーションを適用し、現行の6職人・70レシピ・303マスで往復を確認しました。

| 検証 | 結果 |
| --- | --- |
| DDLの適用 | 成功 (18テーブル) |
| 全件投入 | 成功。制約違反0件 |
| 分類内でのマス名と座標の矛盾 | 0件 |
| ラウンドトリップ (JSON → DB → JSON) | 全6職人で一致 |

比較は、上記「エクスポート時に再生成する項目」を両側で揃えたうえで行っています。

## 未決事項

- 単価、必要素材の個数、錬金素材は別テーブルで後付けします。単価は取得日時付きで持つと、バザーからの自動取得へ移行しやすくなります。
- 木工と裁縫の特性は未整理のため、当面は `chara_id = 0` (なし) だけを使います。
- 調理の基準値幅が30以外のレシピが見つかった場合は、`*_max` 列の追加を検討します。

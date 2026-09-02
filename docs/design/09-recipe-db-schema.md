# レシピDB設計

## 目的

レシピデータをPostgreSQLで管理するための設計です。

各テーブルの列定義は [レシピDBテーブル定義](./10-recipe-db-tables.md)、現行JSONとの相互変換は [レシピDB変換仕様](./12-recipe-db-conversion.md)、移行の進め方は [レシピDB移行設計](./08-recipe-db-migration.md)、レシピ項目の意味は [レシピデータ設計](./06-recipe-data.md) を参照します。

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

### 削除方式

レシピの削除は論理削除とします。`DELETE /api/crafts/{craftId}/recipes/{recipeId}` は `craft_master.is_active` を `false` に更新します。

- 一覧取得では `is_active = true` の行だけを返します。
- 職人別レシピテーブルの行は残したままにします。復元時に基準値を再入力せずに済むためです。
- 外部キーの `ON DELETE CASCADE` は、SQLで物理削除した場合に子行を残さないための保険です。通常の運用では発生しません。
- `legacy_id` と `UNIQUE (class, name)` は論理削除後も残るため、同名レシピを作り直す場合は既存行を `is_active = true` へ戻します。

### ID

`craft_master.id` を全職人共通の連番とし、各 `*_recipes.id` が同じ値を主キー兼外部キーとして持つサブタイプ構成にします。

現行の文字列ID (`cooking-003`、`super-smithing-hammer` など) は `craft_master.legacy_id` に保持します。
ブラウザの `localStorage` に保存済みのレシピ選択状態と、JSONエクスポートの互換を保つためです。

### 職人とレシピテーブルの対応

`craft_master.class` と職人別レシピテーブルの対応は、識別子付きの外部キーで保証します。

- `craft_master` に `UNIQUE (id, class)` を持たせます。
- 各職人別テーブルは `class` 列を持ち、`CHECK (class = <固定値>)` で自職人に固定します。
- 外部キーは `(id, class)` の複合で `craft_master` を参照します。

これにより、調理の見出しに `tool_recipes` を紐付けたり、同一IDを複数の職人別テーブルへ登録したりできなくなります。

見出しだけを作って職人別テーブルに行がない状態は、この方式では防げません。投入スクリプトとAPIが両方を同一トランザクションで書くことで担保し、DB制約での強制は未決事項とします。

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
| 1 | 道具鍛冶 | `tool-smithing` | 大項目ごとに異なる。最大4行2列 | A-H |
| 2 | 武器鍛冶 | `weapon-smithing` | 大項目ごとに異なる。最大4行2列 | A-H |
| 3 | 防具鍛冶 | `armor-smithing` | 大項目ごとに異なる。最大4行2列 | A-H |
| 4 | 裁縫 | `sewing` | 3行3列 | A-I |
| 5 | 木工 | `woodworking` | 3行3列 | A-I |
| 6 | 調理 | `cooking` | 3行3列 | A-I |

盤面サイズは `app/crafts/<職人>/config.js` の `layout` と `recipeCategoryOptions[].templateItems` が正です。
鍛冶3職人は大項目ごとに盤面が変わり、フライパン・両手剣・からだ下の4行2列が最大です。

## マス名と座標の対応

マス名から盤面座標を決められるかは職人によって異なります。現行データで確認した結果は以下のとおりです。

| 職人 | 命名規則 | 座標の決まり方 |
| --- | --- | --- |
| 調理・裁縫・木工 | 空きマスを含む3行3列の座標順 | A=(1,1) から I=(3,3) に固定対応する |
| 鍛冶3職人 | 占有マスだけの読み順 | 固定対応しないため、分類テーブルで座標を定義する |

調理・裁縫・木工は、全レシピでマス名と3行3列の座標順が一致していました。
現行の木工レシピは2列目までしか使っていませんが、盤面自体は3行3列のため、3列目を使うレシピも登録できます。

鍛冶では、道具鍛冶のマス名 `B` が座標 (1,2) と (2,1) の両方に、`C` が (2,1) と (3,1) の両方に現れます。
単一列のレシピを A/B/C と採番する規則 ([レシピデータ設計](./06-recipe-data.md)) があるためで、マス名だけでは座標を復元できません。

そのため鍛冶3職人の分類テーブルは、原案の `exist_a` (使用有無) ではなく `row_a` と `col_a` (座標) を持ちます。
どちらもNULLならそのマスは未使用です。裁縫・木工・調理は座標が固定のため、原案どおり `exist_*` を使います。

### 分類テーブルの投入元

分類の使用マスは、以下の優先順位で決めます。

| 状態 | 投入元 |
| --- | --- |
| その分類にレシピが登録済み | 実レシピの使用マス |
| レシピが未登録 | `app/crafts/<職人>/config.js` の `recipeCategoryOptions[].templateItems` |

職人設定の `templateItems` はレシピ追加時の初期マスであり、実際の盤面と一致するとは限りません。
現行データでは `tool-smithing` のフライパンが該当し、設定は4行2列の8マス、実レシピ3件はいずれも7マス ((4,2) を使わない) でした。
このため、両者が食い違う場合は実レシピを優先し、投入時に警告を出します。

武器鍛冶の10分類と防具鍛冶の5分類はレシピが未登録のため、職人設定の値で登録します。実レシピの追加時に見直します。

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

## DDLで強制しない整合性

以下は制約トリガーが必要になるため、DDLでは強制せず、投入スクリプトとAPIの検証で担保します。
SQLで直接登録する場合は、これらを崩さないよう注意が必要です。

| 項目 | 担保する場所 |
| --- | --- |
| 見出しに対応する職人別テーブルの行がちょうど1件あること | 投入スクリプトとAPIのトランザクション |
| 鍛冶の分類内で同じ座標を複数のマスへ割り当てないこと | 投入スクリプトの検証 |
| 分類が定める使用マスと、レシピ側の値のNULL性が一致すること | 投入スクリプトとAPIの検証 |
| 調理の食材グループが、同一食材の隣接2マスちょうどであること | 投入スクリプトとAPIの検証 |

食材グループについては、現行のJSON方式でも同等の制約はなく、画面側で「同じグループが3マス以上ある場合は結合食材として扱わない」と防御しています ([レシピデータ設計](./06-recipe-data.md))。移行によって保証の水準は下がりません。

## 未決事項

- 上記4項目を制約トリガーでDBに強制するか。SQL直接登録の頻度が上がった段階で再検討します。
- 単価、必要素材の個数、錬金素材は別テーブルで後付けします。単価は取得日時付きで持つと、バザーからの自動取得へ移行しやすくなります。
- 木工と裁縫の特性は未整理のため、当面は `chara_id = 0` (なし) だけを使います。
- 調理の基準値幅が30以外のレシピが見つかった場合は、`*_max` 列の追加を検討します。

# レシピデータ設計

## 目的

主要なレシピの基準値と成功範囲を、職人ごとのJSONで管理します。

画面側はレシピを選ぶだけで、マス名、配置、基準値、成功下限、成功上限を読み込みます。

## ファイル配置

API側:

```text
api/data/
  catalog.json
  crafts/cooking/recipes.json
  crafts/weapon-smithing/recipes.json
  crafts/armor-smithing/recipes.json
  crafts/tool-smithing/recipes.json
  crafts/sewing/recipes.json
  crafts/woodworking/recipes.json
```

フロント側:

```text
app/crafts/<職人>/recipes.js
```

フロント側の `recipes.js` は、APIが使えない場合のフォールバックです。

## API

| API | 用途 |
| --- | --- |
| `GET /health` | API起動確認 |
| `GET /api/crafts` | 職人一覧 |
| `GET /api/recipes` | 全職人のレシピ一覧 |
| `GET /api/crafts/{craftId}/recipes` | 指定職人のレシピ一覧 |

## JSON形式

```json
[
  {
    "id": "cooking-3x3-standard",
    "name": "9マス料理テンプレート",
    "traitId": "light",
    "items": [
      {
        "id": "slot-5",
        "name": "中央",
        "optionId": "center",
        "gridCell": { "row": 2, "column": 2 },
        "current": 0,
        "target": 68,
        "successMin": 60,
        "successMax": 75
      }
    ]
  }
]
```

## 項目の意味

| 項目 | 意味 |
| --- | --- |
| `id` | レシピまたはマスの内部ID |
| `name` | 画面表示名 |
| `archived` | `true` の場合、データは保持するがレシピ選択に表示しない |
| `traitId` | 調理レシピの特性 |
| `items` | レシピに含まれるマス一覧 |
| `optionId` | 調理の場所、木工の木目 |
| `gridCell` | 盤面上の位置 |
| `current` | 初期現在値 |
| `target` | 会心発生時に止まる誤差0の基準値 |
| `successMin` | 成功範囲の下限 |
| `successMax` | 成功範囲の上限 |
| `ingredientGroupId` | 調理で同時に移動する食材グループID |
| `ingredientGroupLabel` | 食材グループの画面表示名 |
| `ingredientSize` | 同一食材グループのマス数 |

## 調理レシピの特性

調理職人では、レシピごとに4ターンごとの特性を `traitId` で管理します。

| ID | 意味 |
| --- | --- |
| `light` | 光 |
| `light-return` | 光・戻り |
| `recovery` | 回復 |

旧データ互換として、`none` は `light`、`return` は `recovery` に正規化します。
全レシピの実特性確認は GitHub issue #11 で追跡します。

詳細な挙動は [調理職人メモ](../crafts/cooking.md) を参照します。

## 複数マス食材

調理職人には、1マス食材と2マス食材があります。

複数マス食材は、同一食材を構成するマスをグループとして扱います。
2マス食材として扱う種類は肉と魚の切り身だけです。
同じ `ingredientGroupId` を持つマスが3つ以上ある場合は、データ不整合として結合食材扱いにしません。

使用フィールド:

```json
{
  "ingredientGroupId": "meat-1",
  "ingredientGroupLabel": "肉",
  "ingredientSize": 2
}
```

肉または魚の切り身で、`ingredientGroupId` が同じマスがちょうど2つある場合、フライパン配置で移動、入れ替えを同時に行います。
入れ替え時はクリックした片方のマスではなく、グループ全体の左上位置を基準に上下または左右の並びをまとめて交換します。
方向指定の入れ替えでは、隣が1マス食材で相手も1マス移動で収まる場合、結合食材が空けたマスへ相手を移して交換します。
移動先が空白のみ、または相手食材が1マス移動で入れ替われる場合は、結合食材の形を維持して移動します。
相手食材が2マス以上移動する必要がある配置では交換不可とします。
テンキー配置の `1,2` が肉、`3` が野菜の場合、肉を右へ動かすと野菜が左へ2マス移動するため交換不可です。
移動先に別の `ingredientGroupId` の一部だけが含まれる場合は、相手グループを分断しないため交換不可とします。
テンキー配置の `2,3` から上へ動く先が `5,6` で、`5` が `4,5` グループの一部、`6` が1マス食材の場合は交換不可です。
ブラウザ操作での代表ケース確認は GitHub issue #12 で追跡します。

レシピ実データへ追加する場合は [調理職人メモ](../crafts/cooking.md) と合わせて更新します。

## 調理食材画像

調理のフライパン配置は3x3の長方形グリッドとして表示します。
各マスでは、`ingredientGroupLabel` を食材画像のキーとして使います。
画像専用フィールドは持たず、レシピデータの食材分類を表示にも流用します。

対応する `ingredientGroupLabel`:

- `肉`
- `魚の切り身`
- `野菜`
- `麺`
- `卵`

`ingredientGroupLabel` が空の場合、表示側では食材画像を出しません。
レシピの `categoryId` や名前だけではマスごとの食材種別を断定できないため、カテゴリ単位の推定は行いません。

配置移動などでレシピが手入力扱いになった場合も、明示済みの `ingredientGroupLabel` は保持し、対応する画像を継続表示します。

分類できない場合は画像を表示せず、配置、現在値、基準値の表示を優先します。

盤面セルでは、画像、現在値、判定基準、判定ステータスを別行で表示します。
判定基準は中段左右を含む全マスで表示し、狭い画面でも非表示にしません。
縦長の食材画像はセル内の画像領域に収め、画像に含まれる隣接セルの端は表示側でクリップします。

## 調理光効果

`光` と `光・戻り` の表示状態は1ターン効果として保存します。
`光` は各食材の `isGlowing` で管理し、盤面セル内の光ボタンで各マスを切り替え、全解除操作で全マスを `false` にします。
`光・戻り` は `cookingEffectMode` で管理します。
1ターン効果のため、レシピ切替、特性切替、保存状態の読み込みでは `none` に戻します。
光効果の手動操作は盤面履歴に含め、Undo/Redoで直前の効果状態へ戻します。

| 値 | 意味 |
| --- | --- |
| `none` | 効果なし |
| `cross-glow` | 上下左右が光る |
| `corner-return` | 四隅が戻り |

## 調理火力状態

`強火焼き` と `弱火焼き` の4ターン継続状態は、既存の `heat` で管理します。
盤面上部の火力切替ボタンは基本設定の火力状態と同じ値を更新します。

| 値 | 意味 |
| --- | --- |
| `normal` | 通常 |
| `strong` | 強火焼き中 |
| `half` | 弱火焼き中 |

## 画面動作

```mermaid
sequenceDiagram
  participant User as ユーザー
  participant UI as UI
  participant API as API
  participant Fallback as recipes.js
  participant Engine as 計算エンジン

  UI->>API: GET /api/recipes
  alt API成功
    API-->>UI: レシピJSON
  else API失敗
    UI->>Fallback: フォールバックデータを使用
  end
  User->>UI: レシピを選択
  UI->>UI: マス一覧と盤面を置き換える
  UI->>Engine: 新しい状態を評価
  Engine-->>UI: 判定結果を返す
```

## 会心停止

会心発生時は威力を2倍で計算し、その結果が基準値へ届く場合は、超過せず基準範囲内で止まるものとして判定します。
調理職人では現在火力を参照し、現在位置または光マスの位置別ダメージ最小値、最大値と、基準下限から基準上限までの範囲を比較して判定します。

例:

- 現在値: `60`
- 基準値: `68`
- 会心後の生範囲: `84 - 96`
- 表示上の会心後: `68 - 68`

## 手入力との関係

レシピ選択後に以下を変更すると、レシピ選択は「手入力」扱いになります。

- マス名
- 場所や木目
- 基準値
- 成功下限
- 成功上限
- マス追加
- マス削除

現在値だけを変更した場合は、選択中レシピを維持します。

調理職人では、レシピ数が少なくプリセット運用できるため、通常のレシピ選択欄に「手入力」項目は表示しません。
他職人では未登録レシピを扱う可能性があるため、手入力導線を残します。

## 保守ルール

- 実レシピの数値は `api/data/crafts/<職人>/recipes.json` に記載します。
- UIや計算エンジンにレシピ名を直書きしません。
- 表示対象外だが履歴として残すレシピは削除せず、`archived: true` を付けます。
- 実数値の出典がある場合は、対象JSONと同じディレクトリにメモを追加します。
- 不明な実数値を断定しません。
- テンプレート値は、実レシピ値に置き換える前提で管理します。
- 道具鍛冶の大項目は `tool-smithing/config.js` の `recipeCategoryOptions` で管理し、小項目の具体的な制作物はレシピJSONに追加します。
- 道具鍛冶の小項目が未登録の間は、テンプレートレシピを `archived: true` として非表示にします。

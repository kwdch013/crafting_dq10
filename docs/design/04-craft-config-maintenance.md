# 職人設定の保守方法

## 目的

職人ごとの細かな数値を、UIや共通エンジンから分離して管理します。

これにより、職人追加や特技調整を `app/crafts/<職人>/config.js` の変更だけで行いやすくします。

## ディレクトリ構成

```text
app/crafts/
  registry.js
  shared/cooking-damage.js
  shared/smithing-component.js
  shared/smithing-damage.js
  shared/sewing-damage.js
  shared/woodworking-damage.js
  cooking/component.js
  cooking/config.js
  weapon-smithing/config.js
  armor-smithing/config.js
  tool-smithing/config.js
  sewing/component.js
  sewing/config.js
  woodworking/component.js
  woodworking/config.js
```

## 設定ファイルの役割

各 `config.js` は `registerDQ10Craft()` を呼び出して職人設定を登録します。

設定する主な項目:

- `id`: 職人ID
- `label`: UI表示名
- `modeLabel`: 画面上部の補足表示
- `recipeLabel`: 品目名ラベル
- `itemSectionTitle`: 入力表の見出し
- `itemNameLabel`: マス名のラベル
- `addItemLabel`: 追加ボタンの文言
- `resourceLabel`: 集中力などのリソース名
- `defaultRecipeName`: 初期品目名
- `defaultFocus`: 初期集中力
- `focus`: レベル別集中力と道具補正
- `heatStates`: 火力や状態の選択肢
- `techniques`: 特技一覧
- `itemOptions`: マスや具材ごとの種別選択肢
- `items`: 初期マス一覧

調理の位置別ダメージは `shared/cooking-damage.js` に分離します。
鍛冶系の温度別ダメージは `shared/smithing-damage.js` に分離します。
各職人の `config.js` には、特技が参照するIDだけを設定します。
裁縫と木工の基礎データも `shared/` 配下に分離します。

## コンポーネントファイルの役割

職人固有の画面差分は `app/crafts/<職人>/component.js` に分離します。
例として、調理の特性メモ、食材画像、光・戻り、封じ効果、盤面右クリック編集は `cooking/component.js` が担当します。

武器鍛冶、防具鍛冶、道具鍛冶は同じ鍛冶系の画面構造を使うため、`shared/smithing-component.js` で共通化します。
各鍛冶職人の `config.js` は `createDQ10SmithingCraftConfig()` に職人固有のラベル、特技、初期マスを渡します。

関数、定数、設定定義を追加または変更する場合は、日本語コメントで目的を記載します。

## 特技設定

特技は以下の形式で定義します。

```js
{
  id: "aim",
  name: "ねらい焼き",
  focusCost: 16,
  normalMin: 10,
  normalMax: 14,
  criticalMin: 20,
  criticalMax: 28,
  criticalWeight: 1.8
}
```

### 各項目の意味

| 項目 | 意味 |
| --- | --- |
| `id` | 特技の内部ID |
| `name` | UI表示名 |
| `focusCost` | 消費集中力 |
| `normalMin` | 通常時の最小増加値 |
| `normalMax` | 通常時の最大増加値 |
| `criticalMin` | 会心時の最小増加値 |
| `criticalMax` | 会心時の最大増加値 |
| `criticalWeight` | 候補手評価で会心を重視する係数 |

調理の特技は以下の形式で定義します。

```js
{
  id: "strong",
  name: "強火焼き",
  focusCost: DQ10CookingDamage.actions.strong.focusCost,
  damageModel: "cooking-fixed",
  actionId: "strong",
  multiplier: DQ10CookingDamage.actions.strong.multiplier,
  criticalMultiplier: DQ10CookingDamage.actions.strong.criticalMultiplier,
  criticalWeight: 0.9
}
```

調理の共有データは、極限攻略の「調理職人」のダメージ表を参照して作成しています。
中央、上下左右、四隅ごとに、通常、強火、強火半減の値を保持します。

```js
center: {
  normal: [12, 18],
  strong: [18, 27],
  half: [9, 14]
}
```

配列は `[最小値, 最大値]` です。
実際の7候補値は `distributions` に保持します。

鍛冶系の特技は以下の形式で定義します。

```js
{
  id: "double",
  name: "2倍打ち",
  focusCost: 8,
  damageModel: "smithing-temperature",
  powerId: "power_2_0",
  multiplier: 2,
  criticalMultiplier: 2,
  criticalWeight: 0.9
}
```

`powerId` は `shared/smithing-damage.js` の威力キーに対応します。

## 鍛冶ダメージ設定

鍛冶系の基礎ダメージと威力別範囲は、以下の形式で定義します。

```js
1000: {
  normal: [12, 18],
  power_1_2: [15, 22],
  power_2_0: [24, 36]
}
```

配列は `[最小値, 最大値]` です。
7通りの候補値は保持せず、判定に必要な最小値と最大値だけを保持します。

現在の鍛冶ダメージ表は、極限攻略の「鍛冶職人の温度別数値ダメージ」を参照して作成しています。

## 裁縫ダメージ設定

裁縫の基礎データは `shared/sewing-damage.js` に定義します。

```js
normal: {
  sew: [
    { value: 12, percent: 14.3 },
    { value: 13, percent: 14.3 }
  ]
}
```

`value` はダメージ量、`percent` は参考確率です。

現在の裁縫データは `https://dqxx.xyz/dq10-sewing-numerical-table/` を参照して作成しています。

## 木工ダメージ設定

木工の基礎データは `shared/woodworking-damage.js` に定義します。

```js
parallel: {
  normal: [
    { value: 12, weight: 1 },
    { value: 13, weight: 1 }
  ]
}
```

`parallel` は順目です。
`vertical` は逆目です。

ユーザー向けには、順目を並行、逆目を垂直として扱います。

現在の木工データは `https://xn--10-yg4a1a3kyh.jp/dq10_artisan4.html` を参照して作成しています。

## 集中力設定

集中力は以下の形式で定義します。

```js
focus: createDQ10FocusConfig({
  defaultFocus: 120,
  defaultLevel: 80,
  defaultToolId: "frying-pan",
  defaultStars: 3,
  levels: [
    { level: 80, focus: 120 }
  ],
  toolTypes: [
    {
      id: "frying-pan",
      label: "フライパン",
      focusBonusByStars: { 0: 0, 1: 0, 2: 0, 3: 0 }
    }
  ]
})
```

### 各項目の意味

| 項目 | 意味 |
| --- | --- |
| `defaultLevel` | 初期選択する職人レベル |
| `defaultToolId` | 初期選択する道具種類 |
| `defaultStars` | 初期選択する道具の★数 |
| `levels` | レベル別の基礎集中力 |
| `toolTypes` | 道具種類と★数ごとの集中力補正 |

画面の集中力は `levels` の基礎集中力と `focusBonusByStars` の補正値を足して算出します。
`focusBonus` を指定した道具は、全ての★で同じ集中力加算になります。

鍛冶と調理の確認済み集中力は `app/crafts/registry.js` の共有表で管理します。
Lv76-80 は未確認のため、暫定的に Lv75 以降を各レベル +2 として登録します。

## 初期マス設定

初期マスは以下の形式で定義します。

```js
{
  id: "slot-1",
  name: "具材 1",
  current: 0,
  successMin: 60,
  successMax: 75
}
```

### 各項目の意味

| 項目 | 意味 |
| --- | --- |
| `id` | マスの内部ID |
| `name` | UI表示名 |
| `current` | 初期現在値 |
| `successMin` | 成功下限 |
| `successMax` | 成功上限 |

## 新しい職人を追加する手順

1. `app/crafts/<new-craft>/config.js` を作成します。
2. 既存の `config.js` を参考に `registerDQ10Craft()` を定義します。
3. `app/index.html` に読み込み用の `<script>` を追加します。
4. `docker compose up --build -d` で再ビルドします。
5. 画面の職人種別に追加されていることを確認します。

## 数値調整の手順

1. 対象職人の `config.js` を開きます。
2. `techniques` の数値を変更します。
3. 必要に応じて `focus` のレベル別集中力と道具補正を変更します。
4. 必要に応じて `items` の成功範囲を変更します。
5. ブラウザを更新します。
6. 反映されない場合は、ブラウザキャッシュまたはlocalStorageを確認します。

特技ダメージは画面上では編集できません。
固定値の保守は設定ファイルに集約します。
集中力も画面上では編集できません。

## 注意点

- `id` は職人内で重複させないでください。
- `normalMin` は `normalMax` 以下にしてください。
- `criticalMin` は `criticalMax` 以下にしてください。
- `levels` の `level` は重複させないでください。
- `toolTypes` の `id` は職人内で重複させないでください。
- 成功範囲の下限と上限を逆に入力しても共通エンジン側で補正しますが、設定ファイルでは正しい順序で書いてください。
- Importファイルに古い特技数値や集中力が含まれていても、現在の実装では職人別 `config.js` の特技数値と集中力設定を優先します。

## 将来の拡張

職人固有の特殊ルールが増えた場合は、以下のどちらかで対応します。

- 共通エンジンに設定可能な評価ルールを追加する
- `app/crafts/<職人>/engine.js` を追加して職人別エンジンに分離する

まずは設定で吸収し、共通化できない差分だけを職人別エンジンへ移します。

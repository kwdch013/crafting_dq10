# GitHub Issues

## 目的

現状の問題点と残タスクをGitHub issueで管理します。

リポジトリ:

```text
https://github.com/kwdch013/crafting_dq10
```

## ラベル運用

issueには対象領域に応じてラベルを付与します。

- `調理職人`
- `武器鍛冶`
- `防具鍛冶`
- `道具鍛冶`
- `裁縫`
- `木工`
- `共通`
- `その他`

複数職人にまたがる基盤、API、ドキュメント、テストは `共通` を使います。

## 登録済みIssue

| Issue | タイトル | 明細 |
| ---: | --- | --- |
| #1 | 実レシピ別の基準値と成功範囲を収集する | [common.md](issues/common.md) |
| #2 | 集中力データを実値へ置き換える | [common.md](issues/common.md) |
| #3 | 特技データの網羅性を確認する（2026-08-25 close済み） | [common.md](issues/common.md) |
| #4 | APIへ計算処理を移すか判断する（2026-08-25 close済み） | [common.md](issues/common.md) |
| #5 | ブラウザE2Eテストを追加する | [common.md](issues/common.md) |
| #6 | 調理職人: 会心固定状態を管理する（2026-07-09 close済み） | [cooking-1-29.md](issues/cooking-1-29.md) |
| #7 | 調理職人: ミラクルグリルの必殺処理を実装する | [cooking-1-29.md](issues/cooking-1-29.md) |
| #8 | 調理職人: 混ぜ合わせで会心固定を解除する | [cooking-1-29.md](issues/cooking-1-29.md) |
| #9 | 調理職人: 特性のターン効果を計算へ反映する | [cooking-1-29.md](issues/cooking-1-29.md) |
| #10 | 調理職人: 2マス食材をグループとして移動・判定する | [cooking-1-29.md](issues/cooking-1-29.md) |
| #11 | 調理職人: レシピ特性の実データ割り当てを検証する | [cooking-1-29.md](issues/cooking-1-29.md) |
| #12 | 調理職人: 複数マス食材の方向入れ替えをブラウザ操作で検証する | [cooking-1-29.md](issues/cooking-1-29.md) |
| #13 | 調理職人: 画面取得時に素材と初期位置の対応を判別できるようにする | [cooking-1-29.md](issues/cooking-1-29.md) |
| #16 | 調理職人: 食材画像の見切れと光効果オンオフを修正する | [cooking-1-29.md](issues/cooking-1-29.md) |
| #21 | 調理職人: 配置移動後に推定食材画像が消える | [cooking-1-29.md](issues/cooking-1-29.md) |
| #23 | 調理職人: 初期表示の食材画像がカテゴリ推定で全て肉になる | [cooking-1-29.md](issues/cooking-1-29.md) |
| #25 | 調理職人: ミラクルグリルの2マス食材適用と固定判定を追加する | [cooking-1-29.md](issues/cooking-1-29.md) |
| #29 | 調理職人: バトルパッツァのレシピデータを追加する | [cooking-1-29.md](issues/cooking-1-29.md) |
| #31 | 共通: 他職人向けの追加レシピを名前付き保存する（2026-07-09 close済み） | [common.md](issues/common.md) |
| #36 | 共通: 通常の会心候補が偽会心の可能性ありと表示される（2026-07-09 close済み） | [common.md](issues/common.md) |
| #38 | 調理職人: 調理の会心判定を基準範囲30幅の分類に合わせる（2026-07-09 close済み） | [cooking-38-147.md](issues/cooking-38-147.md) |
| #40 | 調理職人: 調理の偽会心表示分類を整理する | [cooking-38-147.md](issues/cooking-38-147.md) |
| #43 | 調理職人: 調理ダメージを位置と火力の表参照に統一する | [cooking-38-147.md](issues/cooking-38-147.md) |
| #45 | 調理職人: 調理の特技データ表示を必殺のみにする | [cooking-38-147.md](issues/cooking-38-147.md) |
| #50 | 調理職人: 火力変更後に盤面の会心判定表示が更新されない | [cooking-38-147.md](issues/cooking-38-147.md) |
| #53 | 調理職人: 右クリック編集の固定条件と枠外更新を修正する | [cooking-38-147.md](issues/cooking-38-147.md) |
| #66 | 鍛冶職人: 温度・特性・必殺を含む鍛冶基盤機能を整備する（2026-07-09 close済み） | [smithing.md](issues/smithing.md) |
| #77 | 道具鍛冶: ハンマーのレシピ配置を修正する | [smithing.md](issues/smithing.md) |
| #83 | 道具鍛冶: 素材テンプレートを左右縦3マスに修正する | [smithing.md](issues/smithing.md) |
| #84 | 鍛冶職人: 温度別倍率順とBOARD判定を修正する | [smithing.md](issues/smithing.md) |
| #86 | 鍛冶職人: 地金特性の倍半・戻り・集中変化を追加する | [smithing.md](issues/smithing.md) |
| #88 | 鍛冶職人: 戻り予告と光地金ノード操作を修正する | [smithing.md](issues/smithing.md) |
| #93 | 鍛冶職人: 右クリック編集の固定するを確定済みにする | [smithing.md](issues/smithing.md) |
| #100 | 鍛冶職人: 光地金の切替でノードサイズが変わる | [smithing.md](issues/smithing.md) |
| #105 | 鍛冶職人: BOARDに地金特性の現在状態を表示しダメージ表へ反映する | [smithing.md](issues/smithing.md) |
| #107 | 鍛冶職人: 特性状態表示で温度変更時にレイアウトが上下しないようにする | [smithing.md](issues/smithing.md) |
| #109 | 鍛冶職人: 必殺ヘパイトスの火種を実装する | [smithing.md](issues/smithing.md) |
| #111 | 鍛冶職人: ヘパイトスの火種を会心範囲判定へ修正する | [smithing.md](issues/smithing.md) |
| #118 | 共通: 設定分類とドキュメント最新化 | [common.md](issues/common.md) |
| #122 | 鍛冶職人: 会心時確定が偽会心ケースを含む（基準値未到達の偽会心ケースを確定扱いにしない） | [smithing.md](issues/smithing.md) |
| #124 | 鍛冶職人: ゲージ突入判定の優先順位を通常時超過リスク後にする | [smithing.md](issues/smithing.md) |
| #126 | 裁縫・木工: 固定基準値向けの判定基準を分離する | [sewing-woodworking.md](issues/sewing-woodworking.md) |
| #128 | 裁縫・木工: 不要な判定表示を除外し職人別判定フローを文書化する | [sewing-woodworking.md](issues/sewing-woodworking.md) |
| #134 | 裁縫・木工: 判定基準の凡例に「通常チャンス」が残っている | [sewing-woodworking.md](issues/sewing-woodworking.md) |
| #136 | 裁縫・木工: 倍率別チャンス判定と基準値付近・全体誤差を表示する | [sewing-woodworking.md](issues/sewing-woodworking.md) |
| #138 | 木工職人: ダメージ表・発生確率を修正し右クリックでくさびを切り替える | [sewing-woodworking.md](issues/sewing-woodworking.md) |
| #144 | 道具鍛冶: レシピに旧仕様の「1行1列」マス名が表示に残る | [smithing.md](issues/smithing.md) |
| #145 | 共通: 鍛冶職人に光マスを一括で変更するボタンを追加 | [common.md](issues/common.md) |
| #146 | 調理職人: 上下左右・半減分布の転記誤りと会心境界ドキュメントの不整合 | [cooking-38-147.md](issues/cooking-38-147.md) |
| #147 | 調理職人: 要確認 光マス強火の候補値56は実測では54の可能性 | [cooking-38-147.md](issues/cooking-38-147.md) |
| #154 | 共通: ユーザーレシピがAPI修正後もブラウザ保存の旧版で表示される | [common.md](issues/common.md) |
| #155 | 共通: 鍛冶職人と調理職人のBOARDノードに基準範囲を表示する | [common.md](issues/common.md) |
| #159 | 裁縫: BOARD上でぬいパワーを切り替えられるようにする | [sewing-woodworking.md](issues/sewing-woodworking.md) |
| #160 | 裁縫: ぬいパワー「会心×2」を追加する | [sewing-woodworking.md](issues/sewing-woodworking.md) |
| #161 | 裁縫: 次ターンのぬいパワーを入力し候補手へ反映する | [sewing-woodworking.md](issues/sewing-woodworking.md) |
| #162 | 裁縫: 再生布をぬいパワーから独立した布状態として扱う | [sewing-woodworking.md](issues/sewing-woodworking.md) |
| #172 | 共通: GitHub Pages でフロントを静的サイトとして公開する | [common.md](issues/common.md) |
| #174 | 共通: ポート番号等を .env で設定可能にする（2026-08-25 close済み） | [common.md](issues/common.md) |
| #176 | 共通: ページアイコン (favicon) を追加する（2026-07-20 close済み） | [common.md](issues/common.md) |
| #179 | 共通: パネル配置を変更し、特技データとダメージ表示を右側で大きく表示する（2026-07-20 close済み） | [common.md](issues/common.md) |
| #180 | 裁縫: ほぐしのマイナスダメージを赤字で表示する（2026-07-20 close済み） | [sewing-woodworking.md](issues/sewing-woodworking.md) |
| #183 | 共通: 候補手パネルを一時的に非表示にする（2026-07-20 close済み） | [common.md](issues/common.md) |
| #188 | 共通: 別端末のブラウザから API へ接続できずレシピ登録・参照ができない（2026-07-23 対応） | [common.md](issues/common.md) |
| #192 | 鍛冶職人: BOARD上部に温度±200℃ボタンを追加 | [smithing.md](issues/smithing.md) |
| #194 | 鍛冶職人: ±50℃の温度操作をBOARD温度欄へ移動する | [smithing.md](issues/smithing.md) |
| #196 | 防具・道具鍛冶: 獅子王の大盾とあくまのツボのレシピを登録する | [smithing.md](issues/smithing.md) |
| #200 | 共通: PR #199 の CodeQL セキュリティ警告を解消する | [common.md](issues/common.md) |
| #215 | レシピデータのPostgreSQL移行設計を作成する | [recipe-db.md](issues/recipe-db.md) |
| #216 | レシピDB移行 段階1: DB基盤の追加 | [recipe-db.md](issues/recipe-db.md) |
| #217 | レシピDB移行 段階2: 保存先の切り替え | [recipe-db.md](issues/recipe-db.md) |
| #218 | レシピDB移行 段階3a: 分類・特性・食材マスタの参照APIを追加する | [recipe-db.md](issues/recipe-db.md) |
| #219 | レシピDB移行 段階3b: 分類の選択肢をAPI由来へ移す | [recipe-db.md](issues/recipe-db.md) |
| #220 | レシピDB移行 段階3c: レシピ登録の入口をPOSTへ変更する | [recipe-db.md](issues/recipe-db.md) |
| #221 | レシピDB移行 段階3d: 分類の新規作成と鍛冶の使用マス連動 | [recipe-db.md](issues/recipe-db.md) |
| #224 | レシピDB: 素材・単価・使用道具と大成功損益計算のデータ設計を検討する | [recipe-db.md](issues/recipe-db.md) |
| #227 | API: 不正なJSONのPUTで invalid_json が返らない (except の順序で到達不能) | [common.md](issues/common.md) |

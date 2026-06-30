# GitHub Issues

## 目的

現状の問題点と残タスクをGitHub issueで管理します。

リポジトリ:

```text
https://github.com/kwdch013/crafting_dq10
```

## 登録済みIssue

### #1 実レシピ別の基準値と成功範囲を収集する

現状:

- `api/data/crafts/<職人>/recipes.json` はテンプレート値です。
- 実ゲームの主要レシピ別数値は未投入です。

完了条件:

- 主要レシピ名、マス配置、基準値、成功下限、成功上限がJSONに入っている。
- 出典または確認メモが残っている。

URL:

```text
https://github.com/kwdch013/crafting_dq10/issues/1
```

### #2 集中力データを実値へ置き換える

現状:

- レベル別集中力と道具の星補正は初期テンプレートです。

完了条件:

- 職人別にレベル別集中力が入力されている。
- 道具種類と星数ごとの補正が入力されている。

URL:

```text
https://github.com/kwdch013/crafting_dq10/issues/2
```

### #3 特技データの網羅性を確認する

現状:

- 各職人の主要特技だけを登録しています。
- 一部の特殊特技や複数マス特技の扱いは簡易です。

完了条件:

- 職人別に使用可能特技が一覧化されている。
- 未対応特技の扱いがissue化されている。

URL:

```text
https://github.com/kwdch013/crafting_dq10/issues/3
```

### #4 APIへ計算処理を移すか判断する

現状:

- APIはレシピJSON配信が中心です。
- 判定計算はフロント側 `app/engine.js` に残しています。

完了条件:

- フロント計算継続かAPI計算移行かを決める。
- API移行する場合は `/api/analyze` の入出力仕様を作る。

URL:

```text
https://github.com/kwdch013/crafting_dq10/issues/4
```

### #5 ブラウザE2Eテストを追加する

現状:

- この環境ではPlaywrightやChromiumが未導入です。
- HTTP疎通とエンジン単体確認のみ実施しています。

完了条件:

- 職人選択、レシピ選択、会心停止表示をE2Eで確認できる。
- CIまたはローカル手順が文書化されている。

URL:

```text
https://github.com/kwdch013/crafting_dq10/issues/5
```

## 完了済み

### GitHubリポジトリ連携を設定する

結果:

- `origin` は `git@github.com:kwdch013/crafting_dq10.git` に設定済みです。
- `main`、`dev`、`docs/agent-branch-workflow` はremoteへpush済みです。
- `gh` CLIは導入済みで、`kwdch013` として認証済みです。
- この文書の未完了タスクはGitHub issue #1-#5 として登録済みです。

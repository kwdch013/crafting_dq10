# Issue明細: 共通・基盤

### #1 実レシピ別の基準値と成功範囲を収集する

現状:

- `api/data/crafts/<職人>/recipes.json` はテンプレート値です。
- 実ゲームの主要レシピ別数値は未投入です。

完了条件:

- 主要レシピ名、マス配置、基準値、成功下限、成功上限がJSONに入っている。
- 出典または確認メモが残っている。

URL: https://github.com/kwdch013/crafting_dq10/issues/1

### #2 集中力データを実値へ置き換える

現状:

- 鍛冶と調理は Lv75 までのレベル別集中力と道具種類の集中度を反映済みです。
- 鍛冶の Lv80 集中力は 208 として反映済みです。
- 鍛冶の Lv76-79 と調理の Lv76-80 は暫定的に各レベル +2 として登録しています。
- 木工、裁縫は初期テンプレートです。
- 鍛冶ハンマーとフライパンの★は集中力ではなく会心率の補正です。
- 奇跡の鍛冶ハンマーと奇跡のフライパンは集中力 +50 として反映済みです。

完了条件:

- 職人別にレベル別集中力が入力されている。
- 道具種類と星数ごとの補正が入力されている。

URL:

```text
https://github.com/kwdch013/crafting_dq10/issues/2
```

### #3 特技データの網羅性を確認する（2026-08-25 close済み）

現状:

- 各職人の主要特技だけを登録しています。
- 一部の特殊特技や複数マス特技の扱いは簡易です。

完了条件:

- 職人別に使用可能特技が一覧化されている。
- 未対応特技の扱いがissue化されている。

close理由: 完了条件が職人・特技の追加のたびに再度未達となる性質で、単一issueとして閉じられない。
特技の設定方法は `docs/design/04-craft-config-maintenance.md` の「特技設定」に整理済みで、
登録済み特技は各職人の `app/crafts/<職人>/config.js` で確認できる。
以後は個別の未対応特技が判明した時点で職人ラベル付きの個別issueとして起票する。

URL:

```text
https://github.com/kwdch013/crafting_dq10/issues/3
```

### #4 APIへ計算処理を移すか判断する（2026-08-25 close済み）

現状:

- APIはレシピJSON配信が中心です。
- 判定計算はフロント側 `app/engine.js` に残しています。

完了条件:

- フロント計算継続かAPI計算移行かを決める。
- API移行する場合は `/api/analyze` の入出力仕様を作る。

判断結果 (2026-08-25): フロント計算を継続する。
全職人の判定計算を `app/engine.js` に集約する構成が定着し、APIはレシピJSON配信に専念している。
このため `/api/analyze` の入出力仕様は作成しない。API移行を再検討する場合は新規issueとして起票する。

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

### #31 共通: 他職人向けの追加レシピを名前付き保存する（2026-07-09 close済み）

現状:

- 全職人で通常のレシピ選択に「手入力」項目は表示しません。
- 鍛冶、裁縫、木工など他職人は対象レシピ数が多く、未登録レシピや検証中レシピを追加登録で扱う可能性があります。
- 追加登録した内容を名前付きで保存、一覧化、再読込する仕組みは未実装です。

完了条件:

- 他職人向けに追加レシピを名前付き保存できる。
- 保存済み追加レシピを同じ職人のレシピ候補から選択できる。
- 保存データの保持場所、更新、削除、API停止時の扱いが設計または実装で明確になっている。
- 関連する単体テスト、必要ならブラウザ操作テストが追加されている。
- 関連ドキュメントが更新されている。

URL:

```text
https://github.com/kwdch013/crafting_dq10/issues/31
```

### #36 共通: 通常の会心候補が偽会心の可能性ありと表示される（2026-07-09 close済み）

現状:

- 未固定の会心候補表示に、固定後判定用の `偽会心の可能性あり` が使われていました。
- PR #37 で一度未固定候補を分離しましたが、調理の基準値が基準範囲30幅内のランダム値である点を踏まえ、#38 で再整理します。

完了条件:

- 未固定の会心候補も、基準値より少ない位置で固定される可能性がある場合は `偽会心の可能性あり` と表示される。
- 固定後の本会心固定、固定、偽会心判定は維持される。
- 回帰テストと関連ドキュメントを更新する。

URL:

```text
https://github.com/kwdch013/crafting_dq10/issues/36
```

### #118 共通: 設定分類とドキュメント最新化 職人設定登録時に共通設定と個別設定を分類し、READMEと設計文書を現在の6職人構成、共有集中力表、分類スキーマに合わせます。URL: https://github.com/kwdch013/crafting_dq10/issues/118
### #145 共通: 鍛冶職人に光マスを一括で変更するボタンを追加
鍛冶3職人の光地金特性で全マスの光状態を一括切替するボタンをコマンドパネルへ追加し、鍛冶でも戻る/進むの履歴操作を有効化します。URL: https://github.com/kwdch013/crafting_dq10/issues/145
### #154 共通: ユーザーレシピがAPI修正後もブラウザ保存の旧版で表示される
API読込に成功した職人では同一idのレシピをAPI側優先で解決し、localStorage の旧版 (マデュライトルアーの削除済みDマス等) が表示され続ける問題を解消します。保存直後はメモリ上のAPI由来レシピも差し替えます。URL: https://github.com/kwdch013/crafting_dq10/issues/154
### #155 共通: 鍛冶職人と調理職人のBOARDノードに基準範囲を表示する
基準値が範囲から抽選される職人 (鍛冶3職人・調理) のBOARDノードで、基準値表示をANALYSISと同じ「基準幅 下限 - 上限」表記へ変更します。木工・裁縫など固定基準値職人は従来どおり基準値のみ表示します。URL: https://github.com/kwdch013/crafting_dq10/issues/155
### #172 共通: GitHub Pages でフロントを静的サイトとして公開する
`app/` は静的構成でAPI停止時もフォールバック `recipes.js` で動作するため、GitHub Pages で公開可能。Pages 有効化 (Source: GitHub Actions) → `.github/workflows/deploy-pages.yml` 追加 (`upload-pages-artifact` で `path: app`) → main への push で自動デプロイ、という手順を記録。レシピ保存は localStorage のみとなる制約あり。着手は保留中。URL: https://github.com/kwdch013/crafting_dq10/issues/172
### #174 共通: ポート番号等を .env で設定可能にする（2026-08-25 close済み）
`docker-compose.yml` にホスト側ポート (3000 / 8000) と `API_BASE_URL` がハードコードされ、他サービスとポートが衝突する環境で変更しづらい問題。`.env` / `.env.example` を用意し、frontend を `${FRONTEND_PORT:-3000}`、api を `${API_PORT:-8000}`、接続先を `API_BASE_URL: ${API_BASE_URL:-}` (未指定時は #188 の対応によりアクセス元ホスト名から導出) として変数化済み。完了条件を満たしていることを確認したためクローズ。URL: https://github.com/kwdch013/crafting_dq10/issues/174
### #176 共通: ページアイコン (favicon) を追加する（2026-07-20 close済み）
フロント画面にページアイコンが未設定だったため、DQ10 職人 (金床・ハンマー・火花) をイメージした自前 SVG を `app/assets/favicon.svg` へ追加し、`app/index.html` の head から参照。`frontend/server.js` は `.svg` の MIME 定義済みのため変更なし。PR #177 で dev へ merge 済み。URL: https://github.com/kwdch013/crafting_dq10/issues/176
### #179 共通: パネル配置を変更し、特技データとダメージ表示を右側で大きく表示する（2026-07-20 close済み）
左カラムを「基本設定 → 特性情報 → 判定基準 → キャプチャ接続」の縦並びへ変更し、情報量の多い特技データを右カラムの BOARD 直後へ移動。特技データは 2 列敷き詰め + 数値 17px、温度別・位置別ダメージは 16px へ拡大。候補手単独化に伴い split-panel を廃止。BOARD の位置は変更なし。PR #181 で dev へ merge 済み。URL: https://github.com/kwdch013/crafting_dq10/issues/179
### #183 共通: 候補手パネルを一時的に非表示にする（2026-07-20 close済み）
候補手 section を HTML コメントで残置し表示から除外。`renderAnalysis` の推奨ロジック (`recommendTechniques`) は残し、描画先が無い場合は一覧描画のみスキップするガードを追加 (サマリー更新には影響しない)。再表示時はコメントを外すだけで復元可能。PR #184 で dev へ merge 済み。URL: https://github.com/kwdch013/crafting_dq10/issues/183
### #188 共通: 別端末のブラウザから API へ接続できずレシピ登録・参照ができない（2026-07-23 対応）
`frontend/server.js` が `/config.js` で返す `window.DQ10_API_BASE_URL` を起動時に固定 (`http://localhost:8000`) していたため、別端末のブラウザからは「その端末自身の 8000 番」を指してしまい、レシピの参照・登録・削除が失敗していた。API コンテナ自体は正常稼働 (CORS も `*` で許可済み) で、原因は接続先 URL の解決方法。リクエストの `Host` ヘッダからホスト名を取り出し `API_PORT` と組み合わせて毎回導出する方式へ変更し、`API_BASE_URL` を明示した場合のみ従来どおりその値を優先する。`frontend/Dockerfile` の `ENV API_BASE_URL` と `docker-compose.yml` の既定値も固定値を止めた。`Host` はスクリプト文脈へ埋め込むため、ドメイン・IPv4・角括弧付き IPv6 のみを許可し不正値は `localhost` へフォールバックする。URL: https://github.com/kwdch013/crafting_dq10/issues/188

### #200 共通: PR #199 の CodeQL セキュリティ警告を解消する

PR #199 の CodeQL が、利用者入力を含む職人IDからのパス構築 3 件と、テストの文字列処理 2 件を高重要度として検出しました。登録済みレシピファイルとの照合でパスを解決し、テストの不完全な文字列置換を除去して警告を解消します。URL: https://github.com/kwdch013/crafting_dq10/issues/200

### #227 API: 不正なJSONのPUTで invalid_json が返らない (except の順序で到達不能)

`api/main.py` の `do_PUT` で `except json.JSONDecodeError` の分岐に到達できません。`json.JSONDecodeError` は `ValueError` のサブクラスであり、直前の `except ValueError` が先に捕捉するためです。結果として、不正なJSONをPUTすると `{"error": "invalid_json"}` ではなく `{"error": "Expecting property name enclosed in double quotes: ..."}` のようにPythonのパーサー内部の文言がそのまま返ります。ステータスは現状も 400 のため実害は小さいものの、文言がPythonのバージョンに依存し、クライアントが分岐に使えません。PR #226 (#217 の B2-1) でHTTPレベルの契約テストを追加した際に判明しました。移行前の `api/main.py` から同じ順序のため、リポジトリ層の分離で作り込んだものではありません。対応は `except json.JSONDecodeError` を `except ValueError` より前へ移すだけですが、#217 (レシピDB移行 段階2) は保存先の切り替えでAPIの挙動を変えないことが前提のため、段階2の完了後に着手します。修正時は `tests/api_http_contract.test.py` の `test_put_invalid_json_returns_decoder_error` (現在はPythonのバージョン差を吸収するためステータスと `error` キーの存在だけを検証) の期待値も更新します。URL: https://github.com/kwdch013/crafting_dq10/issues/227

### #230 共通: 保存失敗時のalert文言をエラーの種類に応じて分ける

`app/main.js` は API 保存・削除が失敗すると、理由を問わず「ブラウザには保存しましたが、recipes.json への反映に失敗しました。APIの起動状態を確認してください。」と表示します (3128行付近と2721行付近)。PR #229 で保存先を PostgreSQL に切り替えられるようにしたところ、DB の `UNIQUE (class, name)` により同じ職人で同名のレシピを保存すると `400 recipe_name_already_exists` が返るようになりました。名前が重複しているだけなのに「APIの起動状態を確認してください」と出るため、利用者は原因にたどり着けません。エラーの種類に応じて文言を分け、通信失敗・API停止のときだけ現行の文言を出すようにします。#217 の B2-5 (既定を postgres へ変更) の前に対応が必要です。段階2は「フロント修正なし」が前提のため別issueとして分離しています。URL: https://github.com/kwdch013/crafting_dq10/issues/230


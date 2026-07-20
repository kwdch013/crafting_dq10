# Issue明細: 裁縫・木工

### #126 裁縫・木工: 固定基準値向けの判定基準を分離する URL: https://github.com/kwdch013/crafting_dq10/issues/126
### #128 裁縫・木工: 不要な判定表示を除外し職人別判定フローを文書化する URL: https://github.com/kwdch013/crafting_dq10/issues/128
### #134 裁縫・木工: 判定基準の凡例に「通常チャンス」が残っている URL: https://github.com/kwdch013/crafting_dq10/issues/134
### #136 裁縫・木工: 倍率別チャンス判定と基準値付近・全体誤差を表示する URL: https://github.com/kwdch013/crafting_dq10/issues/136
### #138 木工職人: ダメージ表・発生確率を修正し右クリックでくさびを切り替える URL: https://github.com/kwdch013/crafting_dq10/issues/138
### #159 裁縫: BOARD上でぬいパワーを切り替えられるようにする
裁縫職人の選択時、BOARDコマンドパネルにぬいパワー切替ボタン (弱い/普通/強い/最強/再生布) を表示し、基本設定プルダウン・右クリック判定・ANALYSISへ同期します。URL: https://github.com/kwdch013/crafting_dq10/issues/159
### #160 裁縫: ぬいパワー「会心×2」を追加する
ぬいパワーに会心×2を追加します。ダメージ分布は普通と同一参照とし、会心率のみ2倍で計算します。URL: https://github.com/kwdch013/crafting_dq10/issues/160
### #162 裁縫: 再生布をぬいパワーから独立した布状態として扱う
再生布をぬいパワー選択肢から外して独立トグル化し、任意のぬいパワーと併存できるようにします。再生布ON時は右クリック判定へ再生回復量 (-12〜-16、各20%) を表示し、旧保存状態 (heat=regenerate) は普通+再生布ONへ移行します。URL: https://github.com/kwdch013/crafting_dq10/issues/162
### #161 裁縫: 次ターンのぬいパワーを入力し候補手へ反映する
次ターンのぬいパワー (弱い〜会心×2・? 未定) をBOARD上で入力・保存し、右クリック判定へ次ターンの通常ダメージ範囲を併記します。ターン送り操作で次パワーを現在パワーへ繰り上げます。URL: https://github.com/kwdch013/crafting_dq10/issues/161
### #180 裁縫: ほぐしのマイナスダメージを赤字で表示する（2026-07-20 close済み）
ほぐしぬいのマイナスダメージを特技データカード (通常・会心・分布) と BOARD セル右クリック判定行で赤字 (.negative-damage, #dc2626) 表示。判定行の `color: inherit` (詳細度 0,1,1) に負けないよう判定行スコープの上書きルールを後置。再生布など他のマイナス値は対象外。PR #182 で dev へ merge 済み。URL: https://github.com/kwdch013/crafting_dq10/issues/180

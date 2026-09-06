-- 職人共通の使用道具マスタの追加
-- 設計は docs/design/09-recipe-db-schema.md、列定義は docs/design/10-recipe-db-tables.md を参照します。

-- 各職人がクラフト作業で使用する道具 (星ランク0〜3の消費アイテム) を1テーブルで管理します。
-- 道具体系が職人間で似ているため、craft_master と同様に class 列で職人を区別する共通テーブルとします。
-- 同じ道具名でも星ランクごとに価格・効果が異なるため、(class, name, rank) の組を単位に1行を持ちます。
CREATE TABLE craft_tools (
	tool_id       integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	-- 1=道具, 2=武器, 3=防具, 4=裁縫, 5=木工, 6=調理。craft_master.class と同じ体系です。
	class         smallint NOT NULL CHECK (class BETWEEN 1 AND 6),
	name          text NOT NULL,
	-- 星ランク。0が無印、1〜3が星の数に対応します。
	rank          smallint NOT NULL CHECK (rank BETWEEN 0 AND 3),
	-- 価格。shop = true なら店売り価格、false ならバザー相場価格として同じ列を兼用します。
	value         integer NOT NULL,
	-- 集中力への効果値。未設定の道具はNULL
	concentration integer,
	-- 満足度への効果値。小数を含むため numeric で保持します。未設定の道具はNULL
	satisfaction  numeric,
	-- 道具の説明文。desc はPostgreSQLの予約語のため tool_desc とします。
	tool_desc     text,
	-- true で店売りにより購入できる。false はバザー限定
	shop          boolean NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	is_active  boolean NOT NULL DEFAULT true,
	-- 同一道具・同一ランクの重複登録を防ぎます。
	CONSTRAINT craft_tools_class_name_rank_unique UNIQUE (class, name, rank)
);

CREATE TRIGGER craft_tools_set_updated_at BEFORE UPDATE ON craft_tools
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

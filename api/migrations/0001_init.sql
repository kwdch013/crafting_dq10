-- レシピデータの初期スキーマ (共通・マスタ・分類)
-- 設計は docs/design/09-recipe-db-schema.md、列定義は docs/design/10-recipe-db-tables.md を参照します。

-- 更新日時を自動更新します。アプリ側の書き忘れで更新日時がずれるのを防ぎます。
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
	NEW.updated_at = now();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 全職人共通のレシピ見出し。IDはこのテーブルで発番します。
CREATE TABLE craft_master (
	id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	-- 現行JSONの id。localStorage とエクスポートの互換のために保持します。
	legacy_id     text UNIQUE,
	name          text NOT NULL,
	-- 1=道具, 2=武器, 3=防具, 4=裁縫, 5=木工, 6=調理
	class         smallint NOT NULL CHECK (class BETWEEN 1 AND 6),
	-- JSON配列内の並び順。エクスポート時に差分を出さないために保持します。
	sort_order    integer NOT NULL,
	-- true で選択欄に表示しない。現行の archived に対応します。
	archived      boolean NOT NULL DEFAULT false,
	-- 以下は未使用。将来の拡張用に確保します。
	recipe_name   text,
	recipe_place  text,
	recipe_price  integer,
	master_level  integer,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	is_active  boolean NOT NULL DEFAULT true,
	-- レシピ名は職人をまたぐと重複しうるため、分類との複合で一意にします。
	CONSTRAINT craft_master_class_name_unique UNIQUE (class, name)
);

CREATE TRIGGER craft_master_set_updated_at BEFORE UPDATE ON craft_master
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 鍛冶3職人 (class 1-3) 共通の特性
CREATE TABLE smith_character (
	chara_id        smallint PRIMARY KEY,
	chara_name      text NOT NULL UNIQUE,
	chara_desc      text,
	-- 現行JSONの traitId。移行後に追加した特性はNULL
	legacy_trait_id text UNIQUE,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	is_active  boolean NOT NULL DEFAULT true
);

CREATE TRIGGER smith_character_set_updated_at BEFORE UPDATE ON smith_character
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 裁縫の特性
CREATE TABLE sewing_character (
	chara_id        smallint PRIMARY KEY,
	chara_name      text NOT NULL UNIQUE,
	chara_desc      text,
	-- 現行JSONの traitId。移行後に追加した特性はNULL
	legacy_trait_id text UNIQUE,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	is_active  boolean NOT NULL DEFAULT true
);

CREATE TRIGGER sewing_character_set_updated_at BEFORE UPDATE ON sewing_character
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 木工の特性
CREATE TABLE wood_character (
	chara_id        smallint PRIMARY KEY,
	chara_name      text NOT NULL UNIQUE,
	chara_desc      text,
	-- 現行JSONの traitId。移行後に追加した特性はNULL
	legacy_trait_id text UNIQUE,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	is_active  boolean NOT NULL DEFAULT true
);

CREATE TRIGGER wood_character_set_updated_at BEFORE UPDATE ON wood_character
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 調理の特性
CREATE TABLE cooking_character (
	chara_id        smallint PRIMARY KEY,
	chara_name      text NOT NULL UNIQUE,
	chara_desc      text,
	-- 現行JSONの traitId。移行後に追加した特性はNULL
	legacy_trait_id text UNIQUE,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	is_active  boolean NOT NULL DEFAULT true
);

CREATE TRIGGER cooking_character_set_updated_at BEFORE UPDATE ON cooking_character
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 調理の食材マスタ
CREATE TABLE cooking_materials (
	material_id    integer PRIMARY KEY,
	material_name  text NOT NULL UNIQUE,
	image_path     text,
	-- 2マス食材の並び方向。1マス食材はNULL
	pair_direction text CHECK (pair_direction IN ('vertical', 'horizontal')),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	is_active  boolean NOT NULL DEFAULT true
);

CREATE TRIGGER cooking_materials_set_updated_at BEFORE UPDATE ON cooking_materials
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 道具鍛冶の大項目と使用マス
-- マス名から座標を復元できないため、使用有無ではなく座標を持ちます。
CREATE TABLE tool_category (
	category_id        integer PRIMARY KEY,
	category_name      text NOT NULL UNIQUE,
	legacy_category_id text UNIQUE,
	row_a smallint CHECK (row_a >= 1),
	col_a smallint CHECK (col_a >= 1),
	row_b smallint CHECK (row_b >= 1),
	col_b smallint CHECK (col_b >= 1),
	row_c smallint CHECK (row_c >= 1),
	col_c smallint CHECK (col_c >= 1),
	row_d smallint CHECK (row_d >= 1),
	col_d smallint CHECK (col_d >= 1),
	row_e smallint CHECK (row_e >= 1),
	col_e smallint CHECK (col_e >= 1),
	row_f smallint CHECK (row_f >= 1),
	col_f smallint CHECK (col_f >= 1),
	row_g smallint CHECK (row_g >= 1),
	col_g smallint CHECK (col_g >= 1),
	row_h smallint CHECK (row_h >= 1),
	col_h smallint CHECK (col_h >= 1),
	CONSTRAINT tool_category_cell_a_pair CHECK ((row_a IS NULL) = (col_a IS NULL)),
	CONSTRAINT tool_category_cell_b_pair CHECK ((row_b IS NULL) = (col_b IS NULL)),
	CONSTRAINT tool_category_cell_c_pair CHECK ((row_c IS NULL) = (col_c IS NULL)),
	CONSTRAINT tool_category_cell_d_pair CHECK ((row_d IS NULL) = (col_d IS NULL)),
	CONSTRAINT tool_category_cell_e_pair CHECK ((row_e IS NULL) = (col_e IS NULL)),
	CONSTRAINT tool_category_cell_f_pair CHECK ((row_f IS NULL) = (col_f IS NULL)),
	CONSTRAINT tool_category_cell_g_pair CHECK ((row_g IS NULL) = (col_g IS NULL)),
	CONSTRAINT tool_category_cell_h_pair CHECK ((row_h IS NULL) = (col_h IS NULL)),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	is_active  boolean NOT NULL DEFAULT true
);

CREATE TRIGGER tool_category_set_updated_at BEFORE UPDATE ON tool_category
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 武器鍛冶の大項目と使用マス
-- マス名から座標を復元できないため、使用有無ではなく座標を持ちます。
CREATE TABLE weapon_category (
	category_id        integer PRIMARY KEY,
	category_name      text NOT NULL UNIQUE,
	legacy_category_id text UNIQUE,
	row_a smallint CHECK (row_a >= 1),
	col_a smallint CHECK (col_a >= 1),
	row_b smallint CHECK (row_b >= 1),
	col_b smallint CHECK (col_b >= 1),
	row_c smallint CHECK (row_c >= 1),
	col_c smallint CHECK (col_c >= 1),
	row_d smallint CHECK (row_d >= 1),
	col_d smallint CHECK (col_d >= 1),
	row_e smallint CHECK (row_e >= 1),
	col_e smallint CHECK (col_e >= 1),
	row_f smallint CHECK (row_f >= 1),
	col_f smallint CHECK (col_f >= 1),
	row_g smallint CHECK (row_g >= 1),
	col_g smallint CHECK (col_g >= 1),
	row_h smallint CHECK (row_h >= 1),
	col_h smallint CHECK (col_h >= 1),
	CONSTRAINT weapon_category_cell_a_pair CHECK ((row_a IS NULL) = (col_a IS NULL)),
	CONSTRAINT weapon_category_cell_b_pair CHECK ((row_b IS NULL) = (col_b IS NULL)),
	CONSTRAINT weapon_category_cell_c_pair CHECK ((row_c IS NULL) = (col_c IS NULL)),
	CONSTRAINT weapon_category_cell_d_pair CHECK ((row_d IS NULL) = (col_d IS NULL)),
	CONSTRAINT weapon_category_cell_e_pair CHECK ((row_e IS NULL) = (col_e IS NULL)),
	CONSTRAINT weapon_category_cell_f_pair CHECK ((row_f IS NULL) = (col_f IS NULL)),
	CONSTRAINT weapon_category_cell_g_pair CHECK ((row_g IS NULL) = (col_g IS NULL)),
	CONSTRAINT weapon_category_cell_h_pair CHECK ((row_h IS NULL) = (col_h IS NULL)),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	is_active  boolean NOT NULL DEFAULT true
);

CREATE TRIGGER weapon_category_set_updated_at BEFORE UPDATE ON weapon_category
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 防具鍛冶の大項目と使用マス
-- マス名から座標を復元できないため、使用有無ではなく座標を持ちます。
CREATE TABLE armor_category (
	category_id        integer PRIMARY KEY,
	category_name      text NOT NULL UNIQUE,
	legacy_category_id text UNIQUE,
	row_a smallint CHECK (row_a >= 1),
	col_a smallint CHECK (col_a >= 1),
	row_b smallint CHECK (row_b >= 1),
	col_b smallint CHECK (col_b >= 1),
	row_c smallint CHECK (row_c >= 1),
	col_c smallint CHECK (col_c >= 1),
	row_d smallint CHECK (row_d >= 1),
	col_d smallint CHECK (col_d >= 1),
	row_e smallint CHECK (row_e >= 1),
	col_e smallint CHECK (col_e >= 1),
	row_f smallint CHECK (row_f >= 1),
	col_f smallint CHECK (col_f >= 1),
	row_g smallint CHECK (row_g >= 1),
	col_g smallint CHECK (col_g >= 1),
	row_h smallint CHECK (row_h >= 1),
	col_h smallint CHECK (col_h >= 1),
	CONSTRAINT armor_category_cell_a_pair CHECK ((row_a IS NULL) = (col_a IS NULL)),
	CONSTRAINT armor_category_cell_b_pair CHECK ((row_b IS NULL) = (col_b IS NULL)),
	CONSTRAINT armor_category_cell_c_pair CHECK ((row_c IS NULL) = (col_c IS NULL)),
	CONSTRAINT armor_category_cell_d_pair CHECK ((row_d IS NULL) = (col_d IS NULL)),
	CONSTRAINT armor_category_cell_e_pair CHECK ((row_e IS NULL) = (col_e IS NULL)),
	CONSTRAINT armor_category_cell_f_pair CHECK ((row_f IS NULL) = (col_f IS NULL)),
	CONSTRAINT armor_category_cell_g_pair CHECK ((row_g IS NULL) = (col_g IS NULL)),
	CONSTRAINT armor_category_cell_h_pair CHECK ((row_h IS NULL) = (col_h IS NULL)),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	is_active  boolean NOT NULL DEFAULT true
);

CREATE TRIGGER armor_category_set_updated_at BEFORE UPDATE ON armor_category
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 裁縫の大項目と使用マス
-- マス名が3行3列の座標順に固定対応するため、使用有無だけを持ちます。
CREATE TABLE sewing_category (
	category_id        integer PRIMARY KEY,
	category_name      text NOT NULL UNIQUE,
	legacy_category_id text UNIQUE,
	exist_a boolean NOT NULL DEFAULT false,
	exist_b boolean NOT NULL DEFAULT false,
	exist_c boolean NOT NULL DEFAULT false,
	exist_d boolean NOT NULL DEFAULT false,
	exist_e boolean NOT NULL DEFAULT false,
	exist_f boolean NOT NULL DEFAULT false,
	exist_g boolean NOT NULL DEFAULT false,
	exist_h boolean NOT NULL DEFAULT false,
	exist_i boolean NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	is_active  boolean NOT NULL DEFAULT true
);

CREATE TRIGGER sewing_category_set_updated_at BEFORE UPDATE ON sewing_category
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 木工の大項目と使用マス
-- マス名が3行3列の座標順に固定対応するため、使用有無だけを持ちます。
CREATE TABLE wood_category (
	category_id        integer PRIMARY KEY,
	category_name      text NOT NULL UNIQUE,
	legacy_category_id text UNIQUE,
	exist_a boolean NOT NULL DEFAULT false,
	exist_b boolean NOT NULL DEFAULT false,
	exist_c boolean NOT NULL DEFAULT false,
	exist_d boolean NOT NULL DEFAULT false,
	exist_e boolean NOT NULL DEFAULT false,
	exist_f boolean NOT NULL DEFAULT false,
	exist_g boolean NOT NULL DEFAULT false,
	exist_h boolean NOT NULL DEFAULT false,
	exist_i boolean NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	is_active  boolean NOT NULL DEFAULT true
);

CREATE TRIGGER wood_category_set_updated_at BEFORE UPDATE ON wood_category
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 調理の大項目
-- 同一分類内でも使用マスが揃わないため、マスの定義は持ちません。
CREATE TABLE cooking_category (
	category_id        integer PRIMARY KEY,
	category_name      text NOT NULL UNIQUE,
	legacy_category_id text UNIQUE,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	is_active  boolean NOT NULL DEFAULT true
);

CREATE TRIGGER cooking_category_set_updated_at BEFORE UPDATE ON cooking_category
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

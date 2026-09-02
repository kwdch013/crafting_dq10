-- レシピデータの初期スキーマ (レシピ)
-- 設計は docs/design/09-recipe-db-schema.md、列定義は docs/design/10-recipe-db-tables.md を参照します。

-- 道具鍛冶のマス別基準範囲
-- 基準値が範囲で決まるため、マスごとに下限と上限を持ちます。
CREATE TABLE tool_recipes (
	id          integer PRIMARY KEY,
	-- 自職人に固定し、(id, class) で参照することで別職人の見出しへの紐付けを防ぎます。
	class       smallint NOT NULL DEFAULT 1 CHECK (class = 1),
	category_id integer NOT NULL DEFAULT 0 REFERENCES tool_category (category_id),
	chara_id    smallint NOT NULL DEFAULT 0 REFERENCES smith_character (chara_id),
	a_min integer,
	a_max integer,
	b_min integer,
	b_max integer,
	c_min integer,
	c_max integer,
	d_min integer,
	d_max integer,
	e_min integer,
	e_max integer,
	f_min integer,
	f_max integer,
	g_min integer,
	g_max integer,
	h_min integer,
	h_max integer,
	CONSTRAINT tool_recipes_craft_master_fkey FOREIGN KEY (id, class)
		REFERENCES craft_master (id, class) ON DELETE CASCADE,
	CONSTRAINT tool_recipes_a_range CHECK (a_min <= a_max),
	CONSTRAINT tool_recipes_a_pair CHECK ((a_min IS NULL) = (a_max IS NULL)),
	CONSTRAINT tool_recipes_b_range CHECK (b_min <= b_max),
	CONSTRAINT tool_recipes_b_pair CHECK ((b_min IS NULL) = (b_max IS NULL)),
	CONSTRAINT tool_recipes_c_range CHECK (c_min <= c_max),
	CONSTRAINT tool_recipes_c_pair CHECK ((c_min IS NULL) = (c_max IS NULL)),
	CONSTRAINT tool_recipes_d_range CHECK (d_min <= d_max),
	CONSTRAINT tool_recipes_d_pair CHECK ((d_min IS NULL) = (d_max IS NULL)),
	CONSTRAINT tool_recipes_e_range CHECK (e_min <= e_max),
	CONSTRAINT tool_recipes_e_pair CHECK ((e_min IS NULL) = (e_max IS NULL)),
	CONSTRAINT tool_recipes_f_range CHECK (f_min <= f_max),
	CONSTRAINT tool_recipes_f_pair CHECK ((f_min IS NULL) = (f_max IS NULL)),
	CONSTRAINT tool_recipes_g_range CHECK (g_min <= g_max),
	CONSTRAINT tool_recipes_g_pair CHECK ((g_min IS NULL) = (g_max IS NULL)),
	CONSTRAINT tool_recipes_h_range CHECK (h_min <= h_max),
	CONSTRAINT tool_recipes_h_pair CHECK ((h_min IS NULL) = (h_max IS NULL)),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	is_active  boolean NOT NULL DEFAULT true
);

CREATE TRIGGER tool_recipes_set_updated_at BEFORE UPDATE ON tool_recipes
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 武器鍛冶のマス別基準範囲
-- 基準値が範囲で決まるため、マスごとに下限と上限を持ちます。
CREATE TABLE weapon_recipes (
	id          integer PRIMARY KEY,
	-- 自職人に固定し、(id, class) で参照することで別職人の見出しへの紐付けを防ぎます。
	class       smallint NOT NULL DEFAULT 2 CHECK (class = 2),
	category_id integer NOT NULL DEFAULT 0 REFERENCES weapon_category (category_id),
	chara_id    smallint NOT NULL DEFAULT 0 REFERENCES smith_character (chara_id),
	a_min integer,
	a_max integer,
	b_min integer,
	b_max integer,
	c_min integer,
	c_max integer,
	d_min integer,
	d_max integer,
	e_min integer,
	e_max integer,
	f_min integer,
	f_max integer,
	g_min integer,
	g_max integer,
	h_min integer,
	h_max integer,
	CONSTRAINT weapon_recipes_craft_master_fkey FOREIGN KEY (id, class)
		REFERENCES craft_master (id, class) ON DELETE CASCADE,
	CONSTRAINT weapon_recipes_a_range CHECK (a_min <= a_max),
	CONSTRAINT weapon_recipes_a_pair CHECK ((a_min IS NULL) = (a_max IS NULL)),
	CONSTRAINT weapon_recipes_b_range CHECK (b_min <= b_max),
	CONSTRAINT weapon_recipes_b_pair CHECK ((b_min IS NULL) = (b_max IS NULL)),
	CONSTRAINT weapon_recipes_c_range CHECK (c_min <= c_max),
	CONSTRAINT weapon_recipes_c_pair CHECK ((c_min IS NULL) = (c_max IS NULL)),
	CONSTRAINT weapon_recipes_d_range CHECK (d_min <= d_max),
	CONSTRAINT weapon_recipes_d_pair CHECK ((d_min IS NULL) = (d_max IS NULL)),
	CONSTRAINT weapon_recipes_e_range CHECK (e_min <= e_max),
	CONSTRAINT weapon_recipes_e_pair CHECK ((e_min IS NULL) = (e_max IS NULL)),
	CONSTRAINT weapon_recipes_f_range CHECK (f_min <= f_max),
	CONSTRAINT weapon_recipes_f_pair CHECK ((f_min IS NULL) = (f_max IS NULL)),
	CONSTRAINT weapon_recipes_g_range CHECK (g_min <= g_max),
	CONSTRAINT weapon_recipes_g_pair CHECK ((g_min IS NULL) = (g_max IS NULL)),
	CONSTRAINT weapon_recipes_h_range CHECK (h_min <= h_max),
	CONSTRAINT weapon_recipes_h_pair CHECK ((h_min IS NULL) = (h_max IS NULL)),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	is_active  boolean NOT NULL DEFAULT true
);

CREATE TRIGGER weapon_recipes_set_updated_at BEFORE UPDATE ON weapon_recipes
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 防具鍛冶のマス別基準範囲
-- 基準値が範囲で決まるため、マスごとに下限と上限を持ちます。
CREATE TABLE armor_recipes (
	id          integer PRIMARY KEY,
	-- 自職人に固定し、(id, class) で参照することで別職人の見出しへの紐付けを防ぎます。
	class       smallint NOT NULL DEFAULT 3 CHECK (class = 3),
	category_id integer NOT NULL DEFAULT 0 REFERENCES armor_category (category_id),
	chara_id    smallint NOT NULL DEFAULT 0 REFERENCES smith_character (chara_id),
	a_min integer,
	a_max integer,
	b_min integer,
	b_max integer,
	c_min integer,
	c_max integer,
	d_min integer,
	d_max integer,
	e_min integer,
	e_max integer,
	f_min integer,
	f_max integer,
	g_min integer,
	g_max integer,
	h_min integer,
	h_max integer,
	CONSTRAINT armor_recipes_craft_master_fkey FOREIGN KEY (id, class)
		REFERENCES craft_master (id, class) ON DELETE CASCADE,
	CONSTRAINT armor_recipes_a_range CHECK (a_min <= a_max),
	CONSTRAINT armor_recipes_a_pair CHECK ((a_min IS NULL) = (a_max IS NULL)),
	CONSTRAINT armor_recipes_b_range CHECK (b_min <= b_max),
	CONSTRAINT armor_recipes_b_pair CHECK ((b_min IS NULL) = (b_max IS NULL)),
	CONSTRAINT armor_recipes_c_range CHECK (c_min <= c_max),
	CONSTRAINT armor_recipes_c_pair CHECK ((c_min IS NULL) = (c_max IS NULL)),
	CONSTRAINT armor_recipes_d_range CHECK (d_min <= d_max),
	CONSTRAINT armor_recipes_d_pair CHECK ((d_min IS NULL) = (d_max IS NULL)),
	CONSTRAINT armor_recipes_e_range CHECK (e_min <= e_max),
	CONSTRAINT armor_recipes_e_pair CHECK ((e_min IS NULL) = (e_max IS NULL)),
	CONSTRAINT armor_recipes_f_range CHECK (f_min <= f_max),
	CONSTRAINT armor_recipes_f_pair CHECK ((f_min IS NULL) = (f_max IS NULL)),
	CONSTRAINT armor_recipes_g_range CHECK (g_min <= g_max),
	CONSTRAINT armor_recipes_g_pair CHECK ((g_min IS NULL) = (g_max IS NULL)),
	CONSTRAINT armor_recipes_h_range CHECK (h_min <= h_max),
	CONSTRAINT armor_recipes_h_pair CHECK ((h_min IS NULL) = (h_max IS NULL)),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	is_active  boolean NOT NULL DEFAULT true
);

CREATE TRIGGER armor_recipes_set_updated_at BEFORE UPDATE ON armor_recipes
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 裁縫のマス別基準値
-- 固定基準値のため、マスごとに1つの値だけを持ちます。
CREATE TABLE sewing_recipes (
	id          integer PRIMARY KEY,
	-- 自職人に固定し、(id, class) で参照することで別職人の見出しへの紐付けを防ぎます。
	class       smallint NOT NULL DEFAULT 4 CHECK (class = 4),
	category_id integer NOT NULL DEFAULT 0 REFERENCES sewing_category (category_id),
	chara_id    smallint NOT NULL DEFAULT 0 REFERENCES sewing_character (chara_id),
	value_a integer,
	value_b integer,
	value_c integer,
	value_d integer,
	value_e integer,
	value_f integer,
	value_g integer,
	value_h integer,
	value_i integer,
	CONSTRAINT sewing_recipes_craft_master_fkey FOREIGN KEY (id, class)
		REFERENCES craft_master (id, class) ON DELETE CASCADE,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	is_active  boolean NOT NULL DEFAULT true
);

CREATE TRIGGER sewing_recipes_set_updated_at BEFORE UPDATE ON sewing_recipes
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 木工のマス別基準値と木目
-- 木目はレシピ内で混在するため、マス単位で持ちます。true が縦 (逆目)、false が横です。
CREATE TABLE wood_recipes (
	id          integer PRIMARY KEY,
	-- 自職人に固定し、(id, class) で参照することで別職人の見出しへの紐付けを防ぎます。
	class       smallint NOT NULL DEFAULT 5 CHECK (class = 5),
	category_id integer NOT NULL DEFAULT 0 REFERENCES wood_category (category_id),
	chara_id    smallint NOT NULL DEFAULT 0 REFERENCES wood_character (chara_id),
	value_a integer,
	grain_a boolean,
	value_b integer,
	grain_b boolean,
	value_c integer,
	grain_c boolean,
	value_d integer,
	grain_d boolean,
	value_e integer,
	grain_e boolean,
	value_f integer,
	grain_f boolean,
	value_g integer,
	grain_g boolean,
	value_h integer,
	grain_h boolean,
	value_i integer,
	grain_i boolean,
	CONSTRAINT wood_recipes_craft_master_fkey FOREIGN KEY (id, class)
		REFERENCES craft_master (id, class) ON DELETE CASCADE,
	CONSTRAINT wood_recipes_a_pair CHECK ((value_a IS NULL) = (grain_a IS NULL)),
	CONSTRAINT wood_recipes_b_pair CHECK ((value_b IS NULL) = (grain_b IS NULL)),
	CONSTRAINT wood_recipes_c_pair CHECK ((value_c IS NULL) = (grain_c IS NULL)),
	CONSTRAINT wood_recipes_d_pair CHECK ((value_d IS NULL) = (grain_d IS NULL)),
	CONSTRAINT wood_recipes_e_pair CHECK ((value_e IS NULL) = (grain_e IS NULL)),
	CONSTRAINT wood_recipes_f_pair CHECK ((value_f IS NULL) = (grain_f IS NULL)),
	CONSTRAINT wood_recipes_g_pair CHECK ((value_g IS NULL) = (grain_g IS NULL)),
	CONSTRAINT wood_recipes_h_pair CHECK ((value_h IS NULL) = (grain_h IS NULL)),
	CONSTRAINT wood_recipes_i_pair CHECK ((value_i IS NULL) = (grain_i IS NULL)),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	is_active  boolean NOT NULL DEFAULT true
);

CREATE TRIGGER wood_recipes_set_updated_at BEFORE UPDATE ON wood_recipes
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 調理のマス別食材と基準値
-- 基準値の上限は下限 + 30 で算出するため、下限だけを持ちます。
-- group_* は、同一レシピ内に同じ食材の2マスグループが複数ある場合に区別するための番号です。
-- マスの使用有無は *_min で判定します。食材が未設定のマスが現行データに存在するためです。
CREATE TABLE cooking_recipes (
	id          integer PRIMARY KEY,
	-- 自職人に固定し、(id, class) で参照することで別職人の見出しへの紐付けを防ぎます。
	class       smallint NOT NULL DEFAULT 6 CHECK (class = 6),
	category_id integer NOT NULL DEFAULT 0 REFERENCES cooking_category (category_id),
	chara_id    smallint NOT NULL DEFAULT 0 REFERENCES cooking_character (chara_id),
	material_a integer REFERENCES cooking_materials (material_id),
	group_a    smallint,
	a_min      integer,
	material_b integer REFERENCES cooking_materials (material_id),
	group_b    smallint,
	b_min      integer,
	material_c integer REFERENCES cooking_materials (material_id),
	group_c    smallint,
	c_min      integer,
	material_d integer REFERENCES cooking_materials (material_id),
	group_d    smallint,
	d_min      integer,
	material_e integer REFERENCES cooking_materials (material_id),
	group_e    smallint,
	e_min      integer,
	material_f integer REFERENCES cooking_materials (material_id),
	group_f    smallint,
	f_min      integer,
	material_g integer REFERENCES cooking_materials (material_id),
	group_g    smallint,
	g_min      integer,
	material_h integer REFERENCES cooking_materials (material_id),
	group_h    smallint,
	h_min      integer,
	material_i integer REFERENCES cooking_materials (material_id),
	group_i    smallint,
	i_min      integer,
	CONSTRAINT cooking_recipes_craft_master_fkey FOREIGN KEY (id, class)
		REFERENCES craft_master (id, class) ON DELETE CASCADE,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	is_active  boolean NOT NULL DEFAULT true
);

CREATE TRIGGER cooking_recipes_set_updated_at BEFORE UPDATE ON cooking_recipes
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

const readme = read("README.md");
const overview = read("docs/requirements/01-overview-and-scope.md");
const roadmap = read("docs/requirements/03-nonfunctional-and-roadmap.md");
const architecture = read("docs/design/01-architecture.md");
const designIndex = read("docs/design/README.md");
const operations = read("docs/design/03-operations.md");
const mainJs = read("app/main.js");

assert.match(readme, /全職人への基本対応は実装済み/);
assert.doesNotMatch(readme, /他職人エンジンの追加/);

assert.match(overview, /調理、武器鍛冶、防具鍛冶、道具鍛冶、裁縫、木工/);
assert.doesNotMatch(overview, /初期対応は調理職人です。/);
assert.doesNotMatch(overview, /将来的に鍛冶、裁縫、木工へ拡張します。/);

assert.match(roadmap, /Phase 6: 職人拡張の保守/);
assert.doesNotMatch(roadmap, /他職人拡張/);

assert.match(architecture, /職人別レシピデータを取得します/);
assert.match(architecture, /Python\[python:3\.14-slim \+ psycopg\]/);
assert.doesNotMatch(architecture, /料理データを取得します/);
assert.doesNotMatch(architecture, /Python\[python:3\.14-alpine\]/);

assert.match(designIndex, /コンテナ: `frontend\/Dockerfile`, `api\/Dockerfile`/);
assert.doesNotMatch(designIndex, /コンテナ: `Dockerfile`/);

assert.match(operations, /職人別レシピデータはAPIから取得します。/);
assert.doesNotMatch(operations, /料理データはAPIから取得します。/);

assert.doesNotMatch(mainJs, /dq10-cooking-craft-mvp/);
assert.doesNotMatch(mainJs, /legacyStorageKey/);

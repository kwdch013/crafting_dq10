const assert = require("node:assert/strict");
const fs = require("node:fs");

const main = fs.readFileSync("app/main.js", "utf8");
const styles = fs.readFileSync("app/styles.css", "utf8");

assert.equal(main.includes("classList.toggle(\"square-board\""), false);
assert.equal(styles.includes(".craft-board.square-board"), false);
assert.equal(styles.includes("aspect-ratio: 1 / 1"), false);

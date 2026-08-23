const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("app/index.html", "utf8");
const mainJs = fs.readFileSync("app/main.js", "utf8");

assert.equal(html.includes("<p class=\"eyebrow\">Values</p>"), false);
assert.equal(html.includes("id=\"itemSectionTitle\""), false);
assert.equal(html.includes("id=\"ingredientBody\""), false);
assert.equal(html.includes("id=\"ingredientRowTemplate\""), false);
assert.equal(html.includes("id=\"addIngredientButton\""), false);

assert.equal(mainJs.includes("document.querySelector(\"#ingredientBody\")"), false);
assert.equal(mainJs.includes("document.querySelector(\"#ingredientRowTemplate\")"), false);
assert.equal(mainJs.includes("document.querySelector(\"#addIngredientButton\")"), false);

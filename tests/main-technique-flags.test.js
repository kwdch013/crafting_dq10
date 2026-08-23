const assert = require("node:assert/strict");
const fs = require("node:fs");

const mainJs = fs.readFileSync("app/main.js", "utf8");

[
	"showInTechniqueEditor",
	"includeInAnalysis",
	"recommendable",
].forEach((field) => {
	assert.match(
		mainJs,
		new RegExp(`${field}: technique\\.${field}`),
		`normalizeStateで${field}を保持してください`,
	);
});

const assert = require("node:assert/strict");
const fs = require("node:fs");

const mainJs = fs.readFileSync("app/main.js", "utf8");

function extractFunctionBody(name) {
	const match = mainJs.match(new RegExp(`function ${name}\\([^)]*\\) \\{([\\s\\S]*?)\\n\\}`));
	assert.ok(match, `${name} が見つかりません`);
	return match[1];
}

function extractHeatInputHandlerBody() {
	const match = mainJs.match(/elements\.heatInput\.addEventListener\("change", \(\) => \{([\s\S]*?)\n\}\);/);
	assert.ok(match, "火力状態のchangeハンドラが見つかりません");
	return match[1];
}

{
	const body = extractFunctionBody("setCookingHeatMode");

	assert.match(body, /renderTechniqueEditor\(\);/);
	assert.match(body, /renderLayoutBoard\(\);/);
	assert.match(body, /renderAnalysis\(\);/);
}

{
	const body = extractHeatInputHandlerBody();

	assert.match(body, /refreshAfterHeatChange\(\);/);
}

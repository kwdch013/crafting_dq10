const assert = require("node:assert/strict");
const effects = require("../app/cooking-effects.js");

{
	assert.equal(effects.normalizeCookingEffectMode("light-return", "cross-glow"), "cross-glow");
	assert.equal(effects.normalizeCookingEffectMode("light-return", "corner-return"), "corner-return");
	assert.equal(effects.normalizeCookingEffectMode("light-return", "none"), "none");
	assert.equal(effects.normalizeCookingEffectMode("light", "cross-glow"), "none");
}

{
	assert.equal(effects.getInitialCookingEffectMode("light-return"), "none");
	assert.equal(effects.getInitialCookingEffectMode("light"), "none");
	assert.equal(effects.getInitialCookingEffectMode("recovery"), "none");
}

{
	assert.equal(effects.normalizeSavedCookingEffectMode("light-return", "cross-glow"), "none");
	assert.equal(effects.normalizeSavedCookingEffectMode("light-return", "corner-return"), "none");
	assert.equal(effects.normalizeSavedCookingEffectMode("light-return", "none"), "none");
}

const assert = require("node:assert/strict");
const { computeScore, interpretGesture } = require("./scoring.js");

assert.equal(computeScore({ correct: 24, classificationTotal: 24, activeMs: 180000, tRefMs: 180000, navCorrect: 4, navTotal: 4 }).score, 100);
assert.equal(computeScore({ correct: 12, classificationTotal: 24, activeMs: 360000, tRefMs: 180000, navCorrect: 2, navTotal: 4 }).score, 40);
assert.equal(computeScore({ correct: 0, classificationTotal: 24, activeMs: 720000, tRefMs: 180000, navCorrect: 0, navTotal: 4 }).score, 0);
assert.equal(computeScore({ correct: 23, classificationTotal: 24, activeMs: 270000, tRefMs: 180000, navCorrect: 3, navTotal: 4 }).score, 85);
assert.equal(interpretGesture(-80, 0).action, "next");
assert.equal(interpretGesture(80, 0).action, "previous");
assert.equal(interpretGesture(-90, -90).action, "edit");
assert.equal(interpretGesture(90, -90).action, "keep");
assert.equal(interpretGesture(-90, 90).action, "maybe");
assert.equal(interpretGesture(90, 90).action, "reject");
assert.equal(interpretGesture(15, 15).action, null);
console.log("Scoring tests passed.");

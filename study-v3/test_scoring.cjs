// 【代码讲解】V3测试系统；以下注释用于理解原有功能，未改变程序语句。
const assert = require("node:assert/strict");
const { computeScore, interpretGesture, buildAlternatingTechniques, buildBlockedTechniques } = require("./scoring.js");

// 【代码讲解】自动测试：输入确定的准确率、时间和导航结果，应得到预设总分。
assert.equal(computeScore({ correct: 24, classificationTotal: 24, activeMs: 180000, tRefMs: 180000, navCorrect: 4, navTotal: 4 }).score, 100);
// 【代码讲解】自动测试：输入确定的准确率、时间和导航结果，应得到预设总分。
assert.equal(computeScore({ correct: 12, classificationTotal: 24, activeMs: 360000, tRefMs: 180000, navCorrect: 2, navTotal: 4 }).score, 40);
// 【代码讲解】自动测试：输入确定的准确率、时间和导航结果，应得到预设总分。
assert.equal(computeScore({ correct: 0, classificationTotal: 24, activeMs: 720000, tRefMs: 180000, navCorrect: 0, navTotal: 4 }).score, 0);
// 【代码讲解】自动测试：输入确定的准确率、时间和导航结果，应得到预设总分。
assert.equal(computeScore({ correct: 23, classificationTotal: 24, activeMs: 270000, tRefMs: 180000, navCorrect: 3, navTotal: 4 }).score, 85);
// 【代码讲解】自动测试：给定方向矢量后应识别到指定动作。
assert.equal(interpretGesture(-80, 0).action, "next");
// 【代码讲解】自动测试：给定方向矢量后应识别到指定动作。
assert.equal(interpretGesture(80, 0).action, "previous");
// 【代码讲解】自动测试：给定方向矢量后应识别到指定动作。
assert.equal(interpretGesture(-90, -90).action, "edit");
// 【代码讲解】自动测试：给定方向矢量后应识别到指定动作。
assert.equal(interpretGesture(90, -90).action, "keep");
// 【代码讲解】自动测试：给定方向矢量后应识别到指定动作。
assert.equal(interpretGesture(-90, 90).action, "maybe");
// 【代码讲解】自动测试：给定方向矢量后应识别到指定动作。
assert.equal(interpretGesture(90, 90).action, "reject");
// 【代码讲解】自动测试：给定方向矢量后应识别到指定动作。
assert.equal(interpretGesture(15, 15).action, null);
assert.deepEqual(buildAlternatingTechniques(4, 0, 0), ["classic", "flicksort", "classic", "flicksort"]);
assert.deepEqual(buildAlternatingTechniques(4, 1, 0), ["flicksort", "classic", "flicksort", "classic"]);
assert.deepEqual(buildAlternatingTechniques(3, 8, 1), ["flicksort", "classic", "flicksort"]);
assert.deepEqual(buildBlockedTechniques(12, 0, 0), ["classic", "classic", "classic", "classic", "classic", "classic", "flicksort", "flicksort", "flicksort", "flicksort", "flicksort", "flicksort"]);
assert.deepEqual(buildBlockedTechniques(4, 1, 0), ["flicksort", "flicksort", "classic", "classic"]);
assert.deepEqual(buildBlockedTechniques(5, 8, 1), ["flicksort", "flicksort", "flicksort", "classic", "classic"]);
console.log("Scoring tests passed.");

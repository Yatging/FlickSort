// V3测试系统；以下注释用于理解原有功能，未改变程序语句。
const assert = require("node:assert/strict");
const { computeScore, interpretGesture, buildAlternatingTechniques, buildBlockedTechniques } = require("./scoring.js");

// 自动测试：输入确定的准确率、时间和导航结果，应得到预设总分。
assert.equal(computeScore({ correct: 24, classificationTotal: 24, activeMs: 180000, tRefMs: 180000, navCorrect: 4, navTotal: 4 }).score, 100);
// 自动测试：输入确定的准确率、时间和导航结果，应得到预设总分。
assert.equal(computeScore({ correct: 12, classificationTotal: 24, activeMs: 360000, tRefMs: 180000, navCorrect: 2, navTotal: 4 }).score, 40);
// 自动测试：输入确定的准确率、时间和导航结果，应得到预设总分。
assert.equal(computeScore({ correct: 0, classificationTotal: 24, activeMs: 720000, tRefMs: 180000, navCorrect: 0, navTotal: 4 }).score, 0);
// 自动测试：输入确定的准确率、时间和导航结果，应得到预设总分。
assert.equal(computeScore({ correct: 23, classificationTotal: 24, activeMs: 270000, tRefMs: 180000, navCorrect: 3, navTotal: 4 }).score, 85);
// 自动测试：给定方向矢量后应识别到指定动作。
assert.equal(interpretGesture(-80, 0).action, "next");
// 自动测试：给定方向矢量后应识别到指定动作。
assert.equal(interpretGesture(80, 0).action, "previous");
// 自动测试：给定方向矢量后应识别到指定动作。
assert.equal(interpretGesture(-90, -90).action, "edit");
// 自动测试：给定方向矢量后应识别到指定动作。
assert.equal(interpretGesture(90, -90).action, "keep");
// 自动测试：给定方向矢量后应识别到指定动作。
assert.equal(interpretGesture(-90, 90).action, "maybe");
// 自动测试：给定方向矢量后应识别到指定动作。
assert.equal(interpretGesture(90, 90).action, "reject");
// 自动测试：给定方向矢量后应识别到指定动作。
assert.equal(interpretGesture(15, 15).action, null);
assert.deepEqual(buildAlternatingTechniques(4, 0, 0), ["classic", "flicksort", "classic", "flicksort"]);
assert.deepEqual(buildAlternatingTechniques(4, 1, 0), ["flicksort", "classic", "flicksort", "classic"]);
assert.deepEqual(buildAlternatingTechniques(3, 8, 1), ["flicksort", "classic", "flicksort"]);
assert.deepEqual(buildBlockedTechniques(12, 0, 0), ["classic", "classic", "classic", "classic", "classic", "classic", "flicksort", "flicksort", "flicksort", "flicksort", "flicksort", "flicksort"]);
assert.deepEqual(buildBlockedTechniques(4, 1, 0), ["flicksort", "flicksort", "classic", "classic"]);
assert.deepEqual(buildBlockedTechniques(5, 8, 1), ["flicksort", "flicksort", "flicksort", "classic", "classic"]);
// 【边界回归】用相同dx/dy检验旧Demo与V3，避免阈值再次分叉。
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const oldText = fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const legacy = oldText.match(/^function interpretGesture\(dx,dy,minDistance=60\)\{.*\}$/m);
assert.ok(legacy, 'legacy recognizer not found');
const oldGesture = vm.runInNewContext(legacy[0] + ';interpretGesture;');
const vec = (deg, r=100, sx=1, sy=1) => [sx*r*Math.cos(deg*Math.PI/180),sy*r*Math.sin(deg*Math.PI/180)];
const cases = [[0,'nav'],[19.99,'nav'],[20.01,'cancel'],[25,'cancel'],[29.99,'cancel'],[30.01,'cat'],[45,'cat'],[59.99,'cat'],[60.01,'cancel'],[75,'cancel'],[90,'cancel']];
for(const [ang,what] of cases)for(const sx of [-1,1])for(const sy of [-1,1]){
  const [dx,dy]=vec(ang,100,sx,sy);
  const wanted=what==='nav'?(sx<0?'next':'previous'):what==='cat'?(sy<0?(sx<0?'edit':'keep'):(sx<0?'maybe':'reject')):null;
  assert.equal(interpretGesture(dx,dy).action,wanted,'V3 angle '+ang+' quadrant '+sx+','+sy);
  assert.equal(oldGesture(dx,dy).action,wanted,'Demo angle '+ang+' quadrant '+sx+','+sy);
}
for(const dx of [-59.99,0,59.99]){assert.equal(interpretGesture(dx,0).action,null);assert.equal(oldGesture(dx,0).action,null);}
assert.equal(interpretGesture(60,0).action,'previous');
assert.equal(oldGesture(60,0).action,'previous');

console.log("Scoring and cross-version gesture boundary tests passed.");

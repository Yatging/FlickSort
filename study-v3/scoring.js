(function (root) {
  "use strict";

  function clip(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function computeScore(input) {
    const correct = Number(input.correct) || 0;
    const classificationTotal = Math.max(1, Number(input.classificationTotal) || 0);
    const activeMs = Math.max(0, Number(input.activeMs) || 0);
    const tRefMs = Math.max(1, Number(input.tRefMs) || 1);
    const navCorrect = Number(input.navCorrect) || 0;
    const navTotal = Math.max(1, Number(input.navTotal) || 0);
    const classificationRatio = clip(correct / classificationTotal, 0, 1);
    const timeFactor = clip((2 * tRefMs - activeMs) / tRefMs, 0, 1);
    const navigationRatio = clip(navCorrect / navTotal, 0, 1);
    const rawScore = 70 * classificationRatio + 20 * timeFactor + 10 * navigationRatio;

    return {
      score: Math.round(rawScore),
      rawScore,
      classificationRatio,
      timeFactor,
      navigationRatio
    };
  }

  function interpretGesture(dx, dy, minGesture = 60) {
    const distance = Math.hypot(dx, dy);
    const absHorizontalAngle = Math.atan2(Math.abs(dy), Math.abs(dx)) * 180 / Math.PI;
    if (distance < minGesture) return { action: null, reason: "too_short", distance, angle: Math.atan2(dy, dx) * 180 / Math.PI };
    if (absHorizontalAngle <= 22) return { action: dx < 0 ? "next" : "previous", reason: "horizontal", distance, angle: Math.atan2(dy, dx) * 180 / Math.PI };
    if (absHorizontalAngle >= 28 && absHorizontalAngle <= 68) {
      const action = dx < 0 && dy < 0 ? "edit" : dx > 0 && dy < 0 ? "keep" : dx < 0 ? "maybe" : "reject";
      return { action, reason: "diagonal", distance, angle: Math.atan2(dy, dx) * 180 / Math.PI };
    }
    return { action: null, reason: "ambiguous_angle", distance, angle: Math.atan2(dy, dx) * 180 / Math.PI };
  }

  const api = { clip, computeScore, interpretGesture };
  root.FlickSortScoring = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

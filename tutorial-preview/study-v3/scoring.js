// V3测试系统；以下注释用于理解原有功能，未改变程序语句。
(function (root) {
  "use strict";

  // clip()：限制数据上下界，避免比例和分数超出合理范围。
  function clip(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  // computeScore()：综合正确率70%、速度20%、导航正确率10%得到演示总分；科研分析仍须单独使用原始指标。
  function computeScore(input) {
    const correct = Number(input.correct) || 0;
    const classificationTotal = Math.max(1, Number(input.classificationTotal) || 0);
    const activeMs = Math.max(0, Number(input.activeMs) || 0);
    const tRefMs = Math.max(1, Number(input.tRefMs) || 1);
    const navCorrect = Number(input.navCorrect) || 0;
    const navTotal = Math.max(1, Number(input.navTotal) || 0);
    // 分类正确率=正确数量/题目数量，限制在0–1。
    const classificationRatio = clip(correct / classificationTotal, 0, 1);
    // 速度因子=(2×参考用时－实际用时)/参考用时，再限制0–1。
    const timeFactor = clip((2 * tRefMs - activeMs) / tRefMs, 0, 1);
    // 导航正确率=成功到达目标数/导航任务数。
    const navigationRatio = clip(navCorrect / navTotal, 0, 1);
    // OverallScore=70×分类正确率+20×速度因子+10×导航正确率。
    const rawScore = 70 * classificationRatio + 20 * timeFactor + 10 * navigationRatio;

    return {
      score: Math.round(rawScore),
      rawScore,
      classificationRatio,
      timeFactor,
      navigationRatio
    };
  }

  // interpretGesture()：用dx/dy计算滑动距离及角度，返回六个方向动作之一或取消原因。
  function interpretGesture(dx, dy, minGesture = 60) {
    // 用√(dx²+dy²)计算从手指起点到终点的直线距离。
    const distance = Math.hypot(dx, dy);
    // 用atan2(|dy|,|dx|)求滑动相对水平轴的角度，并由弧度转换为度数。
    const absHorizontalAngle = Math.atan2(Math.abs(dy), Math.abs(dx)) * 180 / Math.PI;
    // 若距离不足，返回too_short，避免把轻触错判成分类。
    if (distance < minGesture) return { action: null, reason: "too_short", distance, angle: Math.atan2(dy, dx) * 180 / Math.PI };
    // 与水平轴夹角≤20°视为浏览：左滑next、右滑previous；阈值待Pilot验证。
    // 角度相对最近水平轴计算：左滑next、右滑previous；同一手势只确认一次动作。
    if (absHorizontalAngle <= 20) return { action: dx < 0 ? "next" : "previous", reason: "horizontal", distance, angle: Math.atan2(dy, dx) * 180 / Math.PI };
    // 30°至60°属于斜向分类；20°至30°是取消缓冲区域；阈值待Pilot验证。
    // 以45°为中心，四象限按dx/dy正负选择类别；20°–30°及超过60°的方向取消。
    if (absHorizontalAngle >= 30 && absHorizontalAngle <= 60) {
      // 屏幕y轴向下为正：左上Edit，右上Keep，左下Maybe，右下Reject。
      const action = dx < 0 && dy < 0 ? "edit" : dx > 0 && dy < 0 ? "keep" : dx < 0 ? "maybe" : "reject";
      return { action, reason: "diagonal", distance, angle: Math.atan2(dy, dx) * 180 / Math.PI };
    }
    // 角度不明确时不提交操作，以降低误判并产生可记录的Cancel。
    return { action: null, reason: "ambiguous_angle", distance, angle: Math.atan2(dy, dx) * 180 / Math.PI };
  }

  // buildAlternatingTechniques()：按照片逐张交替 Classic/FlickSort 的辅助分组函数。
  function buildAlternatingTechniques(count, seed = 0, phaseOffset = 0) {
    // 用随机种子和关卡偏移决定哪种技术先出现。
    const first = ((Number(seed) + Number(phaseOffset)) & 1) === 0 ? "classic" : "flicksort";
    return Array.from({ length: Math.max(0, Number(count) || 0) }, (_, index) =>
      index % 2 === 0 ? first : (first === "classic" ? "flicksort" : "classic")
    );
  }

  // buildBlockedTechniques()：将照片分成前后两个区块，由seed决定Classic/FlickSort的先后顺序。
  function buildBlockedTechniques(count, seed = 0, phaseOffset = 0) {
    const total = Math.max(0, Number(count) || 0);
    // 用随机种子和关卡偏移决定哪种技术先出现。
    const first = ((Number(seed) + Number(phaseOffset)) & 1) === 0 ? "classic" : "flicksort";
    const second = first === "classic" ? "flicksort" : "classic";
    // 计算第一个技术区块应该分配多少张照片。
    const firstBlockSize = Math.ceil(total / 2);
    return Array.from({ length: total }, (_, index) => index < firstBlockSize ? first : second);
  }

  const api = { clip, computeScore, interpretGesture, buildAlternatingTechniques, buildBlockedTechniques };
  // 将scoring算法暴露给浏览器里的app.js调用。
  root.FlickSortScoring = api;
  // 同时支持Node.js的module.exports，以便在命令行运行测试。
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

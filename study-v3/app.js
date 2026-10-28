// V3测试系统；以下注释用于理解原有功能，未改变程序语句。
(function () {
  "use strict";

  // 程序构建版本号，也会写进导出的实验记录。
  const BUILD = "3.3.1";
  // 测试图素材集版本，方便结果溯源。
  const ASSET_SET = "image-selection-realistic-v2";
  // 速度得分基准时间，目前是演示参数，尚未经过Pilot校准。
  const T_REF_MS = 180000;
  // 一条有效手势的最短距离；短动作被取消。
  const MIN_GESTURE = 60;
  // 保存Keep、Edit、Maybe、Reject四个分类的显示文字与图标。
  const LABELS = {
    keep: { en: "Keep", zh: "保留", icon: "✓" },
    edit: { en: "Edit", zh: "编辑", icon: "✎" },
    maybe: { en: "Maybe", zh: "待定", icon: "?" },
    reject: { en: "Reject", zh: "拒绝", icon: "×" }
  };
  // DOM查询简写：只取第一个匹配元素。
  const $ = (selector) => document.querySelector(selector);
  // DOM查询简写：把所有匹配元素组成数组。
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  // ISO时间戳便于研究者追踪事件发生时刻。
  const nowIso = () => new Date().toISOString();
  // generateParticipantId()：生成匿名参与者编号，不使用学生姓名。
  function generateParticipantId() {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    return `P-${random[0].toString(36).toUpperCase().padStart(7, "0")}`;
  }

  // 核心state包含匿名编号、阶段、照片、分类、Undo、计时及Trial/Event日志。
  const state = {
    manifest: [], participant: "", technique: "mixed_auto_grouped", runMode: "demo",
    phase: "setup", phaseItems: [], trialIndex: 0, currentImageIndex: 0,
    selectedLabel: null, trialStart: 0, trialStartTime: "", trialPausedMs: 0, hiddenAt: null,
    activeMs: 0, lastTimerSync: null, classifications: new Map(), undoStack: [],
    trials: [], events: [], phaseCancelCount: 0, totalCancels: 0, totalUndos: 0,
    accidentalClassifications: 0, navMistouches: 0, activePointer: null,
    toastTimer: null, completedPhases: new Set(), finished: false,
    randomizationSeed: 0, techniqueAssignments: new Map(), classificationDetails: new Map(),
    firstSeenAt: new Map(), firstSeenTime: new Map(), phaseStart: 0, chapterItems: [], techniqueBlockIndex: 0,
    techniqueBlockCount: 0, techniqueBlockSize: 0
  };

  // logEvent()：将单次行为与时间、关卡、参与者、当前技术等信息加入事件日志。
  function logEvent(type, detail = {}) {
    const item = currentItem();
    state.events.push({
      event_timestamp: nowIso(), build_version: BUILD, asset_set: ASSET_SET,
      participant_id: state.participant, technique: currentTechnique(), run_technique: state.technique,
      run_mode: state.runMode, phase: state.phase,
      trial_index: ["level1", "level2"].includes(state.phase) ? state.currentImageIndex + 1 : state.trialIndex + 1,
      technique_block_index: state.techniqueBlockCount ? state.techniqueBlockIndex + 1 : "",
      technique_block_count: state.techniqueBlockCount || "",
      technique_block_size: state.techniqueBlockSize || "",
      target_image_id: ["tutorial", "navigation"].includes(state.phase) ? (item?.id || "") : "",
      displayed_image_id: displayedItem()?.id || "",
      event_type: type, ...detail
    });
  }

  // currentItem()：找到当前需要执行的任务对象。
  function currentItem() { return state.phaseItems[state.trialIndex] || null; }
  // displayedItem()：读取当前真正显示的照片；不一定等于目标照片。
  function displayedItem() {
    if (!state.phaseItems.length) return null;
    return state.phaseItems[(state.currentImageIndex + state.phaseItems.length) % state.phaseItems.length];
  }

  // itemKey()：为关卡和照片生成独立索引，避免各关分类结果互相覆盖。
  function itemKey(item = displayedItem(), phase = state.phase) {
    return item ? `${phase}:${item.id}` : "";
  }

  // currentTechnique()：根据照片所在区块找到当前使用的输入技术。
  function currentTechnique(item = displayedItem()) {
    if (!item || state.phase === "navigation" || state.phase === "setup" || state.phase === "results") return state.technique;
    return state.techniqueAssignments.get(itemKey(item)) || "classic";
  }

  // classificationFor()：查询当前照片已经选择的分类。
  function classificationFor(item = displayedItem()) {
    return state.classifications.get(itemKey(item)) || null;
  }

  // ensureFirstSeen()：在照片首次真正进入任务界面时，同时保存单调计时值和UTC绝对时间；绝不把performance.now()伪装成日期时间。
  function ensureFirstSeen(item = displayedItem()) {
    const key = itemKey(item);
    if (!key) return { monotonic: performance.now(), iso: nowIso() };
    if (!state.firstSeenAt.has(key)) {
      const seenAt = performance.now();
      const seenTime = nowIso();
      state.firstSeenAt.set(key, seenAt);
      state.firstSeenTime.set(key, seenTime);
    }
    return { monotonic: state.firstSeenAt.get(key), iso: state.firstSeenTime.get(key) };
  }

  // phaseCompletion()：统计本关卡照片分类完成情况。
  function phaseCompletion() {
    return state.phaseItems.filter((item) => state.classifications.has(itemKey(item))).length;
  }

  // assignBlockedTechniques()：按随机种子分配两段连续Classic/FlickSort照片区块。
  function assignBlockedTechniques(items) {
    if (!["tutorial", "level1", "level2"].includes(state.phase)) return;
    const phaseOffset = { tutorial: 0, level1: 1, level2: 2 }[state.phase];
    const assignments = FlickSortScoring.buildBlockedTechniques(items.length, state.randomizationSeed, phaseOffset);
    const first = assignments[0];
    state.techniqueBlockCount = 2;
    state.techniqueBlockSize = Math.ceil(items.length / state.techniqueBlockCount);
    items.forEach((item, index) => {
      state.techniqueAssignments.set(itemKey(item), assignments[index]);
    });
    if (["level1", "level2"].includes(state.phase)) {
      state.phaseItems = items.slice(0, state.techniqueBlockSize);
      state.currentImageIndex = 0;
    }
    logEvent("technique_assignment", {
      randomized_start: first,
      technique_order_seed: state.randomizationSeed,
      assignment_method: "random_start_then_two_contiguous_technique_blocks",
      technique_block_count: state.techniqueBlockCount,
      technique_block_size: state.techniqueBlockSize,
      assignment_order: items.map((item) => `${item.id}:${state.techniqueAssignments.get(itemKey(item))}`).join("|")
    });
  }

  // techniqueBlockForItem()：判断一张照片属于第几个技术区块。
  function techniqueBlockForItem(item) {
    if (!item || !state.chapterItems.length || !state.techniqueBlockSize) return "";
    const index = state.chapterItems.findIndex((candidate) => candidate.id === item.id);
    return index < 0 ? "" : Math.floor(index / state.techniqueBlockSize);
  }

  // activateTechniqueBlock()：切换到指定技术区块并更新可操作照片。
  function activateTechniqueBlock(index, announce = false) {
    state.techniqueBlockIndex = index;
    const start = index * state.techniqueBlockSize;
    state.phaseItems = state.chapterItems.slice(start, start + state.techniqueBlockSize);
    state.currentImageIndex = 0;
    state.undoStack = [];
    state.selectedLabel = classificationFor(state.phaseItems[0]);
    render();
    const technique = currentTechnique();
    logEvent("technique_block_start", {
      technique_block_index: index + 1,
      technique_block_count: state.techniqueBlockCount,
      technique_block_size: state.phaseItems.length,
      block_technique: technique,
      block_image_ids: state.phaseItems.map((item) => item.id).join("|")
    });
    if (announce) showToast(`Group ${index + 1} of ${state.techniqueBlockCount} · ${technique === "classic" ? "Classic" : "FlickSort"}`, 2400);
  }

  // itemsForLevel()：从manifest中选出对应关卡的所有照片。
  function itemsForLevel(level) { return state.manifest.filter((item) => item.level === level); }
  // balancedLevel2Items()：安排四种巴士/汽车组合的分类样本。
  function balancedLevel2Items() {
    const ids = ["l2-01", "l2-02", "l2-04", "l2-07", "l2-08", "l2-10", "l2-03", "l2-05", "l2-06", "l2-09", "l2-11", "l2-12"];
    return ids.map((id) => state.manifest.find((item) => item.id === id));
  }
  // representativeItems()：选取课堂快速Demo需要的代表性图片。
  function representativeItems() {
    return ["l2-01", "l2-07", "l2-04", "l2-10"].map((id) => state.manifest.find((item) => item.id === id));
  }
  // tutorialItems()：准备正式测试前的教学任务。
  function tutorialItems() {
    return ["l2-02", "l2-08", "l2-05", "l2-11"].map((id) => state.manifest.find((item) => item.id === id));
  }
  // navigationItems()：生成指定照片编号的纯导航任务。
  function navigationItems(full) {
    const ids = full ? ["l1-03", "l2-05", "l1-10", "l2-09"] : ["l1-03", "l2-09"];
    return ids.map((id) => state.manifest.find((item) => id === item.id));
  }

  // phaseSequence()：决定Demo或完整Pilot模式执行哪些关卡。
  function phaseSequence() {
    return state.runMode === "pilot"
      ? ["tutorial", "level1", "level2", "navigation", "results"]
      : ["level2", "navigation", "results"];
  }

  // syncActiveTimer()：统计实际操作时间，不把切换应用的暂停全部算进去。
  function syncActiveTimer() {
    if (!["level1", "level2", "navigation"].includes(state.phase) || document.hidden) return;
    const tick = performance.now();
    if (state.lastTimerSync != null) state.activeMs += tick - state.lastTimerSync;
    state.lastTimerSync = tick;
  }

  // resetTimerTick()：重新设置活动计时起点，防止重复累计。
  function resetTimerTick() {
    state.lastTimerSync = (!["level1", "level2", "navigation"].includes(state.phase) || document.hidden)
      ? null : performance.now();
  }

  // startPhase()：初始化新关卡：目标、图片、技术区块和计时。
  function startPhase(phase) {
    syncActiveTimer();
    clearToast();
    if (state.phase !== "setup") state.completedPhases.add(state.phase);
    state.phase = phase;
    state.trialIndex = 0;
    state.currentImageIndex = 0;
    state.selectedLabel = null;
    state.undoStack = [];
    state.phaseCancelCount = 0;
    state.chapterItems = [];
    state.techniqueBlockIndex = 0;
    state.techniqueBlockCount = 0;
    state.techniqueBlockSize = 0;
    if (phase === "results") return showResults();
    if (phase === "tutorial") {
      state.chapterItems = tutorialItems();
      state.phaseItems = state.chapterItems;
    }
    if (phase === "level1") state.chapterItems = itemsForLevel("level1");
    if (phase === "level2") state.chapterItems = state.runMode === "demo" ? representativeItems() : balancedLevel2Items();
    if (phase === "navigation") state.phaseItems = navigationItems(state.runMode === "pilot");
    state.currentImageIndex = 0;
    state.phaseStart = performance.now();
    if (["tutorial", "level1", "level2"].includes(phase)) assignBlockedTechniques(state.chapterItems);
    if (["level1", "level2"].includes(phase)) {
      activateTechniqueBlock(0);
      logEvent("phase_start", {
        image_count: state.chapterItems.length,
        free_order_within_block: 1,
        technique_block_count: state.techniqueBlockCount,
        technique_block_size: state.techniqueBlockSize
      });
    } else {
      beginTrial();
    }
    resetTimerTick();
  }

  // advancePhase()：进入下一关或成绩页。
  function advancePhase() {
    const seq = phaseSequence();
    const next = seq[seq.indexOf(state.phase) + 1] || "results";
    startPhase(next);
  }

  // beginTrial()：开始一条新试次，保存时间与阶段状态。
  function beginTrial() {
    const previousBlock = state.techniqueBlockIndex;
    if (state.phase === "tutorial") state.techniqueBlockIndex = Math.floor(state.trialIndex / state.techniqueBlockSize);
    state.selectedLabel = null;
    state.undoStack = [];
    state.currentImageIndex = state.phase === "navigation"
      ? (state.trialIndex + 1) % state.phaseItems.length
      : state.trialIndex;
    state.trialStartTime = nowIso();
    state.trialStart = performance.now();
    state.trialPausedMs = 0;
    render();
    if (state.phase === "tutorial" && state.trialIndex % state.techniqueBlockSize === 0) {
      logEvent("technique_block_start", {
        technique_block_index: state.techniqueBlockIndex + 1,
        technique_block_count: state.techniqueBlockCount,
        technique_block_size: Math.min(state.techniqueBlockSize, state.phaseItems.length - state.techniqueBlockIndex * state.techniqueBlockSize),
        block_technique: currentTechnique()
      });
      if (state.trialIndex > 0 && previousBlock !== state.techniqueBlockIndex) {
        showToast(`Group ${state.techniqueBlockIndex + 1} of ${state.techniqueBlockCount} · ${currentTechnique() === "classic" ? "Classic" : "FlickSort"}`, 2400);
      }
    }
    logEvent("trial_start", { correct_answer: currentItem()?.answer || "navigation_only" });
  }

  // render()：依据state刷新界面显示；数据不是存储在DOM里的文字中。
  function render() {
    const item = displayedItem();
    if (!item) return;
    const target = currentItem();
    const total = state.phaseItems.length;
    const phaseCopy = {
      tutorial: ["TUTORIAL · NOT SCORED", "Learn the controls"],
      level1: ["LEVEL 1 · BUS CHECK", "Keep photos with a bus. Reject all others."],
      level2: [state.runMode === "demo" ? "DEMO · 4 REPRESENTATIVE PHOTOS" : "LEVEL 2 · FOUR-WAY SORT", "Sort every photo by visible vehicles."],
      navigation: ["NAVIGATION ONLY", "Find the requested photo. Do not classify."]
    }[state.phase];
    const isChapter = ["level1", "level2"].includes(state.phase);
    // Tutorial actions remain in practice logs but are excluded from the final score.
    $("#tutorialFreedomNote").hidden = state.phase !== "tutorial";
    const completed = phaseCompletion();
    const activeBlockIndex = isChapter ? state.techniqueBlockIndex : techniqueBlockForItem(item);
    const activeBlockLength = state.phase === "tutorial" && activeBlockIndex !== ""
      ? Math.min(state.techniqueBlockSize, state.chapterItems.length - activeBlockIndex * state.techniqueBlockSize)
      : total;
    $("#phaseKicker").textContent = phaseCopy[0];
    $("#taskTitle").textContent = activeBlockIndex === ""
      ? phaseCopy[1]
      : `Group ${activeBlockIndex + 1} of ${state.techniqueBlockCount} · ${activeBlockLength} photos`;
    $("#trialCounter").textContent = isChapter
      ? `${completed} / ${total} · GROUP ${state.techniqueBlockIndex + 1}/${state.techniqueBlockCount}`
      : `${state.trialIndex + 1} / ${total}`;
    $("#trialProgress").style.width = `${((isChapter ? completed : state.trialIndex + 1) / total) * 100}%`;
    const targetReached = state.phase === "navigation" && item.id === target.id;
    $("#photoBadge").textContent = item.id.toUpperCase() + (targetReached ? " · TARGET" : "");
    $("#photoBadge").classList.toggle("target-match", targetReached);
    $("#photoMeta").textContent = `PHOTO ${item.id.toUpperCase()}`;
    $("#mainPhoto").src = item.file;
    $("#mainPhoto").alt = item.alt;
    const idx = state.currentImageIndex;
    if (state.phase === "tutorial") {
      const blockStart = state.techniqueBlockIndex * state.techniqueBlockSize;
      const blockLength = Math.min(state.techniqueBlockSize, state.phaseItems.length - blockStart);
      const localIndex = idx - blockStart;
      $("#backPhoto1").src = state.phaseItems[blockStart + (localIndex + 1) % blockLength].file;
      $("#backPhoto2").src = state.phaseItems[blockStart + (localIndex + 2) % blockLength].file;
    } else {
      $("#backPhoto1").src = state.phaseItems[(idx + 1) % total].file;
      $("#backPhoto2").src = state.phaseItems[(idx + 2) % total].file;
    }
    ensureFirstSeen(item);
    state.selectedLabel = classificationFor(item);
    $("#currentLabel").hidden = !state.selectedLabel;
    $("#currentLabel").textContent = state.selectedLabel ? `${LABELS[state.selectedLabel].icon} ${LABELS[state.selectedLabel].en}` : "";
    $$(".classic-controls button").forEach((button) => button.classList.toggle("selected", button.dataset.label === state.selectedLabel));
    $("#undoBtn").disabled = state.undoStack.length === 0;
    renderTechniqueControls();
    renderRules();
    renderTaskInstruction();
    renderPhaseRail();
  }

  // renderTechniqueControls()：根据当前技术显示四个按钮或斜向手势交互。
  function renderTechniqueControls() {
    const navigation = state.phase === "navigation";
    const technique = currentTechnique();
    $("#classicControls").hidden = navigation || technique !== "classic";
    $("#flickLegend").hidden = navigation || technique !== "flicksort";
    $("#techniqueChip").textContent = navigation ? "NAVIGATION" : technique.toUpperCase();
    const itemBlock = techniqueBlockForItem(displayedItem());
    $("#sideTechnique").textContent = navigation
      ? "NAVIGATION"
      : `GROUP ${(itemBlock === "" ? state.techniqueBlockIndex : itemBlock) + 1}/${state.techniqueBlockCount} · ${technique.toUpperCase()}`;
    document.documentElement.dataset.technique = navigation ? "navigation" : technique;
  }

  // renderRules()：在页面中展示巴士、汽车出现与否的分类规则。
  function renderRules() {
    const nav = state.phase === "navigation";
    $("#ruleCard").hidden = nav;
    if (state.phase === "level1") {
      $("#ruleKeep").textContent = "Bus visible / 有巴士";
      $("#ruleEdit").textContent = "Not used / 不使用";
      $("#ruleMaybe").textContent = "Not used / 不使用";
      $("#ruleReject").textContent = "No bus / 无巴士";
      $("#ruleCard [data-rule=edit]").style.opacity = ".38";
      $("#ruleCard [data-rule=maybe]").style.opacity = ".38";
    } else {
      $("#ruleKeep").textContent = "Bus only / 只有巴士";
      $("#ruleEdit").textContent = "Car only / 只有小汽车";
      $("#ruleMaybe").textContent = "Bus + car / 两者都有";
      $("#ruleReject").textContent = "Neither / 两者都没有";
      $("#ruleCard [data-rule=edit]").style.opacity = "1";
      $("#ruleCard [data-rule=maybe]").style.opacity = "1";
    }
    $("#classicControls").style.opacity = nav ? ".42" : "1";
  }

  // renderTaskInstruction()：更新目标照片、关卡标题及完成要求。
  function renderTaskInstruction() {
    const item = currentItem();
    const navigation = state.phase === "navigation";
    $("#taskBanner").classList.toggle("navigation-mode", navigation);
    $("#navigationTarget").hidden = !navigation;
    if (navigation) $("#navigationTargetId").textContent = item.id.toUpperCase();
    const setTaskPrompt = (text) => {
      $("#taskInstruction").textContent = text;
      $("#photoTaskPrompt").textContent = text;
    };
    if (navigation) {
      setTaskPrompt(`Swipe left or right until ${item.id.toUpperCase()} is visible. Do not classify any photo.`);
      $("#submitHeading").textContent = "Navigation only";
      $("#submitHint").textContent = "Submit when the target picture is visible.";
      $("#submitBtn").innerHTML = "I’m there <span>→</span>";
      $("#submitBtn").classList.remove("incomplete");
      return;
    }
    if (state.phase === "tutorial") {
      const tips = currentTechnique() === "flicksort"
        ? ["FlickSort: swipe diagonally toward the category shown in the rule card.", "FlickSort: ↖ Edit, ↗ Keep, ↙ Maybe, ↘ Reject.", "FlickSort: a short or unclear diagonal swipe cancels safely.", "FlickSort: classify this photo, then press Submit for practice feedback."]
        : ["Classic: tap one of the four category buttons below the photo.", "Classic: use the rule card, then tap the matching category.", "Classic: Undo can correct an accidental button tap.", "Classic: classify this photo, then press Submit for practice feedback."];
      setTaskPrompt(tips[state.trialIndex]);
    } else if (state.phase === "level1") {
      setTaskPrompt("For every photo: if any bus is visible, choose Keep. If no bus is visible, choose Reject.");
    } else {
      setTaskPrompt("Classify every photo: bus only → Keep; car only → Edit; both → Maybe; neither → Reject.");
    }
    if (state.phase === "tutorial") {
      $("#submitHeading").textContent = state.selectedLabel ? `Selected: ${LABELS[state.selectedLabel].en}` : "Choose one category";
      $("#submitHint").textContent = "Practice feedback appears after Submit.";
      $("#submitBtn").innerHTML = "Submit <span>→</span>";
      $("#submitBtn").classList.toggle("incomplete", !state.selectedLabel);
      return;
    }
    const total = state.phaseItems.length;
    const completed = phaseCompletion();
    const missing = state.phaseItems.filter((photo) => !state.classifications.has(itemKey(photo))).map((photo) => photo.id.toUpperCase());
    const hasNextBlock = state.techniqueBlockIndex + 1 < state.techniqueBlockCount;
    const nextTechnique = hasNextBlock
      ? state.techniqueAssignments.get(itemKey(state.chapterItems[(state.techniqueBlockIndex + 1) * state.techniqueBlockSize]))
      : "";
    const groupLabel = `Group ${state.techniqueBlockIndex + 1}/${state.techniqueBlockCount}`;
    $("#submitHeading").textContent = missing.length
      ? `${groupLabel} · ${completed}/${total} completed`
      : `✓ ${groupLabel} completed · ${total}/${total}`;
    $("#submitHint").textContent = missing.length
      ? `Still unfinished: ${missing.join(", ")}`
      : hasNextBlock
        ? `Continue when ready. The next group uses ${nextTechnique === "classic" ? "Classic" : "FlickSort"}.`
        : "All photos are classified. Review this group or submit the chapter.";
    $("#submitBtn").innerHTML = hasNextBlock
      ? `Continue to ${nextTechnique === "classic" ? "Classic" : "FlickSort"} group <span>→</span>`
      : "Submit chapter <span>→</span>";
    $("#submitBtn").classList.toggle("incomplete", missing.length > 0);
    $("#submitBtn").setAttribute("aria-disabled", missing.length ? "true" : "false");
  }

  // renderPhaseRail()：更新测试的关卡列表与进度。
  function renderPhaseRail() {
    $$(".phase-list > div").forEach((row) => {
      row.classList.toggle("active", row.dataset.phase === state.phase);
      row.classList.toggle("done", state.completedPhases.has(row.dataset.phase));
    });
  }

  // changePhoto()：左右滑动时更改照片索引并记录导航事件。
  function changePhoto(delta, source, gesture = {}) {
    const count = state.phaseItems.length;
    if (!count) return;
    syncActiveTimer();
    if (state.phase === "tutorial") {
      const blockStart = state.techniqueBlockIndex * state.techniqueBlockSize;
      const blockLength = Math.min(state.techniqueBlockSize, count - blockStart);
      const localIndex = state.currentImageIndex - blockStart;
      state.currentImageIndex = blockStart + (localIndex + delta + blockLength) % blockLength;
    } else {
      state.currentImageIndex = (state.currentImageIndex + delta + count) % count;
    }
    logEvent("navigation", { source, direction: delta > 0 ? "next" : "previous", ...gesture });
    animateFlyout(delta > 0 ? "next" : "previous");
    render();
  }

  // classify()：将标签写进该照片的分类记录，同时保存可撤销历史。
  function classify(label, source, gesture = {}) {
    syncActiveTimer();
    const item = displayedItem();
    if (state.phase === "navigation") {
      state.navMistouches += 1;
      logEvent("navigation_mistouch", { attempted_label: label, source, explicit_error_type: "classification_during_navigation", ...gesture });
      showToast("Navigation only — classification counted as a miscue");
      animateFlyout(label);
      return;
    }
    const key = itemKey(item);
    const firstSeen = ensureFirstSeen(item);
    const previous = state.classifications.get(key) || null;
    const previousDetail = state.classificationDetails.get(key) || null;
    // 本次有效分类以UTC时间记录；再次改选会更新，Undo则恢复之前的分类及其结束时间。
    const classifiedAt = nowIso();
    state.undoStack.push({ previous, previousDetail, next: label, imageId: item.id, key });
    state.selectedLabel = label;
    state.classifications.set(key, label);
    // 逐图保存首次显示时间和最终有效分类时间，不把整个区块的Submit当作所有图片的结束时刻。
    state.classificationDetails.set(key, {
      technique: currentTechnique(item),
      decision_elapsed_ms: Math.round(performance.now() - firstSeen.monotonic),
      trial_start_time: firstSeen.iso,
      trial_end_time: classifiedAt,
      classified_at: classifiedAt, source
    });
    logEvent("classification", { label, source, image_id: item.id, previous_label: previous || "", ...gesture });
    animateFlyout(label);
    render();
  }

  // undo()：撤销最近一次分类，更改标签；原照片并未删除。
  function undo() {
    const action = state.undoStack.pop();
    if (!action) return;
    const reason = $("#undoReason").value;
    state.totalUndos += 1;
    if (reason === "accidental_input") state.accidentalClassifications += 1;
    if (action.previous) {
      state.classifications.set(action.key, action.previous);
      state.classificationDetails.set(action.key, action.previousDetail);
    } else {
      state.classifications.delete(action.key);
      state.classificationDetails.delete(action.key);
    }
    state.selectedLabel = classificationFor();
    logEvent("undo", { undone_label: action.next, restored_label: action.previous || "", undo_reason: reason, explicit_accidental_classification: reason === "accidental_input" ? 1 : 0 });
    $("#undoReason").value = "unspecified";
    render();
  }

  // submitTrial()：检查试次是否完成并保存数据，再进入下一个任务或技术区块。
  function submitTrial() {
    syncActiveTimer();
    const target = currentItem();
    const duration = Math.max(0, performance.now() - state.trialStart - state.trialPausedMs);
    const submittedAt = nowIso();
    if (state.phase === "navigation") {
      const correct = displayedItem().id === target.id;
      state.trials.push(trialRecord(target, "navigation_only", {
        final_response: "navigation_only", accuracy: "", content_judgment_error: "", navigation_correct: correct ? 1 : 0,
        trial_start_time: state.trialStartTime, trial_end_time: submittedAt,
        trial_duration_ms: Math.round(duration), submitted_at: submittedAt
      }));
      logEvent("trial_submit", { navigation_correct: correct ? 1 : 0 });
      nextTrial();
      return;
    }
    if (state.phase === "tutorial") {
      const practiceItem = displayedItem();
      const response = classificationFor(practiceItem);
      if (!response) return showToast("Choose a category first");
      const correct = response === practiceItem.answer;
      const detail = state.classificationDetails.get(itemKey(practiceItem)) || {};
      state.trials.push(trialRecord(practiceItem, currentTechnique(practiceItem), {
        final_response: response, accuracy: correct ? 1 : 0,
        content_judgment_error: correct ? 0 : 1, navigation_correct: "",
        trial_start_time: detail.trial_start_time || state.trialStartTime,
        trial_end_time: detail.trial_end_time || "", trial_duration_ms: Math.round(duration),
        classified_at: detail.classified_at || "", classification_source: detail.source || "",
        practice_flag: 1, submitted_at: submittedAt
      }));
      logEvent("trial_submit", { final_response: response, correct_answer: practiceItem.answer, accuracy: correct ? 1 : 0, explicit_error_type: correct ? "none" : "content_judgment_error" });
      showToast(correct ? "Correct / 正确" : `Practice answer: ${LABELS[practiceItem.answer].en}`);
      setTimeout(nextTrial, 650);
      return;
    }
    // 只有本区块每张照片都分类后才能提交；区块内允许自由翻页和修改分类。
    const missing = state.phaseItems.filter((item) => !state.classifications.has(itemKey(item)));
    if (missing.length) {
      const ids = missing.map((item) => item.id.toUpperCase()).join(", ");
      logEvent("technique_block_submit_blocked", { unfinished_image_ids: ids, unfinished_count: missing.length });
      return showToast(`Group ${state.techniqueBlockIndex + 1} unfinished: ${ids}`, 3600);
    }
    const hasNextBlock = state.techniqueBlockIndex + 1 < state.techniqueBlockCount;
    logEvent("technique_block_complete", {
      technique_block_index: state.techniqueBlockIndex + 1,
      block_technique: currentTechnique(),
      completed_count: state.phaseItems.length
    });
    if (hasNextBlock) {
      activateTechniqueBlock(state.techniqueBlockIndex + 1, true);
      return;
    }
    // 完成整个章节后逐图产生Trial记录；每张图的时间来自自己的首次显示与有效分类事件。
    state.chapterItems.forEach((item, index) => {
      const response = state.classifications.get(itemKey(item));
      const detail = state.classificationDetails.get(itemKey(item)) || {};
      const correct = response === item.answer;
      const blockIndex = Math.floor(index / state.techniqueBlockSize);
      state.trials.push(trialRecord(item, state.techniqueAssignments.get(itemKey(item)), {
        trial_index: index + 1, final_response: response, accuracy: correct ? 1 : 0,
        content_judgment_error: correct ? 0 : 1, navigation_correct: "",
        trial_start_time: detail.trial_start_time || "", trial_end_time: detail.trial_end_time || "",
        trial_duration_ms: detail.decision_elapsed_ms ?? "", classified_at: detail.classified_at || "",
        classification_source: detail.source || "", practice_flag: 0,
        technique_block_index: blockIndex + 1, technique_block_count: state.techniqueBlockCount,
        technique_block_size: Math.min(state.techniqueBlockSize, state.chapterItems.length - blockIndex * state.techniqueBlockSize),
        block_image_index: (index % state.techniqueBlockSize) + 1,
        free_processing_order_within_block: 1, submitted_at: submittedAt
      }));
    });
    logEvent("chapter_submit", {
      completed_count: state.chapterItems.length,
      free_processing_order_within_block: 1,
      technique_block_count: state.techniqueBlockCount
    });
    advancePhase();
  }

  // trialRecord()：把任务最终结果整理成可导出的Trials CSV数据行。
  function trialRecord(item = currentItem(), technique = currentTechnique(item), extra = {}) {
    const itemBlock = techniqueBlockForItem(item);
    return {
      participant_id: state.participant, technique, run_technique: state.technique, run_mode: state.runMode,
      build_version: BUILD, asset_set: ASSET_SET, benchmark_status: "provisional_demonstration_not_pilot_validated",
      t_ref_ms: T_REF_MS, phase: state.phase, trial_index: state.trialIndex + 1,
      target_image_id: item.id, image_title: item.title, contains_bus: item.contains_bus ? 1 : 0,
      contains_car: item.contains_car ? 1 : 0, correct_answer: state.phase === "navigation" ? "navigation_only" : item.answer,
      undo_count_total: state.totalUndos, cancel_count_total: state.totalCancels,
      accidental_classification_count_total: state.accidentalClassifications,
      navigation_mistouch_count_total: state.navMistouches,
      active_operation_time_ms_total: Math.round(state.activeMs), technique_order_seed: state.randomizationSeed,
      assignment_method: itemBlock === "" ? "" : "random_start_then_two_contiguous_technique_blocks",
      technique_block_index: itemBlock === "" ? "" : itemBlock + 1,
      technique_block_count: itemBlock === "" ? "" : state.techniqueBlockCount,
      technique_block_size: itemBlock === "" ? "" : Math.min(state.techniqueBlockSize, state.chapterItems.length - itemBlock * state.techniqueBlockSize),
      submitted_at: nowIso(), trial_start_time: "", trial_end_time: "", ...extra
    };
  }

  // nextTrial()：推进到下一条试次，必要时完成当前关卡。
  function nextTrial() {
    if (state.trialIndex + 1 >= state.phaseItems.length) {
      setTimeout(advancePhase, state.phase === "tutorial" ? 450 : 120);
      return;
    }
    state.trialIndex += 1;
    beginTrial();
  }

  // V3 app.js直接复用scoring.js中的手势算法，避免两处阈值不一致。
  const interpretGesture = (dx, dy) => FlickSortScoring.interpretGesture(dx, dy, MIN_GESTURE);

  // pointerDown()：手指触碰照片时保存触点ID、起始位置和时间。
  function pointerDown(event) {
    if (event.button != null && event.button !== 0) return;
    if (state.activePointer) return;
    state.activePointer = { id: event.pointerId, x: event.clientX, y: event.clientY, t: performance.now(), type: event.pointerType };
    $("#touchZone").setPointerCapture?.(event.pointerId);
    $("#touchZone").classList.add("dragging");
  }

  // pointerMove()：拖动时计算偏移，更新提示及动画；暂不写入最终分类。
  function pointerMove(event) {
    const p = state.activePointer;
    if (!p || p.id !== event.pointerId) return;
    if (event.cancelable) event.preventDefault();
    const dx = event.clientX - p.x, dy = event.clientY - p.y;
    const card = $("#gestureCard");
    card.style.transform = `translate3d(${dx * .45}px,${dy * .45}px,0) rotate(${dx * .025}deg) scale(.99)`;
    const guess = interpretGesture(dx, dy);
    const preview = $("#gesturePreview");
    $$(".corner-target").forEach((corner) => corner.classList.remove("targeted"));
    if (Math.hypot(dx, dy) > 22) {
      const text = guess.action ? (LABELS[guess.action]?.en || guess.action) : "Cancel";
      preview.textContent = Math.hypot(dx, dy) < MIN_GESTURE ? `${text} · keep moving` : text;
      preview.classList.add("show");
      if (LABELS[guess.action]) $(`.corner-target.${guess.action}`).classList.add("targeted");
    }
  }

  // pointerUp()：手指松开时识别方向，并决定翻页、分类或取消。
  function pointerUp(event) {
    const p = state.activePointer;
    if (!p || p.id !== event.pointerId) return;
    state.activePointer = null;
    resetDrag();
    const dx = event.clientX - p.x, dy = event.clientY - p.y;
    const duration = Math.max(1, performance.now() - p.t);
    const result = interpretGesture(dx, dy);
    // 为每次松手记录设备类型、位移、角度、用时及判定原因，方便后续分析误触和取消。
    const meta = { pointer_type: p.type, gesture_dx: Math.round(dx), gesture_dy: Math.round(dy), distance_px: Math.round(result.distance), angle_deg: Math.round(result.angle), duration_ms: Math.round(duration), recognized_action: result.action || "cancel", decision_reason: result.reason };
    // 两种模式的有效水平滑动都只翻一张；只有FlickSort允许斜向手势执行分类。
    if (result.action === "next" || result.action === "previous") return changePhoto(result.action === "next" ? 1 : -1, "swipe", meta);
    const technique = currentTechnique();
    if (technique === "flicksort" && LABELS[result.action]) return classify(result.action, "gesture", meta);
    if (technique === "flicksort" && result.distance >= 18) {
      state.totalCancels += 1;
      state.phaseCancelCount += 1;
      logEvent("gesture_cancel", { ...meta, explicit_error_type: "trajectory_cancel" });
      showToast("Gesture cancelled / 手势已取消");
    } else if (technique === "classic" && result.distance >= 18) {
      logEvent("non_horizontal_swipe_ignored", meta);
    }
  }

  // resetDrag()：清除临时拖拽位移和方向提示。
  function resetDrag() {
    $("#touchZone").classList.remove("dragging");
    $("#gestureCard").style.transform = "";
    $("#gesturePreview").classList.remove("show");
    $$(".corner-target").forEach((corner) => corner.classList.remove("targeted"));
  }

  // animateFlyout()：播放卡片飞出回弹动画，视觉效果不负责识别输入方向。
  function animateFlyout(action) {
    const source = $("#mainPhoto");
    if (!source.src || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ghost = document.createElement("div");
    ghost.className = "flyout";
    ghost.style.backgroundImage = `url("${source.src}")`;
    $("#touchZone").appendChild(ghost);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const transforms = {
        next: "translateX(-125%) rotate(-9deg)", previous: "translateX(125%) rotate(9deg)",
        edit: "translate(-105%,-95%) rotate(-14deg)", keep: "translate(105%,-95%) rotate(14deg)",
        maybe: "translate(-105%,95%) rotate(12deg)", reject: "translate(105%,95%) rotate(-12deg)"
      };
      ghost.style.transform = transforms[action] || "scale(.88)";
      ghost.style.opacity = "0";
    }));
    setTimeout(() => ghost.remove(), 430);
  }

  // showToast()：弹出短时文字提示。
  function showToast(message, duration = 1500) {
    clearTimeout(state.toastTimer);
    $("#toast").textContent = message;
    $("#toast").classList.add("show");
    state.toastTimer = setTimeout(() => $("#toast").classList.remove("show"), duration);
  }

  // clearToast()：清除浮层提示。
  function clearToast() {
    clearTimeout(state.toastTimer);
    $("#toast")?.classList.remove("show");
  }

  // showResults()：把成绩、准确率、用时、Undo与Cancel等结果渲染到最终画面。
  function showResults() {
    syncActiveTimer();
    state.finished = true;
    $("#studyScreen").hidden = true;
    $("#resultsScreen").hidden = false;
    const scored = state.trials.filter((trial) => ["level1", "level2"].includes(trial.phase));
    const nav = state.trials.filter((trial) => trial.phase === "navigation");
    const correct = scored.reduce((sum, trial) => sum + Number(trial.accuracy || 0), 0);
    const navCorrect = nav.reduce((sum, trial) => sum + Number(trial.navigation_correct || 0), 0);
    // 这是Classic与FlickSort混合区块的总体演示分数；正式技术比较必须按Trial中的technique分别分析。
    const result = FlickSortScoring.computeScore({ correct, classificationTotal: scored.length, activeMs: state.activeMs, tRefMs: T_REF_MS, navCorrect, navTotal: nav.length });
    $("#overallScore").textContent = result.score;
    $("#accuracyMetric").textContent = `${Math.round(result.classificationRatio * 100)}%`;
    $("#timeMetric").textContent = formatTime(state.activeMs);
    // Tutorial events remain in the audit log but never contribute to the displayed formal results.
    const formalEvents = state.events.filter((event) => event.phase !== "tutorial");
    $("#cancelMetric").textContent = formalEvents.filter((event) => event.event_type === "gesture_cancel").length;
    $("#undoMetric").textContent = formalEvents.filter((event) => event.event_type === "undo").length;
    $("#navErrorMetric").textContent = state.navMistouches;
    $("#navCorrectMetric").textContent = `${navCorrect} / ${nav.length}`;
    $("#resultParticipant").textContent = state.participant;
    $("#resultTechnique").textContent = "Mixed · grouped alternation";
    $("#resultBuild").textContent = `v${BUILD}`;
    $("#resultTimestamp").textContent = new Date().toLocaleString([], { hour12: false });
    $("#scoreLabel").textContent = state.runMode === "pilot" ? "Pilot overview" : "Demo preview · not comparable";
    $("#formulaText").textContent = `Score = 70×(${correct}/${scored.length}) + 20×clip((2×180s−${(state.activeMs/1000).toFixed(1)}s)/180s,0,1) + 10×(${navCorrect}/${nav.length}) = ${result.score}`;
    logEvent("results_shown", { overall_score: result.score, classification_correct: correct, classification_total: scored.length, navigation_correct: navCorrect, navigation_total: nav.length, active_operation_time_ms: Math.round(state.activeMs) });
  }

  // formatTime()：将毫秒转换为可读的时间格式。
  function formatTime(ms) {
    const seconds = Math.max(0, ms) / 1000;
    const mins = Math.floor(seconds / 60);
    return `${mins}:${(seconds % 60).toFixed(1).padStart(4, "0")}`;
  }

  // csvEscape()：对CSV引号、逗号、换行进行转义，避免数据错列。
  function csvEscape(value) {
    const text = value == null ? "" : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  // toCsv()：将对象数组转换为CSV表头和数据行。
  function toCsv(rows) {
    if (!rows.length) return "";
    const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    return [headers.join(","), ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(","))].join("\r\n");
  }

  // downloadCsv()：将Trials或Events日志作为本地CSV下载；GitHub Pages不会自动上传数据。
  function downloadCsv(kind) {
    const rows = kind === "trials" ? state.trials : state.events;
    const blob = new Blob(["\uFEFF" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `flicksort_${kind}_${state.participant}_mixed-blocks_${Date.now()}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  // startRun()：读取匿名编号与Demo/Pilot设置，开始本次运行。
  function startRun(event) {
    event.preventDefault();
    state.participant = $("#participantId").value.trim().replace(/[^a-zA-Z0-9_-]/g, "-");
    if (!state.participant) {
      state.participant = generateParticipantId();
      $("#participantId").value = state.participant;
    }
    state.runMode = new FormData(event.currentTarget).get("runMode");
    const seed = new Uint32Array(1);
    crypto.getRandomValues(seed);
    state.randomizationSeed = seed[0];
    $("#setupScreen").hidden = true;
    $("#studyScreen").hidden = false;
    $("#sideTechnique").textContent = "GROUPED · AUTO";
    $("#sideParticipant").textContent = state.participant;
    logEvent("run_start", { benchmark_status: "provisional_demonstration_not_pilot_validated", t_ref_ms: T_REF_MS, technique_order_seed: state.randomizationSeed, assignment_method: "random_start_then_two_contiguous_technique_blocks" });
    startPhase(phaseSequence()[0]);
  }

  // resetRun()：重载网页并重置本地运行状态。
  function resetRun() { location.reload(); }

  // onVisibilityChange()：浏览器切到后台时暂停有效操作计时。
  function onVisibilityChange() {
    // 网页切到后台后暂停有效操作计时；ISO绝对时间仍独立用于审计时间先后。
    if (document.hidden) {
      syncActiveTimer();
      state.hiddenAt = performance.now();
      state.lastTimerSync = null;
      logEvent("timer_paused_hidden");
    } else {
      if (state.hiddenAt != null) state.trialPausedMs += performance.now() - state.hiddenAt;
      state.hiddenAt = null;
      resetTimerTick();
      logEvent("timer_resumed_visible");
    }
  }

  // 返回主页时确认离开未结束的测试；确认后跳过浏览器重复的离开提示。
  let homeNavigationApproved = false;
  function confirmHomeNavigation(event) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (state.phase === "setup" || state.finished) return;
    const message = "Leave this test and return to the home page? Any data you have not downloaded will be lost.";
    const localized = window.FlickSortLanguage?.t(message) || message;
    if (!window.confirm(localized)) { event.preventDefault(); return; }
    homeNavigationApproved = true;
  }

  // init()：载入素材manifest，绑定按钮和触摸监听器，初始化页面。
  async function init() {
    $("#buildLabel").textContent = BUILD;
    $("#participantId").value = generateParticipantId();
    $$("[data-return-home]").forEach((link) => link.addEventListener("click", confirmHomeNavigation));
    try {
      const response = await fetch("image_manifest.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
      state.manifest = await response.json();
    } catch (error) {
      $("#setupForm").innerHTML = `<p><strong>Study assets could not load.</strong></p><p>Serve this folder over HTTP (for example GitHub Pages) instead of opening the file directly.</p><pre>${String(error.message)}</pre>`;
      return;
    }
    $("#setupForm").addEventListener("submit", startRun);
    $("#submitBtn").addEventListener("click", submitTrial);
    $("#undoBtn").addEventListener("click", undo);
    $$(".classic-controls button").forEach((button) => button.addEventListener("click", () => classify(button.dataset.label, "button")));
    $("#touchZone").addEventListener("pointerdown", pointerDown);
    $("#touchZone").addEventListener("pointermove", pointerMove);
    $("#touchZone").addEventListener("pointerup", pointerUp);
    $("#touchZone").addEventListener("pointercancel", () => { state.activePointer = null; resetDrag(); logEvent("pointer_cancel"); });
    $("#downloadTrials").addEventListener("click", () => downloadCsv("trials"));
    $("#downloadEvents").addEventListener("click", () => downloadCsv("events"));
    $("#restartBtn").addEventListener("click", resetRun);
    $("#quitBtn").addEventListener("click", resetRun);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", (event) => { if (!homeNavigationApproved && state.trials.length && !state.finished) { event.preventDefault(); event.returnValue = ""; } });
  }

  window.FlickSortStudy = { state, interpretGesture, toCsv, formatTime, BUILD, T_REF_MS };
  init();
})();


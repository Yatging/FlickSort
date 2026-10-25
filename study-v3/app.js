(function () {
  "use strict";

  const BUILD = "3.2.0";
  const ASSET_SET = "image-selection-realistic-v2";
  const T_REF_MS = 180000;
  const MIN_GESTURE = 60;
  const LABELS = {
    keep: { en: "Keep", zh: "保留", icon: "✓" },
    edit: { en: "Edit", zh: "编辑", icon: "✎" },
    maybe: { en: "Maybe", zh: "待定", icon: "?" },
    reject: { en: "Reject", zh: "拒绝", icon: "×" }
  };
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const nowIso = () => new Date().toISOString();
  function generateParticipantId() {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    return `P-${random[0].toString(36).toUpperCase().padStart(7, "0")}`;
  }

  const state = {
    manifest: [], participant: "", technique: "mixed_auto_grouped", runMode: "demo",
    phase: "setup", phaseItems: [], trialIndex: 0, currentImageIndex: 0,
    selectedLabel: null, trialStart: 0, trialPausedMs: 0, hiddenAt: null,
    activeMs: 0, lastTimerSync: null, classifications: new Map(), undoStack: [],
    trials: [], events: [], phaseCancelCount: 0, totalCancels: 0, totalUndos: 0,
    accidentalClassifications: 0, navMistouches: 0, activePointer: null,
    toastTimer: null, completedPhases: new Set(), finished: false,
    randomizationSeed: 0, techniqueAssignments: new Map(), classificationDetails: new Map(),
    firstSeenAt: new Map(), phaseStart: 0, chapterItems: [], techniqueBlockIndex: 0,
    techniqueBlockCount: 0, techniqueBlockSize: 0
  };

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

  function currentItem() { return state.phaseItems[state.trialIndex] || null; }
  function displayedItem() {
    if (!state.phaseItems.length) return null;
    return state.phaseItems[(state.currentImageIndex + state.phaseItems.length) % state.phaseItems.length];
  }

  function itemKey(item = displayedItem(), phase = state.phase) {
    return item ? `${phase}:${item.id}` : "";
  }

  function currentTechnique(item = displayedItem()) {
    if (!item || state.phase === "navigation" || state.phase === "setup" || state.phase === "results") return state.technique;
    return state.techniqueAssignments.get(itemKey(item)) || "classic";
  }

  function classificationFor(item = displayedItem()) {
    return state.classifications.get(itemKey(item)) || null;
  }

  function phaseCompletion() {
    return state.phaseItems.filter((item) => state.classifications.has(itemKey(item))).length;
  }

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

  function techniqueBlockForItem(item) {
    if (!item || !state.chapterItems.length || !state.techniqueBlockSize) return "";
    const index = state.chapterItems.findIndex((candidate) => candidate.id === item.id);
    return index < 0 ? "" : Math.floor(index / state.techniqueBlockSize);
  }

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

  function itemsForLevel(level) { return state.manifest.filter((item) => item.level === level); }
  function balancedLevel2Items() {
    const ids = ["l2-01", "l2-02", "l2-04", "l2-07", "l2-08", "l2-10", "l2-03", "l2-05", "l2-06", "l2-09", "l2-11", "l2-12"];
    return ids.map((id) => state.manifest.find((item) => item.id === id));
  }
  function representativeItems() {
    return ["l2-01", "l2-07", "l2-04", "l2-10"].map((id) => state.manifest.find((item) => item.id === id));
  }
  function tutorialItems() {
    return ["l2-02", "l2-08", "l2-05", "l2-11"].map((id) => state.manifest.find((item) => item.id === id));
  }
  function navigationItems(full) {
    const ids = full ? ["l1-03", "l2-05", "l1-10", "l2-09"] : ["l1-03", "l2-09"];
    return ids.map((id) => state.manifest.find((item) => id === item.id));
  }

  function phaseSequence() {
    return state.runMode === "pilot"
      ? ["tutorial", "level1", "level2", "navigation", "results"]
      : ["level2", "navigation", "results"];
  }

  function syncActiveTimer() {
    if (!["level1", "level2", "navigation"].includes(state.phase) || document.hidden) return;
    const tick = performance.now();
    if (state.lastTimerSync != null) state.activeMs += tick - state.lastTimerSync;
    state.lastTimerSync = tick;
  }

  function resetTimerTick() {
    state.lastTimerSync = (!["level1", "level2", "navigation"].includes(state.phase) || document.hidden)
      ? null : performance.now();
  }

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

  function advancePhase() {
    const seq = phaseSequence();
    const next = seq[seq.indexOf(state.phase) + 1] || "results";
    startPhase(next);
  }

  function beginTrial() {
    const previousBlock = state.techniqueBlockIndex;
    if (state.phase === "tutorial") state.techniqueBlockIndex = Math.floor(state.trialIndex / state.techniqueBlockSize);
    state.selectedLabel = null;
    state.undoStack = [];
    state.currentImageIndex = state.phase === "navigation"
      ? (state.trialIndex + 1) % state.phaseItems.length
      : state.trialIndex;
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
    $("#photoBadge").textContent = item.id.toUpperCase() + (state.phase === "navigation" && item.id === target.id ? " · TARGET" : "");
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
    if (!state.firstSeenAt.has(itemKey(item))) state.firstSeenAt.set(itemKey(item), performance.now());
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

  function renderTaskInstruction() {
    const item = currentItem();
    const setTaskPrompt = (text) => {
      $("#taskInstruction").textContent = text;
      $("#photoTaskPrompt").textContent = text;
    };
    if (state.phase === "navigation") {
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
    $("#submitHeading").textContent = missing.length
      ? `${completed} of ${total} photos classified`
      : hasNextBlock ? `Group ${state.techniqueBlockIndex + 1} complete` : "Final group complete";
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

  function renderPhaseRail() {
    $$(".phase-list > div").forEach((row) => {
      row.classList.toggle("active", row.dataset.phase === state.phase);
      row.classList.toggle("done", state.completedPhases.has(row.dataset.phase));
    });
  }

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
    const previous = state.classifications.get(key) || null;
    const previousDetail = state.classificationDetails.get(key) || null;
    state.undoStack.push({ previous, previousDetail, next: label, imageId: item.id, key });
    state.selectedLabel = label;
    state.classifications.set(key, label);
    state.classificationDetails.set(key, {
      technique: currentTechnique(item),
      decision_elapsed_ms: Math.round(performance.now() - (state.firstSeenAt.get(key) || state.phaseStart)),
      classified_at: nowIso(), source
    });
    logEvent("classification", { label, source, image_id: item.id, previous_label: previous || "", ...gesture });
    animateFlyout(label);
    render();
  }

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

  function submitTrial() {
    syncActiveTimer();
    const target = currentItem();
    const duration = Math.max(0, performance.now() - state.trialStart - state.trialPausedMs);
    if (state.phase === "navigation") {
      const correct = displayedItem().id === target.id;
      state.trials.push(trialRecord(target, "navigation_only", { final_response: "navigation_only", accuracy: "", content_judgment_error: "", navigation_correct: correct ? 1 : 0, trial_duration_ms: Math.round(duration) }));
      logEvent("trial_submit", { navigation_correct: correct ? 1 : 0 });
      nextTrial();
      return;
    }
    if (state.phase === "tutorial") {
      const practiceItem = displayedItem();
      const response = classificationFor(practiceItem);
      if (!response) return showToast("Choose a category first");
      const correct = response === practiceItem.answer;
      state.trials.push(trialRecord(practiceItem, currentTechnique(practiceItem), {
        final_response: response, accuracy: correct ? 1 : 0,
        content_judgment_error: correct ? 0 : 1, navigation_correct: "",
        trial_duration_ms: Math.round(duration), practice_flag: 1
      }));
      logEvent("trial_submit", { final_response: response, correct_answer: practiceItem.answer, accuracy: correct ? 1 : 0, explicit_error_type: correct ? "none" : "content_judgment_error" });
      showToast(correct ? "Correct / 正确" : `Practice answer: ${LABELS[practiceItem.answer].en}`);
      setTimeout(nextTrial, 650);
      return;
    }
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
    state.chapterItems.forEach((item, index) => {
      const response = state.classifications.get(itemKey(item));
      const detail = state.classificationDetails.get(itemKey(item)) || {};
      const correct = response === item.answer;
      const blockIndex = Math.floor(index / state.techniqueBlockSize);
      state.trials.push(trialRecord(item, state.techniqueAssignments.get(itemKey(item)), {
        trial_index: index + 1, final_response: response, accuracy: correct ? 1 : 0,
        content_judgment_error: correct ? 0 : 1, navigation_correct: "",
        trial_duration_ms: detail.decision_elapsed_ms || "", classified_at: detail.classified_at || "",
        classification_source: detail.source || "", practice_flag: 0,
        technique_block_index: blockIndex + 1, technique_block_count: state.techniqueBlockCount,
        technique_block_size: Math.min(state.techniqueBlockSize, state.chapterItems.length - blockIndex * state.techniqueBlockSize),
        block_image_index: (index % state.techniqueBlockSize) + 1,
        free_processing_order_within_block: 1
      }));
    });
    logEvent("chapter_submit", {
      completed_count: state.chapterItems.length,
      free_processing_order_within_block: 1,
      technique_block_count: state.techniqueBlockCount
    });
    advancePhase();
  }

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
      submitted_at: nowIso(), ...extra
    };
  }

  function nextTrial() {
    if (state.trialIndex + 1 >= state.phaseItems.length) {
      setTimeout(advancePhase, state.phase === "tutorial" ? 450 : 120);
      return;
    }
    state.trialIndex += 1;
    beginTrial();
  }

  const interpretGesture = (dx, dy) => FlickSortScoring.interpretGesture(dx, dy, MIN_GESTURE);

  function pointerDown(event) {
    if (event.button != null && event.button !== 0) return;
    if (state.activePointer) return;
    state.activePointer = { id: event.pointerId, x: event.clientX, y: event.clientY, t: performance.now(), type: event.pointerType };
    $("#touchZone").setPointerCapture?.(event.pointerId);
    $("#touchZone").classList.add("dragging");
  }

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

  function pointerUp(event) {
    const p = state.activePointer;
    if (!p || p.id !== event.pointerId) return;
    state.activePointer = null;
    resetDrag();
    const dx = event.clientX - p.x, dy = event.clientY - p.y;
    const duration = Math.max(1, performance.now() - p.t);
    const result = interpretGesture(dx, dy);
    const meta = { pointer_type: p.type, gesture_dx: Math.round(dx), gesture_dy: Math.round(dy), distance_px: Math.round(result.distance), angle_deg: Math.round(result.angle), duration_ms: Math.round(duration), recognized_action: result.action || "cancel", decision_reason: result.reason };
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

  function resetDrag() {
    $("#touchZone").classList.remove("dragging");
    $("#gestureCard").style.transform = "";
    $("#gesturePreview").classList.remove("show");
    $$(".corner-target").forEach((corner) => corner.classList.remove("targeted"));
  }

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

  function showToast(message, duration = 1500) {
    clearTimeout(state.toastTimer);
    $("#toast").textContent = message;
    $("#toast").classList.add("show");
    state.toastTimer = setTimeout(() => $("#toast").classList.remove("show"), duration);
  }

  function clearToast() {
    clearTimeout(state.toastTimer);
    $("#toast")?.classList.remove("show");
  }

  function showResults() {
    syncActiveTimer();
    state.finished = true;
    $("#studyScreen").hidden = true;
    $("#resultsScreen").hidden = false;
    const scored = state.trials.filter((trial) => ["level1", "level2"].includes(trial.phase));
    const nav = state.trials.filter((trial) => trial.phase === "navigation");
    const correct = scored.reduce((sum, trial) => sum + Number(trial.accuracy || 0), 0);
    const navCorrect = nav.reduce((sum, trial) => sum + Number(trial.navigation_correct || 0), 0);
    const result = FlickSortScoring.computeScore({ correct, classificationTotal: scored.length, activeMs: state.activeMs, tRefMs: T_REF_MS, navCorrect, navTotal: nav.length });
    $("#overallScore").textContent = result.score;
    $("#accuracyMetric").textContent = `${Math.round(result.classificationRatio * 100)}%`;
    $("#timeMetric").textContent = formatTime(state.activeMs);
    $("#cancelMetric").textContent = state.totalCancels;
    $("#undoMetric").textContent = state.totalUndos;
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

  function formatTime(ms) {
    const seconds = Math.max(0, ms) / 1000;
    const mins = Math.floor(seconds / 60);
    return `${mins}:${(seconds % 60).toFixed(1).padStart(4, "0")}`;
  }

  function csvEscape(value) {
    const text = value == null ? "" : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function toCsv(rows) {
    if (!rows.length) return "";
    const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    return [headers.join(","), ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(","))].join("\r\n");
  }

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

  function resetRun() { location.reload(); }

  function onVisibilityChange() {
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

  async function init() {
    $("#buildLabel").textContent = BUILD;
    $("#participantId").value = generateParticipantId();
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
    window.addEventListener("beforeunload", (event) => { if (state.trials.length && !state.finished) { event.preventDefault(); event.returnValue = ""; } });
  }

  window.FlickSortStudy = { state, interpretGesture, toCsv, formatTime, BUILD, T_REF_MS };
  init();
})();

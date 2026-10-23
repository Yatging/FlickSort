(function () {
  "use strict";

  const BUILD = "3.0.0";
  const ASSET_SET = "city-vehicles-v1";
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

  const state = {
    manifest: [], participant: "", technique: "classic", runMode: "demo",
    phase: "setup", phaseItems: [], trialIndex: 0, currentImageIndex: 0,
    selectedLabel: null, trialStart: 0, trialPausedMs: 0, hiddenAt: null,
    activeMs: 0, lastTimerSync: null, classifications: new Map(), undoStack: [],
    trials: [], events: [], phaseCancelCount: 0, totalCancels: 0, totalUndos: 0,
    accidentalClassifications: 0, navMistouches: 0, activePointer: null,
    toastTimer: null, completedPhases: new Set(), finished: false
  };

  function logEvent(type, detail = {}) {
    const item = currentItem();
    state.events.push({
      event_timestamp: nowIso(), build_version: BUILD, asset_set: ASSET_SET,
      participant_id: state.participant, technique: state.technique,
      run_mode: state.runMode, phase: state.phase, trial_index: state.trialIndex + 1,
      target_image_id: item?.id || "", displayed_image_id: displayedItem()?.id || "",
      event_type: type, ...detail
    });
  }

  function currentItem() { return state.phaseItems[state.trialIndex] || null; }
  function displayedItem() {
    if (!state.phaseItems.length) return null;
    return state.phaseItems[(state.currentImageIndex + state.phaseItems.length) % state.phaseItems.length];
  }

  function itemsForLevel(level) { return state.manifest.filter((item) => item.level === level); }
  function representativeItems() {
    return ["l2-01", "l2-04", "l2-07", "l2-10"].map((id) => state.manifest.find((item) => item.id === id));
  }
  function tutorialItems() {
    return ["l2-02", "l2-05", "l2-08", "l2-11"].map((id) => state.manifest.find((item) => item.id === id));
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
    if (phase === "results") return showResults();
    if (phase === "tutorial") state.phaseItems = tutorialItems();
    if (phase === "level1") state.phaseItems = itemsForLevel("level1");
    if (phase === "level2") state.phaseItems = state.runMode === "demo" ? representativeItems() : itemsForLevel("level2");
    if (phase === "navigation") state.phaseItems = navigationItems(state.runMode === "pilot");
    state.currentImageIndex = 0;
    beginTrial();
    resetTimerTick();
  }

  function advancePhase() {
    const seq = phaseSequence();
    const next = seq[seq.indexOf(state.phase) + 1] || "results";
    startPhase(next);
  }

  function beginTrial() {
    state.selectedLabel = null;
    state.undoStack = [];
    state.currentImageIndex = state.trialIndex;
    state.trialStart = performance.now();
    state.trialPausedMs = 0;
    render();
    logEvent("trial_start", { correct_answer: currentItem()?.answer || "navigation_only" });
  }

  function render() {
    const item = displayedItem();
    if (!item) return;
    const target = currentItem();
    const total = state.phaseItems.length;
    const phaseCopy = {
      tutorial: ["TUTORIAL · NOT SCORED", "Learn the controls"],
      level1: [state.runMode === "demo" ? "DEMO · 4 REPRESENTATIVE TASKS" : "LEVEL 1 · 12 IMAGES", state.runMode === "demo" ? "Vehicle sorting demo" : "City Trip Cleanup"],
      level2: ["LEVEL 2 · 12 IMAGES", "City Vehicle Sorting"],
      navigation: ["NAVIGATION ONLY", "Find the named picture"]
    }[state.phase];
    $("#phaseKicker").textContent = phaseCopy[0];
    $("#taskTitle").textContent = phaseCopy[1];
    $("#trialCounter").textContent = `${state.trialIndex + 1} / ${total}`;
    $("#trialProgress").style.width = `${((state.trialIndex + 1) / total) * 100}%`;
    $("#photoBadge").textContent = item.id.toUpperCase() + (item.id === target.id ? " · TARGET" : "");
    $("#photoName").textContent = item.title;
    $("#photoMeta").textContent = `${item.id.toUpperCase()} · ORIGINAL CONTROLLED ILLUSTRATION`;
    $("#mainPhoto").src = item.file;
    $("#mainPhoto").alt = item.alt;
    const idx = state.currentImageIndex;
    $("#backPhoto1").src = state.phaseItems[(idx + 1) % total].file;
    $("#backPhoto2").src = state.phaseItems[(idx + 2) % total].file;
    $("#currentLabel").hidden = !state.selectedLabel;
    $("#currentLabel").textContent = state.selectedLabel ? `${LABELS[state.selectedLabel].icon} ${LABELS[state.selectedLabel].en}` : "";
    $$(".classic-controls button").forEach((button) => button.classList.toggle("selected", button.dataset.label === state.selectedLabel));
    $("#undoBtn").disabled = state.undoStack.length === 0;
    renderRules();
    renderTaskInstruction();
    renderPhaseRail();
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
    if (state.phase === "navigation") {
      $("#taskInstruction").textContent = `Go to ${item.id.toUpperCase()} “${item.title}”. Do not classify. / 找到指定图片，不要分类。`;
      $("#submitHeading").textContent = "Navigation only / 仅导航";
      $("#submitHint").textContent = "Submit when the target picture is visible.";
      $("#submitBtn").innerHTML = "I’m there <span>→</span>";
      return;
    }
    if (state.phase === "tutorial") {
      const tips = state.technique === "flicksort"
        ? ["Swipe ← next and → previous. Diagonal ↗ means Keep.", "Diagonal ↖ means Edit. Undo can mark an accidental input.", "Diagonal ↙ means Maybe. A short or unclear swipe cancels safely.", "Diagonal ↘ means Reject. Practice shows answer feedback."]
        : ["Swipe ← next and → previous. Tap Keep for bus only.", "Tap Edit for car only. Undo can mark an accidental input.", "Tap Maybe when both are visible. Gesture cancel is not used in Classic.", "Tap Reject for neither. Practice shows answer feedback."];
      $("#taskInstruction").textContent = tips[state.trialIndex];
    } else if (state.phase === "level1") {
      $("#taskInstruction").textContent = "Is any bus visible? Yes → Keep; No → Reject. / 有巴士→保留；没有→拒绝。";
    } else {
      $("#taskInstruction").textContent = "Count every visible bus and ordinary passenger car, then use the rule card. / 以所有可见巴士和小汽车判断。";
    }
    $("#submitHeading").textContent = state.selectedLabel ? `Selected: ${LABELS[state.selectedLabel].en}` : "Choose one category";
    $("#submitHint").textContent = state.phase === "tutorial" ? "Practice feedback appears after Submit." : "No correctness feedback is shown during scored trials.";
    $("#submitBtn").innerHTML = "Submit <span>→</span>";
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
    state.currentImageIndex = (state.currentImageIndex + delta + count) % count;
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
    if (item.id !== currentItem().id) {
      logEvent("wrong_photo_classification", { attempted_label: label, source, explicit_error_type: "classified_non_target_image", ...gesture });
      showToast("Return to the TARGET image before classifying");
      return;
    }
    state.undoStack.push({ previous: state.selectedLabel, next: label, imageId: item.id });
    state.selectedLabel = label;
    state.classifications.set(item.id, label);
    logEvent("classification", { label, source, ...gesture });
    animateFlyout(label);
    render();
  }

  function undo() {
    const action = state.undoStack.pop();
    if (!action) return;
    const reason = $("#undoReason").value;
    state.totalUndos += 1;
    if (reason === "accidental_input") state.accidentalClassifications += 1;
    state.selectedLabel = action.previous;
    if (action.previous) state.classifications.set(action.imageId, action.previous);
    else state.classifications.delete(action.imageId);
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
      state.trials.push(trialRecord({ final_response: "navigation_only", accuracy: "", content_judgment_error: "", navigation_correct: correct ? 1 : 0, trial_duration_ms: Math.round(duration) }));
      logEvent("trial_submit", { navigation_correct: correct ? 1 : 0 });
      nextTrial();
      return;
    }
    if (!state.selectedLabel) return showToast("Choose a category first");
    if (displayedItem().id !== target.id) return showToast("Return to the TARGET image before submitting");
    const correct = state.selectedLabel === target.answer;
    state.trials.push(trialRecord({
      final_response: state.selectedLabel, accuracy: correct ? 1 : 0,
      content_judgment_error: correct ? 0 : 1, navigation_correct: "",
      trial_duration_ms: Math.round(duration)
    }));
    logEvent("trial_submit", { final_response: state.selectedLabel, correct_answer: target.answer, accuracy: correct ? 1 : 0, explicit_error_type: correct ? "none" : "content_judgment_error" });
    if (state.phase === "tutorial") {
      showToast(correct ? "Correct / 正确" : `Practice answer: ${LABELS[target.answer].en}`);
      setTimeout(nextTrial, 650);
      return;
    }
    nextTrial();
  }

  function trialRecord(extra) {
    const item = currentItem();
    return {
      participant_id: state.participant, technique: state.technique, run_mode: state.runMode,
      build_version: BUILD, asset_set: ASSET_SET, benchmark_status: "provisional_demonstration_not_pilot_validated",
      t_ref_ms: T_REF_MS, phase: state.phase, trial_index: state.trialIndex + 1,
      target_image_id: item.id, image_title: item.title, contains_bus: item.contains_bus ? 1 : 0,
      contains_car: item.contains_car ? 1 : 0, correct_answer: state.phase === "navigation" ? "navigation_only" : item.answer,
      undo_count_total: state.totalUndos, cancel_count_total: state.totalCancels,
      accidental_classification_count_total: state.accidentalClassifications,
      navigation_mistouch_count_total: state.navMistouches,
      active_operation_time_ms_total: Math.round(state.activeMs), submitted_at: nowIso(), ...extra
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
    if (state.technique === "flicksort" && LABELS[result.action]) return classify(result.action, "gesture", meta);
    if (state.technique === "flicksort" && result.distance >= 18) {
      state.totalCancels += 1;
      state.phaseCancelCount += 1;
      logEvent("gesture_cancel", { ...meta, explicit_error_type: "trajectory_cancel" });
      showToast("Gesture cancelled / 手势已取消");
    } else if (state.technique === "classic" && result.distance >= 18) {
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

  function showToast(message) {
    clearTimeout(state.toastTimer);
    $("#toast").textContent = message;
    $("#toast").classList.add("show");
    state.toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 1500);
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
    $("#resultTechnique").textContent = state.technique === "classic" ? "Classic" : "FlickSort";
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
    link.download = `flicksort_${kind}_${state.participant}_${state.technique}_${Date.now()}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function startRun(event) {
    event.preventDefault();
    state.participant = $("#participantId").value.trim().replace(/[^a-zA-Z0-9_-]/g, "-");
    if (!state.participant) return;
    state.technique = new FormData(event.currentTarget).get("technique");
    state.runMode = new FormData(event.currentTarget).get("runMode");
    $("#setupScreen").hidden = true;
    $("#studyScreen").hidden = false;
    $("#sideTechnique").textContent = state.technique.toUpperCase();
    $("#sideParticipant").textContent = state.participant;
    $("#classicControls").hidden = state.technique !== "classic";
    $("#flickLegend").hidden = state.technique !== "flicksort";
    document.documentElement.dataset.technique = state.technique;
    logEvent("run_start", { benchmark_status: "provisional_demonstration_not_pilot_validated", t_ref_ms: T_REF_MS });
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

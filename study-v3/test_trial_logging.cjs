// 【代码讲解】自动回归测试：在轻量浏览器环境中执行真实app.js路径，核对三种Trial日志与CSV。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { performance } = require("node:perf_hooks");
const FlickSortScoring = require("./scoring.js");

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "image_manifest.json"), "utf8"));
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function createElement(dataset = {}) {
  return {
    dataset, listeners: {}, classList: { add() {}, remove() {}, toggle() {} }, style: {},
    value: "", textContent: "", innerHTML: "", hidden: false, disabled: false,
    addEventListener(type, handler) { this.listeners[type] = handler; },
    setAttribute() {}, click() {}
  };
}

async function createHarness(runMode) {
  const elements = new Map();
  const labels = ["keep", "edit", "maybe", "reject"];
  const labelButtons = labels.map((label) => createElement({ label }));
  const phaseRows = ["tutorial", "level1", "level2", "navigation"].map((phase) => createElement({ phase }));
  const get = (selector) => {
    if (!elements.has(selector)) elements.set(selector, createElement());
    return elements.get(selector);
  };
  get("#participantId").value = "P-TEST";
  get("#undoReason").value = "unspecified";
  get("#setupForm").runMode = runMode;

  const document = {
    hidden: false,
    documentElement: { dataset: {} },
    querySelector: get,
    querySelectorAll(selector) {
      if (selector === ".classic-controls button") return labelButtons;
      if (selector === ".phase-list > div") return phaseRows;
      return [];
    },
    addEventListener() {},
    createElement() { return createElement(); }
  };

  const context = {
    console, document, performance, FlickSortScoring,
    fetch: async () => ({ ok: true, json: async () => manifest }),
    crypto: { getRandomValues(array) { array[0] = 0; return array; } },
    FormData: class { constructor(form) { this.form = form; } get() { return this.form.runMode; } },
    Blob: class {}, URL: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
    location: { reload() {} }, setTimeout() { return 1; }, clearTimeout() {},
    matchMedia: () => ({ matches: true }), addEventListener() {}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "app.js"), "utf8"), context, { filename: "app.js" });
  await new Promise((resolve) => setImmediate(resolve));

  const fire = (selector, type, event = {}) => get(selector).listeners[type](event);
  const classify = (label) => labelButtons.find((button) => button.dataset.label === label).listeners.click();
  fire("#setupForm", "submit", { preventDefault() {}, currentTarget: get("#setupForm") });
  return { study: context.FlickSortStudy, fire, classify };
}

function assertTimedTrial(row, expectedPhase) {
  assert.equal(row.phase, expectedPhase);
  assert.match(row.trial_start_time, ISO_UTC);
  assert.match(row.trial_end_time, ISO_UTC);
  assert.ok(Date.parse(row.trial_start_time) <= Date.parse(row.trial_end_time));
  assert.ok(Object.hasOwn(row, "participant_id"));
  assert.ok(Object.hasOwn(row, "technique"));
  assert.ok(Object.hasOwn(row, "trial_index"));
  assert.ok(Object.hasOwn(row, "trial_duration_ms"));
  assert.ok(Object.hasOwn(row, "accuracy"));
}

(async () => {
  const tutorial = await createHarness("pilot");
  const tutorialItem = tutorial.study.state.phaseItems[tutorial.study.state.currentImageIndex];
  tutorial.classify(tutorialItem.answer);
  const firstEffectiveEnd = tutorial.study.state.classificationDetails.get(`tutorial:${tutorialItem.id}`).trial_end_time;
  const replacement = ["keep", "edit", "maybe", "reject"].find((label) => label !== tutorialItem.answer);
  tutorial.classify(replacement);
  tutorial.fire("#undoBtn", "click");
  assert.equal(tutorial.study.state.classificationDetails.get(`tutorial:${tutorialItem.id}`).trial_end_time, firstEffectiveEnd);
  tutorial.fire("#submitBtn", "click");
  assert.equal(tutorial.study.state.trials.length, 1);
  assertTimedTrial(tutorial.study.state.trials[0], "tutorial");
  assert.equal(tutorial.study.state.trials[0].trial_end_time, tutorial.study.state.trials[0].classified_at);
  assert.equal(tutorial.study.state.trials[0].trial_end_time, firstEffectiveEnd);
  assert.equal(tutorial.study.state.events.filter((event) => event.event_type === "classification").length, 2);
  assert.equal(tutorial.study.state.events.filter((event) => event.event_type === "undo").length, 1);

  const run = await createHarness("demo");
  const state = run.study.state;
  for (let block = 0; block < 2; block += 1) {
    state.phaseItems.forEach((item, index) => {
      state.currentImageIndex = index;
      run.classify(item.answer);
    });
    run.fire("#submitBtn", "click");
  }
  const classificationRows = state.trials.filter((row) => row.phase === "level2");
  assert.equal(classificationRows.length, 4);
  classificationRows.forEach((row) => {
    assertTimedTrial(row, "level2");
    assert.equal(row.trial_end_time, row.classified_at);
    assert.ok(Date.parse(row.trial_end_time) <= Date.parse(row.submitted_at));
  });

  assert.equal(state.phase, "navigation");
  state.currentImageIndex = state.phaseItems.findIndex((item) => item.id === state.phaseItems[state.trialIndex].id);
  run.fire("#submitBtn", "click");
  const navigationRow = state.trials.find((row) => row.phase === "navigation");
  assertTimedTrial(navigationRow, "navigation");
  assert.equal(navigationRow.trial_end_time, navigationRow.submitted_at);

  const csv = run.study.toCsv([...classificationRows, navigationRow, tutorial.study.state.trials[0]]);
  const headers = csv.split("\r\n", 1)[0].split(",");
  ["participant_id", "technique", "trial_index", "trial_start_time", "trial_end_time", "trial_duration_ms", "accuracy"]
    .forEach((field) => assert.ok(headers.includes(field), `Missing CSV column: ${field}`));
  console.log("Trial logging tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


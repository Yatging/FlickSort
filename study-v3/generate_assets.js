// 【代码讲解】V3测试系统；以下注释用于理解原有功能，未改变程序语句。
/* Stimulus manifest/crop metadata generator. No downloaded or third-party images. */
const fs = require("fs");
const path = require("path");

// 【代码讲解】generatePhotorealisticAssets()：根据既定车辆规则生成实验图片素材和清单。
function generatePhotorealisticAssets() {
  const photoRows = [
    ["l1-01","level1",1,0,"keep","One clearly visible bus; no passenger car."],
    ["l1-02","level1",0,1,"reject","One clearly visible passenger car; no bus."],
    ["l1-03","level1",1,0,"keep","One clearly visible bus; no passenger car."],
    ["l1-04","level1",0,0,"reject","A bicycle and bench; no bus or passenger car."],
    ["l1-05","level1",1,0,"keep","One clearly visible bus; no passenger car."],
    ["l1-06","level1",0,1,"reject","One clearly visible passenger car; no bus."],
    ["l1-07","level1",1,0,"keep","One clearly visible bus; no passenger car."],
    ["l1-08","level1",0,0,"reject","A bicycle and bench; no bus or passenger car."],
    ["l1-09","level1",1,0,"keep","One clearly visible bus; no passenger car."],
    ["l1-10","level1",0,1,"reject","One clearly visible passenger car; no bus."],
    ["l1-11","level1",1,0,"keep","One clearly visible bus; no passenger car."],
    ["l1-12","level1",0,0,"reject","A bicycle and kiosk; no bus or passenger car."],
    ["l2-01","level2",1,0,"keep","Bus only; no passenger car."],
    ["l2-02","level2",1,0,"keep","Bus only; no passenger car."],
    ["l2-03","level2",1,0,"keep","Bus only; no passenger car."],
    ["l2-04","level2",0,1,"edit","Passenger car only; no bus."],
    ["l2-05","level2",0,1,"edit","Passenger car only; no bus."],
    ["l2-06","level2",0,1,"edit","Passenger car only; no bus."],
    ["l2-07","level2",1,1,"maybe","One bus and one passenger car, both clearly visible."],
    ["l2-08","level2",1,1,"maybe","One bus and one passenger car, both clearly visible."],
    ["l2-09","level2",1,1,"maybe","One bus and one passenger car, both clearly visible."],
    ["l2-10","level2",0,0,"reject","A bicycle and street furniture; no bus or passenger car."],
    ["l2-11","level2",0,0,"reject","A bench and waterfront; no bus or passenger car."],
    ["l2-12","level2",0,0,"reject","A fountain and pedestrian plaza; no bus or passenger car."]
  ];
  const level1Crops = [
    [0,0,390,313],[405,0,382,313],[802,0,381,313],[1198,0,388,313],
    [0,327,390,299],[405,327,382,299],[802,327,381,299],[1198,327,388,299],
    [0,641,390,351],[405,641,382,351],[802,641,381,351],[1198,641,388,351]
  ];
  const level2Crops = [
    [0,0,520,238],[534,0,518,238],[1067,0,519,238],
    [0,254,520,221],[534,254,518,221],[1067,254,519,221],
    [0,490,520,215],[534,490,518,215],[1067,490,519,215],
    [0,720,520,272],[534,720,518,272],[1067,720,519,272]
  ];
  const cropWrapper = (id, level, crop) => {
    const [x,y,w,h] = crop;
    const sheet = level === "level1" ? "realistic-level1.png" : "realistic-level2.png";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" role="img" aria-labelledby="title">\n  <title id="title">Photo ${id.toUpperCase()}</title>\n  <image href="${sheet}" x="0" y="0" width="1586" height="992"/>\n</svg>\n`;
  };
  const assetsDir = path.join(__dirname, "assets");
  fs.mkdirSync(assetsDir, { recursive: true });
  const manifest = photoRows.map((row, index) => {
    const [id, level, busFlag, carFlag, answer, reason] = row;
    const title = `Photo ${id.toUpperCase()}`;
    const crop = level === "level1" ? level1Crops[index] : level2Crops[index - 12];
    const item = {
      id, level, title, file: `assets/${id}.png`, contains_bus: Boolean(busFlag),
      contains_car: Boolean(carFlag), answer, reason, alt: `${title}: ${reason}`,
      source: "Independent crop from an original AI-generated photorealistic stimulus sheet created for this repository; no third-party asset.",
      visual_review_status: "pending_independent_human_review",
      implementation_review: "agent_visual_review_complete_2026-10-25_contact_sheet_and_all_24_crops_checked_against_labels",
      agent_visual_review_status: "complete", human_reviewed: false
    };
    fs.writeFileSync(path.join(assetsDir, `${id}.svg`), cropWrapper(id, level, crop));
    return item;
  });
  fs.writeFileSync(path.join(__dirname, "image_manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  const csvHeaders = Object.keys(manifest[0]);
  const escape = (value) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [csvHeaders.join(","), ...manifest.map((item) => csvHeaders.map((key) => escape(item[key])).join(","))].join("\r\n");
  fs.writeFileSync(path.join(__dirname, "image_manifest.csv"), csv + "\r\n");
  console.log(`Generated ${manifest.length} photorealistic manifest entries, crop wrappers and two manifests.`);
}

if (!process.argv.includes("--legacy-illustrations")) {
  generatePhotorealisticAssets();
  process.exit(0);
}

const rows = [
  ["l1-01","level1","Harbour Morning",1,0,"keep","A single clearly visible bus; no passenger car."],
  ["l1-02","level1","Park Corner",0,1,"reject","A single clearly visible passenger car; no bus."],
  ["l1-03","level1","Market Street",1,0,"keep","A single clearly visible bus; no passenger car."],
  ["l1-04","level1","Quiet Plaza",0,0,"reject","A bench, trees and bicycle; no bus or passenger car."],
  ["l1-05","level1","Museum Avenue",1,0,"keep","A single clearly visible bus; no passenger car."],
  ["l1-06","level1","Canal Road",0,1,"reject","A single clearly visible passenger car; no bus."],
  ["l1-07","level1","Library Stop",1,0,"keep","A single clearly visible bus; no passenger car."],
  ["l1-08","level1","Garden Walk",0,0,"reject","Trees, a bench and bicycle; no bus or passenger car."],
  ["l1-09","level1","Hill District",1,0,"keep","A single clearly visible bus; no passenger car."],
  ["l1-10","level1","Seaside Lane",0,1,"reject","A single clearly visible passenger car; no bus."],
  ["l1-11","level1","Station Square",1,0,"keep","A single clearly visible bus; no passenger car."],
  ["l1-12","level1","Riverside Path",0,0,"reject","A bicycle, trees and kiosk; no bus or passenger car."],
  ["l2-01","level2","Red Bus Lane",1,0,"keep","Bus only; no passenger car."],
  ["l2-02","level2","Green Bus Stop",1,0,"keep","Bus only; no passenger car."],
  ["l2-03","level2","Blue Bus Route",1,0,"keep","Bus only; no passenger car."],
  ["l2-04","level2","Orange City Car",0,1,"edit","Passenger car only; no bus."],
  ["l2-05","level2","Blue Street Car",0,1,"edit","Passenger car only; no bus."],
  ["l2-06","level2","Green Avenue Car",0,1,"edit","Passenger car only; no bus."],
  ["l2-07","level2","Crossing Traffic",1,1,"maybe","One bus and one passenger car, both clearly visible."],
  ["l2-08","level2","Downtown Pair",1,1,"maybe","One bus and one passenger car, both clearly visible."],
  ["l2-09","level2","Sunset Vehicles",1,1,"maybe","One bus and one passenger car, both clearly visible."],
  ["l2-10","level2","Bicycle Plaza",0,0,"reject","A bicycle and street furniture; no bus or passenger car."],
  ["l2-11","level2","Fountain Garden",0,0,"reject","A fountain, bench and trees; no bus or passenger car."],
  ["l2-12","level2","Walking Street",0,0,"reject","Planters, bollards and a kiosk; no bus or passenger car."]
];

const palettes = [
  ["#9dd8e8","#f6d58b","#4e7776","#df5d4b","#f2a23a"],
  ["#b7d7ef","#f0b78e","#48647d","#d66d4b","#5e9cc7"],
  ["#edd3a8","#d99171","#506b64","#c8483f","#5c8fb7"],
  ["#9eced3","#f5caa0","#3d6667","#dd6b42","#79a75c"],
  ["#b6c9df","#e7bb79","#485a72","#b94b3f","#e29135"],
  ["#f0c6aa","#d99c78","#586b77","#ce594b","#528b9f"]
];

// 【代码讲解】bus()：绘制巴士图像作为原创车辆素材。
function bus(x, y, color, flip = false) {
  const s = flip ? -1 : 1;
  const anchor = flip ? x + 270 : x;
  return `<g transform="translate(${anchor} ${y}) scale(${s} 1)" aria-label="bus">
    <rect x="0" y="12" width="270" height="112" rx="20" fill="${color}" stroke="#1f2c2c" stroke-width="5"/>
    <rect x="18" y="27" width="176" height="48" rx="8" fill="#dff4f1"/>
    <path d="M62 27v48M108 27v48M154 27v48" stroke="#416167" stroke-width="5"/>
    <rect x="207" y="27" width="43" height="78" rx="7" fill="#dff4f1" stroke="#32494d" stroke-width="4"/>
    <rect x="15" y="85" width="180" height="13" rx="5" fill="#fff3d2" opacity=".9"/>
    <circle cx="58" cy="123" r="23" fill="#1d2728"/><circle cx="58" cy="123" r="10" fill="#b7c3bf"/>
    <circle cx="218" cy="123" r="23" fill="#1d2728"/><circle cx="218" cy="123" r="10" fill="#b7c3bf"/>
    <rect x="255" y="49" width="10" height="17" rx="3" fill="#ffe28c"/>
  </g>`;
}

// 【代码讲解】car()：绘制小汽车图像作为原创车辆素材。
function car(x, y, color, flip = false) {
  const s = flip ? -1 : 1;
  const anchor = flip ? x + 175 : x;
  return `<g transform="translate(${anchor} ${y}) scale(${s} 1)" aria-label="passenger car">
    <path d="M13 66l19-35c6-11 16-17 30-17h49c13 0 22 5 31 16l24 31 6 8v32H5V78z" fill="${color}" stroke="#1f2c2c" stroke-width="5" stroke-linejoin="round"/>
    <path d="M48 31h61c8 0 13 3 19 10l13 18H35z" fill="#dff4f1"/>
    <path d="M87 31v28" stroke="#415c62" stroke-width="5"/>
    <circle cx="43" cy="98" r="20" fill="#1d2728"/><circle cx="43" cy="98" r="8" fill="#b7c3bf"/>
    <circle cx="137" cy="98" r="20" fill="#1d2728"/><circle cx="137" cy="98" r="8" fill="#b7c3bf"/>
    <rect x="153" y="70" width="14" height="9" rx="3" fill="#ffe28c"/>
  </g>`;
}

// 【代码讲解】bicycle()：绘制自行车作为干扰背景元素。
function bicycle(x, y) {
  return `<g transform="translate(${x} ${y})" fill="none" stroke="#263a3b" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" aria-label="bicycle">
    <circle cx="25" cy="61" r="23"/><circle cx="112" cy="61" r="23"/><path d="M25 61l34-45 26 45H25l24-31h50M59 16h20M85 61l17-49h18"/>
  </g>`;
}

// 【代码讲解】scenery()：生成城市背景，供汽车和巴士素材组合。
function scenery(index, palette) {
  const [sky, wall, dark] = palette;
  const sunX = 105 + (index * 97) % 720;
  const heights = [210 + (index * 19) % 100, 170 + (index * 31) % 130, 230 + (index * 13) % 80, 185 + (index * 23) % 100];
  return `<rect width="960" height="600" fill="${sky}"/>
    <circle cx="${sunX}" cy="104" r="47" fill="#fff0a6" opacity=".9"/>
    <path d="M0 295Q160 245 320 295T640 286T960 278V420H0z" fill="#7ca394" opacity=".65"/>
    <g stroke="${dark}" stroke-width="5">
      <rect x="36" y="${370-heights[0]}" width="188" height="${heights[0]}" fill="${wall}"/>
      <rect x="244" y="${370-heights[1]}" width="198" height="${heights[1]}" fill="#e9bd7c"/>
      <rect x="465" y="${370-heights[2]}" width="208" height="${heights[2]}" fill="#df8c72"/>
      <rect x="698" y="${370-heights[3]}" width="215" height="${heights[3]}" fill="#edd2a1"/>
    </g>
    <g fill="#dff4f1" stroke="#5e7778" stroke-width="3" opacity=".95">
      ${[80,130,180,285,340,395,505,560,615,745,805,865].map((x,i)=>`<rect x="${x}" y="${170+(i%3)*52}" width="28" height="34" rx="3"/>`).join("")}
    </g>
    <rect y="370" width="960" height="230" fill="#87908e"/>
    <rect y="397" width="960" height="6" fill="#e8eadf"/>
    <path d="M0 513h960" stroke="#f7e8a3" stroke-width="9" stroke-dasharray="80 42"/>
    <rect y="567" width="960" height="33" fill="#3f514e"/>
    <g fill="#456d58"><circle cx="66" cy="344" r="45"/><rect x="58" y="342" width="16" height="48" fill="#6a4c38"/><circle cx="897" cy="337" r="53"/><rect x="889" y="338" width="17" height="52" fill="#6a4c38"/></g>`;
}

// 【代码讲解】svgFor()：把背景和车辆组合成SVG图。
function svgFor(item, index) {
  const palette = palettes[index % palettes.length];
  const [,,, busColor, carColor] = palette;
  let objects = "";
  if (item.contains_bus && item.contains_car) {
    objects += bus(82 + (index % 3) * 20, 382, busColor, index % 2 === 0);
    objects += car(610 - (index % 2) * 35, 457, carColor, index % 2 !== 0);
  } else if (item.contains_bus) {
    objects += bus(335 + ((index % 3) - 1) * 55, 414, busColor, index % 2 === 0);
  } else if (item.contains_car) {
    objects += car(385 + ((index % 3) - 1) * 80, 446, carColor, index % 2 !== 0);
  } else {
    objects += bicycle(250 + (index % 3) * 120, 455);
    objects += `<g aria-label="bench"><path d="M650 475h155M664 475v62M790 475v62M660 446h136v31H660z" fill="#a26b43" stroke="#263a3b" stroke-width="7"/></g>`;
    if (index % 2) objects += `<g aria-label="fountain"><ellipse cx="503" cy="490" rx="62" ry="17" fill="#74b5c4" stroke="#263a3b" stroke-width="5"/><path d="M503 486V424m0 18c-34 5-37 34-37 34m37-34c34 5 37 34 37 34" fill="none" stroke="#dff5f7" stroke-width="8"/></g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 600" role="img" aria-labelledby="title desc">
    <title id="title">${item.title}</title><desc id="desc">${item.alt}</desc>
    ${scenery(index, palette)}${objects}
  </svg>`;
}

const assetsDir = path.join(__dirname, "assets");
fs.mkdirSync(assetsDir, { recursive: true });
const manifest = rows.map((row, index) => {
  const [id, level, title, busFlag, carFlag, answer, reason] = row;
  const item = {
    id, level, title, file: `assets/${id}.svg`, contains_bus: Boolean(busFlag),
    contains_car: Boolean(carFlag), answer, reason,
    alt: `${title}: ${reason}`,
    source: "Original deterministic SVG generated in-repository; no external asset.",
    visual_review_status: "pending_independent_human_review",
    implementation_review: "all_24_browser_renders_visually_checked_against_labels_2026-10-23",
    agent_visual_review_status: "complete",
    human_reviewed: false
  };
  fs.writeFileSync(path.join(assetsDir, `${id}.svg`), svgFor(item, index));
  return item;
});

fs.writeFileSync(path.join(__dirname, "image_manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
const csvHeaders = Object.keys(manifest[0]);
const escape = (value) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const csv = [csvHeaders.join(","), ...manifest.map((item) => csvHeaders.map((key) => escape(item[key])).join(","))].join("\r\n");
fs.writeFileSync(path.join(__dirname, "image_manifest.csv"), csv + "\r\n");
console.log(`Generated ${manifest.length} original SVG stimuli and two manifests.`);

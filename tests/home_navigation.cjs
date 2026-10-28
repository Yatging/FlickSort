const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname,"..");
const pages = { "classic.html": "./", "flicksort.html": "./", "study-v3/index.html": "../", "study-v3/asset-review.html": "../" };
for (const [filename, expectedHref] of Object.entries(pages)) {
  const html = fs.readFileSync(path.join(root,filename),"utf8");
  const link = html.match(/<a\b[^>]*class="home-return(?:-v3)?"[^>]*href="([^"]+)"[^>]*>/);
  assert.ok(link, filename + " has no visible home link");
  assert.equal(link[1], expectedHref, filename + " home path incorrect");
  assert.ok(html.includes("Back to Home"),filename+" missing English link text");
}
const app = fs.readFileSync(path.join(root,"study-v3/app.js"),"utf8");
assert.match(app,/\$\$\("\[data-return-home\]"\)/);
assert.match(app,/window\.confirm\(localized\)/);
assert.match(app,/homeNavigationApproved/);
const translations = fs.readFileSync(path.join(root,"language.js"),"utf8");
assert.ok(translations.includes('["Back to Home", "返回主页"]'));
console.log("Home-navigation link and exit-guard tests passed.");

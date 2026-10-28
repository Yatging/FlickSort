const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const start = source.indexOf('const SCENES=');
const end = source.indexOf('const ROUTES=',start);
assert.ok(start>=0 && end>start,'gallery constants missing');
const photos = vm.runInNewContext(source.slice(start,end)+';PHOTOS;');
assert.equal(photos.length,32,'should contain 32 showcase images');
assert.equal(new Set(photos.map(p=>p.src)).size,32,'gallery sources are not unique');
for(const photo of photos){
  assert.ok(fs.existsSync(path.join(__dirname,'..',photo.src)), 'missing showcase image '+photo.src);
  assert.ok(fs.existsSync(path.join(__dirname,'..',photo.thumb)), 'missing thumbnail '+photo.thumb);
}
for(const page of ['classic.html','flicksort.html']){
  const html=fs.readFileSync(path.join(__dirname,'..',page),'utf8');
  for(const id of ['studyBtn','desktopTestBtn','submitTrial','studyCta'])
    assert.ok(!html.includes('id="'+id+'"'),page+' still exposes '+id);
  assert.match(html,/32 varied images/);
  assert.match(html,/01 \/ 32/);
}
for(const selector of ["$('#studyBtn')","$('#studyCta')","$('#submitTrial')"])
  assert.ok(!source.includes(selector),'demo still references removed UI '+selector);
console.log('Showcase smoke test passed: 32 distinct files, demo controls only.');

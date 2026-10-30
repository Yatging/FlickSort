export const VERSION = '4.0.0';
export const CONDITIONS = { A: ['classic','low'], B: ['classic','high'], C: ['flicksort','low'], D: ['flicksort','high'] };
export const LATIN = [['A','B','D','C'],['B','C','A','D'],['C','D','B','A'],['D','A','C','B']];
export const TRIAL_FIELDS = ['id','session_id','version','mode','phase','condition','technique','demand','block','trial','target','answer','response','accuracy','started_at','ended_at','elapsed_ms','paused_ms','corrections','navigation_count'];
export const EVENT_FIELDS = ['id','session_id','version','mode','phase','condition','block','trial','type','at','details'];
export const QUESTION_FIELDS = ['id','session_id','version','mode','phase','at','answers'];
export function answerFor(id) { return ['keep','edit','maybe','reject'][Math.floor((Number(id.slice(-2))-1)/3)]; }
export function schedule(row=0, perCondition=12) {
  if (!Number.isInteger(row)||row<0||row>3||![4,8,12].includes(perCondition)) throw Error('Invalid experiment configuration');
  const result=[]; const half=perCondition/2;
  // Matched stimuli for all four conditions. Non-sequential targets manipulate navigation only.
  const low=Array.from({length:perCondition},(_,i)=>i+1);
  const high=[...low.filter((_,i)=>i%2===1),...low.filter((_,i)=>i%2===0)];
  for(let block=1;block<=2;block++) for(const condition of LATIN[row]) {
    const [technique,demand]=CONDITIONS[condition];
    const targets=(demand==='low'?low:high).slice((block-1)*half,block*half);
    targets.forEach((n,i)=>result.push({condition,technique,demand,block,trial:(block-1)*half+i+1,target:`l2-${String(n).padStart(2,'0')}`}));
  }
  return result;
}
export function csv(rows, fields) {
  const cell=v=>'"'+String(typeof v==='object'&&v!==null?JSON.stringify(v):v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
  return '\ufeff'+[fields.map(cell).join(','),...rows.map(r=>fields.map(f=>cell(r[f])).join(','))].join('\r\n');
}
export function validateTrial(r, session) {
  const spec=schedule(session.latin_row,session.trials_per_condition).find(t=>t.block===r.block&&t.condition===r.condition&&t.trial===r.trial);
  if (!spec||r.phase!=='formal'||r.target!==spec.target||r.technique!==spec.technique||r.demand!==spec.demand) throw Error('Trial does not match assigned schedule');
  if(!['keep','edit','maybe','reject'].includes(r.response)||r.answer!==answerFor(r.target)||r.accuracy!==Number(r.response===r.answer)) throw Error('Invalid scoring');
  if(!Number.isFinite(r.elapsed_ms)||r.elapsed_ms<0||r.elapsed_ms>86400000||!Number.isInteger(r.corrections)||r.corrections<0||r.corrections>10000||!Number.isFinite(r.paused_ms)||r.paused_ms<0||!Number.isInteger(r.navigation_count)||r.navigation_count<0) throw Error('Invalid timing or counts');
  const wall=Date.parse(r.ended_at)-Date.parse(r.started_at);
  if(!Number.isFinite(wall)||wall<0||Math.abs(wall-r.paused_ms-r.elapsed_ms)>1500) throw Error('Timing inconsistent');
  return spec;
}

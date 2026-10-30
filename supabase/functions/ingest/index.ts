import { LATIN, VERSION, validateTrial, TRIAL_FIELDS, EVENT_FIELDS, QUESTION_FIELDS } from '../../../experiment/core.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function validate(body:any) {
 const s=body.session;
 if(!s||!UUID.test(s.id)||s.version!==VERSION||!['real','test','demo'].includes(s.mode)||!Number.isInteger(s.latin_row)||!LATIN[s.latin_row]||JSON.stringify(s.condition_order)!==JSON.stringify(LATIN[s.latin_row])||![4,8,12].includes(s.trials_per_condition)||!['active','partial','completed'].includes(s.status)||!Number.isFinite(Date.parse(s.started_at))||s.consent_version!=='2026-10-30'||!/^[a-f0-9]{64}$/.test(body.token))throw Error('Invalid session');
 if(s.status==='completed'&&!Number.isFinite(Date.parse(s.ended_at)))throw Error('Missing end time');
 if(body.withdraw===true)return;
 if(!Array.isArray(body.records)||body.records.length>50)throw Error('Batch limit');
 for(const r of body.records){
  if(!UUID.test(r.id)||r.session_id!==s.id||r.version!==VERSION||r.mode!==s.mode||JSON.stringify(r).length>16000)throw Error('Invalid record');
  const fields=r.kind==='trials'?TRIAL_FIELDS:r.kind==='events'?EVENT_FIELDS:QUESTION_FIELDS;
  if(Object.keys(r).some(k=>k!=='kind'&&!fields.includes(k)))throw Error('Unknown record field');
  if(r.kind==='trials')validateTrial(r,s);
  else if(r.kind==='events'){
   if(!['formal','practice'].includes(r.phase)||!Number.isFinite(Date.parse(r.at))||!['consent','trial_start','click','navigate','classify','wrong_target','undo','swipe','cancel','submit','pause','resume','safe_exit','complete'].includes(r.type))throw Error('Invalid event');
   if(!r.details||typeof r.details!=='object'||Array.isArray(r.details)||Object.keys(r.details).some(k=>!['accepted','target','previous_condition','position','response','image','dx','dy','action','reason'].includes(k)))throw Error('Invalid event details');
   if(Object.values(r.details).some(v=>v!==null&&!['string','number','boolean'].includes(typeof v))||Object.values(r.details).some(v=>typeof v==='string'&&v.length>100))throw Error('Event detail limit');
  }else if(r.kind==='questionnaires'){
   if(!['pre','post'].includes(r.phase)||!Number.isFinite(Date.parse(r.at))||!r.answers)throw Error('Invalid questionnaire');
   const keys=r.phase==='pre'?['experience','hand','age','gestures','sorting']:['q0','q1','q2','preference','feedback'];
   if(Object.keys(r.answers).sort().join()!==keys.sort().join()||Object.entries(r.answers).some(([k,v])=>typeof v!=='string'||v.length>(k==='feedback'?1000:40)))throw Error('Invalid questionnaire answers');
  }else throw Error('Unsupported kind');
 }
}
if(import.meta.main) Deno.serve(async request=>{
 const origin=request.headers.get('origin')||'';
 const allowed=(Deno.env.get('ALLOWED_ORIGINS')||'').split(',');
 const headers={'Access-Control-Allow-Origin':allowed.includes(origin)?origin:'null','Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Content-Type':'application/json'};
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(!allowed.includes(origin))return reply({error:'Origin denied'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='POST')return reply({error:'Method denied'},405);
 try {
  // Bound streaming input before parsing; Content-Length is not trusted.
  const reader=request.body?.getReader();if(!reader)throw Error('Missing body');let size=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>256000){await reader.cancel();return reply({error:'Payload too large'},413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  const body=JSON.parse(new TextDecoder().decode(bytes));validate(body);
  if(body.session.mode==='real'&&Deno.env.get('ALLOW_REAL')!=='true')return reply({error:'Real recruitment disabled'},403);
  const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const response=await fetch(Deno.env.get('SUPABASE_URL')+'/rest/v1/rpc/ingest_batch',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({s:body.session,token:body.token,records:body.records||[],enrollment:body.enrollment||null,withdrawal:body.withdraw===true})});
  if(!response.ok)return reply({error:'Upload rejected: check enrollment, credentials, limits, or record consistency'},400);
  return reply(await response.json());
 }catch{return reply({error:'Invalid request'},400);}
});

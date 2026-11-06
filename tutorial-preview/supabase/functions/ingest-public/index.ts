import {validate} from '../ingest/index.ts';
export function validatePublic(body:any) {
 validate(body);
 if(body.session.mode!=='pilot')throw Error('Public pilot only');
}

if(import.meta.main) Deno.serve(async request=>{
 const origin=request.headers.get('origin')||'';
 const allowed=(Deno.env.get('ALLOWED_ORIGINS')||'').split(',');
 const headers={'Access-Control-Allow-Origin':allowed.includes(origin)?origin:'null','Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Content-Type':'application/json'};
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(!allowed.includes(origin))return reply({error:'Origin denied'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='POST')return reply({error:'Method denied'},405);
 if(Deno.env.get('ALLOW_PUBLIC_PILOT')!=='true')return reply({error:'Public pilot disabled'},503);
 try {
  const reader=request.body?.getReader();if(!reader)throw Error('Missing body');let size=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>256000){await reader.cancel();return reply({error:'Payload too large'},413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  const body=JSON.parse(new TextDecoder().decode(bytes));validatePublic(body);
  const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const response=await fetch(Deno.env.get('SUPABASE_URL')+'/rest/v1/rpc/ingest_public_pilot',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({s:body.session,token:body.token,records:body.records||[],withdrawal:body.withdraw===true})});
  if(!response.ok){const error=await response.json().catch(()=>({}));if(error.message==='PILOT_DAILY_CAP'||error.message==='PUBLIC_RATE_CAP')return reply({error:'Public pilot capacity limit reached'},429);return reply({error:'Upload rejected'},400);}
  return reply(await response.json());
 }catch{return reply({error:'Invalid request'},400);}
});

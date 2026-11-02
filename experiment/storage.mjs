export class Store {
  constructor(name='flicksort-v4') { this.name=name; }
  async open() {
    this.db=await new Promise((resolve,reject)=>{const r=indexedDB.open(this.name,1);r.onupgradeneeded=()=>{for(const s of ['records','state'])r.result.createObjectStore(s,{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}); return this;
  }
  tx(store,action) {return new Promise((resolve,reject)=>{const t=this.db.transaction(store,'readwrite');const r=action(t.objectStore(store));t.oncomplete=()=>resolve(r?.result);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('Storage aborted'));});}
  all() {return this.tx('records',s=>s.getAll());}
  get() {return this.tx('state',s=>s.get('current'));}
  save(state) {return this.tx('state',s=>s.put({id:'current',...state}));}
  put(record) {return this.tx('records',s=>s.put(record));}
  async commit(records,state) {return new Promise((resolve,reject)=>{const t=this.db.transaction(['records','state'],'readwrite');records.forEach(r=>t.objectStore('records').put(r));t.objectStore('state').put({id:'current',...state});t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});}
  async clear() {await this.tx('records',s=>s.clear());await this.tx('state',s=>s.clear());}
}
export class Sync {
  constructor(store,config,status=()=>{}) {Object.assign(this,{store,config,status});}
  async flush() {
    if(this.busy)return; this.busy=true;
    try {
      const state=await this.store.get(); if(!state?.session)return;
      const pending=(await this.store.all()).filter(r=>!r.synced);
      if(!this.config.supabaseUrl) {this.status(`仅本地保存 · 待同步 ${pending.length}（云端未配置）`);return;}
      // Include an empty final check so a completion/status update is acknowledged too.
      for(let i=0;i<Math.max(1,pending.length);i+=50) {
        const batch=pending.slice(i,i+50);
        const response=await fetch(this.config.supabaseUrl+'/functions/v1/ingest',{method:'POST',headers:{'Content-Type':'application/json','apikey':this.config.publishableKey},body:JSON.stringify({session:state.session,token:state.token,enrollment:state.enrollment,records:batch.map(({synced,...r})=>r)}),signal:AbortSignal.timeout(15000)});
        if(!response.ok)throw Error(`上传失败 HTTP ${response.status}`);
        const data=await response.json(); if(!Array.isArray(data.ack))throw Error('Missing acknowledgements');
        for(const record of batch)if(data.ack.includes(record.id))await this.store.put({...record,synced:true});
        if(i+50>=pending.length&&state.session.status==='completed'&&data.status!=='completed')throw Error('云端数据尚未完整，完成状态未确认');
      }
      const remaining=(await this.store.all()).filter(r=>!r.synced).length;
      this.status(remaining?`待同步 ${remaining}`:'已同步');
    }catch(e){this.status(`同步失败 · 数据已保存在本机 · ${e.message}`);}finally{this.busy=false;}
  }
}

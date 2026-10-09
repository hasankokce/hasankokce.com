import 'server-only';
import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {newsletterSettings} from './newsletter';
import {getSettings,database,initializeContent} from '../app/store';
import {postUnit,promptUnit,siteUnits,termUnits,categoryTerms,readTranslations,saveTranslation,type Unit,type UnitKind} from '../app/translations';
import type {Post} from '../app/content';

// OpenAI connection settings live in their own settings row and never reach public pages.
export type TranslationConfig={apiKey:string;model:string;auto:boolean};
type StoredConfig={key?:string;model?:string;auto?:boolean;updatedAt?:string};
export const defaultModel='gpt-5-mini';
const apiBase=()=>(process.env.OPENAI_BASE_URL||'https://api.openai.com/v1').replace(/\/$/,'');

function cipherKey(){const s=process.env.SESSION_SECRET;if(!s||s.length<32)throw Error('SESSION_SECRET must contain at least 32 characters');return createHash('sha256').update('hk-translation-key:'+s).digest()}
function seal(value:string){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',cipherKey(),iv);const data=Buffer.concat([c.update(value,'utf8'),c.final()]);return [iv,c.getAuthTag(),data].map(b=>b.toString('base64url')).join('.')}
function open(value:string){try{const [iv,tag,data]=value.split('.').map(v=>Buffer.from(v,'base64url'));const d=createDecipheriv('aes-256-gcm',cipherKey(),iv);d.setAuthTag(tag);return Buffer.concat([d.update(data),d.final()]).toString('utf8')}catch{return ''}}

async function readStored():Promise<StoredConfig>{const row=await database().prepare("SELECT data FROM settings WHERE id='translation'").first<{data:string}>();return row?JSON.parse(row.data):{}}
export async function getConfig():Promise<TranslationConfig&{keyUnreadable:boolean}>{const s=await readStored();const apiKey=s.key?open(s.key):'';return {apiKey,model:s.model||defaultModel,auto:s.auto!==false,keyUnreadable:!!s.key&&!apiKey}}
export async function saveConfig(input:{apiKey?:string;clearKey?:boolean;model:string;auto:boolean}){const s=await readStored();const next:StoredConfig={...s,model:input.model,auto:input.auto,updatedAt:new Date().toISOString()};if(input.clearKey)delete next.key;else if(input.apiKey)next.key=seal(input.apiKey);await database().prepare("INSERT INTO settings (id,data) VALUES ('translation',?) ON CONFLICT(id) DO UPDATE SET data=excluded.data").bind(JSON.stringify(next)).run()}
export const keyHint=(key:string)=>key?'••••'+key.slice(-4):'';

const instructions=`You translate content for hasankokce.com, a Turkish technology blog by Hasan Kökçe, into natural, fluent US English for an international audience.
The input is a JSON object that maps opaque keys to Turkish source texts. Reply with a JSON object that has exactly the same keys, each value being the English translation of that key's text.
Rules:
- Keep Markdown, HTML tags and attributes, line breaks, blank lines, list markers, headings and emoji exactly where they are.
- Never change URLs, email addresses, file paths, code, commands, keyboard shortcuts or @handles.
- Keep product, brand, app and model names as they are (for example iPhone, Gemini, Windows 11, ChatGPT).
- Interface labels, buttons and menu items must stay short; keep uppercase labels uppercase.
- Keep the friendly, direct tone of the original. Do not add explanations, notes or content that is not in the source, and do not leave anything out.
- If a text is already in English, return it unchanged.`;

export class TranslationError extends Error{constructor(message:string,public status=502){super(message)}}
function explain(status:number,detail:string){
 if(status===401)return 'OpenAI API anahtarı geçersiz veya iptal edilmiş.';
 if(status===403)return 'Bu API anahtarının seçili modele erişimi yok.';
 if(status===404)return 'Model bulunamadı. Model adını kontrol et.';
 if(status===429)return /quota|billing/i.test(detail)?'OpenAI hesabında kullanılabilir bakiye yok. Faturalandırma sayfasından kredi ekle.':'OpenAI istek sınırına ulaşıldı. Biraz sonra yeniden dene.';
 if(status>=500)return 'OpenAI şu an yanıt vermiyor. Biraz sonra yeniden dene.';
 return 'OpenAI isteği reddetti: '+detail.slice(0,200);
}

// One request translates a group of keyed texts and checks that every key came back.
export async function translateTexts(cfg:{apiKey:string;model:string},texts:Record<string,string>):Promise<Record<string,string>>{
 if(!cfg.apiKey)throw new TranslationError('Önce OpenAI API anahtarını kaydet.',400);
 const body:Record<string,unknown>={model:cfg.model,response_format:{type:'json_object'},messages:[{role:'system',content:instructions},{role:'user',content:JSON.stringify(texts)}]};
 if(/^(gpt-5|o\d)/.test(cfg.model))body.reasoning_effort='low';
 let res:Response;try{res=await fetch(apiBase()+'/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+cfg.apiKey,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(300000)})}catch(e){throw new TranslationError((e as Error).name==='TimeoutError'?'OpenAI yanıtı zaman aşımına uğradı.':'OpenAI sunucusuna bağlanılamadı.')}
 const raw=await res.text();if(!res.ok){let detail=raw;try{detail=JSON.parse(raw).error?.message||raw}catch{}throw new TranslationError(explain(res.status,detail),res.status===401||res.status===404?400:502)}
 let out:Record<string,unknown>;try{const data=JSON.parse(raw);if(data.choices?.[0]?.finish_reason==='length')throw Error('length');out=JSON.parse(data.choices?.[0]?.message?.content||'')}catch{throw new TranslationError('OpenAI yanıtı okunamadı; metin çok uzun olabilir.')}
 const missing=Object.keys(texts).filter(k=>typeof out[k]!=='string'||!(out[k] as string).trim());
 if(missing.length)throw new TranslationError('OpenAI yanıtında '+missing.length+' metin eksik geldi.');
 return Object.fromEntries(Object.keys(texts).map(k=>[k,out[k] as string]));
}

// What should exist in English right now: published and scheduled posts, visible prompts, site texts and category names.
async function rows(sql:string):Promise<Post[]>{const r=await database().prepare(sql).all<{data:string}>();return r.results.map(x=>JSON.parse(x.data))}
export async function currentUnits():Promise<Unit[]>{
 await initializeContent();
 const [settings,posts,scheduled,newsletter]=await Promise.all([getSettings(true),rows("SELECT data FROM posts WHERE status='published'"),rows('SELECT data FROM post_schedules'),newsletterSettings()]);
 const live=new Map<string,Post>();for(const p of posts)if(!p.demo)live.set(p.id,p);for(const p of scheduled)if(!p.demo)live.set(p.id,p);
 const visible={...settings,prompts:settings.prompts.filter(p=>p.visible)};
 return [...siteUnits(visible,newsletter),...termUnits(categoryTerms(visible,[...live.values()])),...visible.prompts.map(promptUnit),...[...live.values()].map(postUnit)].filter((u):u is Unit=>!!u);
}
export type KindStatus={total:number;done:number;outdated:number;missing:number};
export async function translationStatus(){
 const [units,stored]=await Promise.all([currentUnits(),readTranslations(['post','prompt','site','term'])]);
 const status:Record<UnitKind,KindStatus>={post:{total:0,done:0,outdated:0,missing:0},prompt:{total:0,done:0,outdated:0,missing:0},site:{total:0,done:0,outdated:0,missing:0},term:{total:0,done:0,outdated:0,missing:0}};
 const pending:Unit[]=[];for(const u of units){const s=status[u.kind],t=stored.get(u.kind+'|'+u.id);s.total++;if(!t){s.missing++;pending.push(u)}else if(t.hash!==u.hash){s.outdated++;pending.push(u)}else s.done++}
 return {status,pending};
}

// Background queue. One process serves the site, so in-memory state is enough; unfinished work is found again by translationStatus.
type Job={running:boolean;total:number;done:number;failed:number;lastError:string;startedAt:string;finishedAt:string};
const g=globalThis as typeof globalThis&{__hkTranslation?:{job:Job;queue:Map<string,Unit>}};
const state=g.__hkTranslation??={job:{running:false,total:0,done:0,failed:0,lastError:'',startedAt:'',finishedAt:''},queue:new Map()};
export const jobState=()=>({...state.job,queued:state.queue.size});
const budget=6000;
function nextBatch():Unit[]{const batch:Unit[]=[];let size=0;for(const [key,u] of state.queue){const n=JSON.stringify(u.fields).length;if(batch.length&&(size+n>budget||u.kind==='post'||batch[0].kind==='post'))continue;batch.push(u);size+=n;state.queue.delete(key);if(u.kind==='post'||size>=budget)break}return batch}
async function translateBatch(cfg:TranslationConfig,batch:Unit[]){
 const texts:Record<string,string>={};batch.forEach((u,i)=>{for(const [f,v] of Object.entries(u.fields))texts[i+'.'+u.kind+'.'+f]=v});
 const out=await translateTexts(cfg,texts);
 for(const [i,u] of batch.entries())await saveTranslation(u,Object.fromEntries(Object.keys(u.fields).map(f=>[f,out[i+'.'+u.kind+'.'+f]])),cfg.model);
}
async function worker(cfg:TranslationConfig){
 for(let batch=nextBatch();batch.length;batch=nextBatch()){
  try{await translateBatch(cfg,batch);state.job.done+=batch.length}
  catch(e){state.job.failed+=batch.length;state.job.lastError=e instanceof Error?e.message:String(e);console.error('translation',state.job.lastError);
   // A bad key or empty balance fails every request; stop instead of burning through the queue.
   if(e instanceof TranslationError&&/anahtar|bakiye|Model bulunamadı|erişimi yok/.test(e.message)){state.job.failed+=state.queue.size;state.queue.clear()}}
 }
}
export async function enqueue(units:Unit[]){
 let added=0;for(const u of units){const key=u.kind+'|'+u.id;if(!state.queue.has(key))added++;state.queue.set(key,u)}
 if(state.job.running){state.job.total+=added;return jobState()}
 if(!state.queue.size)return jobState();
 const cfg=await getConfig();if(!cfg.apiKey){state.queue.clear();throw new TranslationError('Önce OpenAI API anahtarını kaydet.',400)}
 state.job={running:true,total:state.queue.size,done:0,failed:0,lastError:'',startedAt:new Date().toISOString(),finishedAt:''};
 void (async()=>{try{while(state.queue.size)await Promise.all([worker(cfg),worker(cfg),worker(cfg)])}finally{state.job.running=false;state.job.finishedAt=new Date().toISOString()}})();
 return jobState();
}
// Called after content is saved in the admin panel: translates whatever is new or changed.
export async function autoTranslate(){try{const cfg=await getConfig();if(!cfg.auto||!cfg.apiKey)return;const {pending}=await translationStatus();if(pending.length)await enqueue(pending)}catch(e){console.error('auto translation',e)}}

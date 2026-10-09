import 'server-only';
import {createHash} from 'node:crypto';
import {env} from '../runtime/platform';
import type {Settings,Post} from './content';
import type {PromptItem} from './prompts';
import type {Locale} from './i18n';

// A translation unit is one translatable thing: a post, a prompt, one site text or one category name.
export type UnitKind='post'|'prompt'|'site'|'term';
export type Unit={kind:UnitKind;id:string;fields:Record<string,string>;hash:string};
export type Stored={kind:UnitKind;id:string;hash:string;data:Record<string,string>};
export const targetLanguage:Exclude<Locale,'tr'>='en';

const hasText=(v:unknown):v is string=>typeof v==='string'&&/\p{L}/u.test(v);
export function hashFields(fields:Record<string,string>){return createHash('sha256').update(JSON.stringify(Object.entries(fields).sort(([a],[b])=>a.localeCompare(b)))).digest('hex').slice(0,24)}
function unit(kind:UnitKind,id:string,fields:Record<string,string|undefined>):Unit|null{const clean=Object.fromEntries(Object.entries(fields).filter((e):e is [string,string]=>hasText(e[1])));return Object.keys(clean).length?{kind,id,fields:clean,hash:hashFields(clean)}:null}

const topTexts=['tagline','heroTitle','heroDescription','aboutTitle','aboutBody','aboutJourney','aboutTopics','aboutApproach','promptHomeTitle','promptHomeDescription','promptTitle','promptDescription','seoTitle','seoDescription','collabTitle','collabBody','collabServices','collabFormatsTitle','collabProcessTitle','collabApproachTitle','collabApproachBody','collabCtaTitle','collabCtaBody','contactTitle','contactDescription','guideTitle','guideDescription','toolsTitle','toolsDescription','gearTitle','gearDescription','privacy','footer'] as const;
const cardTexts=['title','category','description','note','imageAlt','buttonLabel'] as const;
const collections=['tools','gear','projects'] as const;
type Newsletter={title:string;description:string;button:string};

// Every visitor-facing text in the site settings, keyed by a stable path. Prompts and category names are separate units.
export function siteTexts(s:Settings,newsletter?:Newsletter):Record<string,string>{
 const out:Record<string,string>={};const put=(key:string,v:unknown)=>{if(hasText(v))out[key]=v};
 for(const k of topTexts)put(k,s[k]);
 for(const [k,v] of Object.entries(s.ui))put('ui|'+k,v);
 for(const n of s.navigation)put('nav|'+n.path,n.label);
 s.collabFormats.forEach((x,i)=>{put('collabFormats|'+i+'|title',x.title);put('collabFormats|'+i+'|body',x.body)});
 s.collabSteps.forEach((x,i)=>{put('collabSteps|'+i+'|title',x.title);put('collabSteps|'+i+'|body',x.body)});
 for(const c of collections)for(const item of s[c])if(item.visible)for(const f of cardTexts)put(c+'|'+item.id+'|'+f,item[f]);
 put('management|logoAlt',s.management.logoAlt);put('management|heroImageAlt',s.management.heroImageAlt);
 for(const [path,seo] of Object.entries(s.management.pageSeo)){put('pageSeo|'+path+'|title',seo.title);put('pageSeo|'+path+'|description',seo.description)}
 if(newsletter)for(const k of ['title','description','button'] as const)put('newsletter|'+k,newsletter[k]);
 return out;
}
function setSiteText(s:Settings,key:string,value:string){
 const [head,a,b]=key.split('|');const r=s as unknown as Record<string,unknown>;
 if(!a){if((topTexts as readonly string[]).includes(head))r[head]=value;return}
 if(head==='ui'){(s.ui as Record<string,string>)[a]=value;return}
 if(head==='nav'){const n=s.navigation.find(x=>x.path===a);if(n)n.label=value;return}
 if(head==='collabFormats'||head==='collabSteps'){const item=s[head][Number(a)];if(item&&(b==='title'||b==='body'))item[b]=value;return}
 if((collections as readonly string[]).includes(head)){const item=s[head as typeof collections[number]].find(x=>x.id===a);if(item&&(cardTexts as readonly string[]).includes(b))(item as Record<string,unknown>)[b]=value;return}
 if(head==='management'&&(a==='logoAlt'||a==='heroImageAlt')){s.management[a]=value;return}
 if(head==='pageSeo'){const seo=s.management.pageSeo[a as keyof typeof s.management.pageSeo];if(seo&&(b==='title'||b==='description'))seo[b]=value}
}

export const promptTexts=['title','description','prompt','notes','imageAlt','tool'] as const;
export function postUnit(p:Post){return unit('post',p.id,{title:p.title,excerpt:p.excerpt,body:p.body,imageAlt:p.imageAlt,seoTitle:p.seoTitle,seoDescription:p.seoDescription,sources:p.sources,...Object.fromEntries((p.tags||[]).map((t,i)=>['tag'+i,t]))})}
export function promptUnit(p:PromptItem){return unit('prompt',p.id,Object.fromEntries(promptTexts.map(k=>[k,p[k]])))}
export function siteUnits(s:Settings,newsletter?:Newsletter){return Object.entries(siteTexts(s,newsletter)).map(([k,v])=>unit('site',k,{text:v})).filter((u):u is Unit=>!!u)}
export function termUnits(terms:Iterable<string>){return [...new Set([...terms].map(t=>t.trim()))].map(t=>unit('term',t,{text:t})).filter((u):u is Unit=>!!u)}
export function categoryTerms(s:Settings,posts:Post[]){return [...s.categories.split(','),...posts.map(p=>p.category),...s.prompts.map(p=>p.category)].map(t=>t.trim()).filter(Boolean)}

export async function readTranslations(kinds:UnitKind[]):Promise<Map<string,Stored>>{
 const rows=await env.DB.prepare(`SELECT kind,item_id,source_hash,data FROM translations WHERE lang=? AND kind IN (${kinds.map(()=>'?').join(',')})`).bind(targetLanguage,...kinds).all<{kind:UnitKind;item_id:string;source_hash:string;data:string}>();
 return new Map(rows.results.map(r=>[r.kind+'|'+r.item_id,{kind:r.kind,id:r.item_id,hash:r.source_hash,data:JSON.parse(r.data)}]));
}
export async function saveTranslation(u:Unit,data:Record<string,string>,model:string){await env.DB.prepare('INSERT INTO translations(kind,item_id,lang,source_hash,data,model,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(kind,item_id,lang) DO UPDATE SET source_hash=excluded.source_hash,data=excluded.data,model=excluded.model,updated_at=excluded.updated_at').bind(u.kind,u.id,targetLanguage,u.hash,JSON.stringify(data),model,new Date().toISOString()).run()}

const pick=(t:Stored|undefined,field:string,fallback:string)=>t?.data[field]||fallback;
const term=(map:Map<string,Stored>,value:string)=>value&&pick(map.get('term|'+value.trim()),'text',value);

// English overlays. Anything not translated yet keeps its Turkish text, so pages never break.
export function englishSettings(source:Settings,map:Map<string,Stored>):Settings{
 const s=structuredClone(source);
 // Site texts are short, so an outdated translation is dropped rather than shown next to a changed Turkish text.
 for(const [key,text] of Object.entries(siteTexts(s))){const t=map.get('site|'+key);if(t?.data.text&&t.hash===hashFields({text}))setSiteText(s,key,t.data.text)}
 s.categories=s.categories.split(',').map(c=>term(map,c.trim())).filter(Boolean).join(',');
 s.prompts=s.prompts.map(p=>{const t=map.get('prompt|'+p.id);const out={...p,category:term(map,p.category)};if(t)for(const k of promptTexts)out[k]=pick(t,k,p[k]);return out});
 return s;
}
export function englishPost(p:Post,map:Map<string,Stored>):Post&{translated:boolean}{
 const t=map.get('post|'+p.id);const out={...p,category:term(map,p.category),translated:!!t};if(!t)return out;
 for(const k of ['title','excerpt','body','imageAlt','seoTitle','seoDescription','sources'] as const)if(p[k])out[k]=pick(t,k,p[k]!);
 if(p.tags)out.tags=p.tags.map((tag,i)=>pick(t,'tag'+i,tag));
 return out;
}
export function englishNewsletter<T extends Newsletter>(n:T,map:Map<string,Stored>):T{const out={...n};for(const k of ['title','description','button'] as const){const t=map.get('site|newsletter|'+k);if(t?.data.text&&t.hash===hashFields({text:n[k]}))out[k]=t.data.text}return out}

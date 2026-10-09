'use client';
import {useEffect,useState} from 'react';
type Count={total:number;done:number;outdated:number;missing:number};
type Kind='post'|'prompt'|'site'|'term';
type Job={running:boolean;total:number;done:number;failed:number;queued:number;lastError:string;finishedAt:string;items?:string[]};
type Data={hasKey:boolean;keyHint:string;keyUnreadable:boolean;model:string;auto:boolean;status:Record<Kind,Count>;job:Job;message?:string;error?:string};
type Item={id:string;label:string;english:string;state:'done'|'outdated'|'missing'};
const kinds=[['post','Yazılar'],['prompt','Promptlar'],['term','Kategori adları'],['site','Site metinleri ve menüler']] as const;
const stateLabel={done:'Çevrildi',outdated:'Güncellenmeli',missing:'Bekliyor'} as const;

// Per-item list: each post, prompt, category name or site text can be translated on its own.
function ItemList({data,busy,act,refreshKey}:{data:Data;busy:boolean;act:(body:Record<string,unknown>)=>Promise<void>;refreshKey:number}){
 const [kind,setKind]=useState<Kind>('post'),[items,setItems]=useState<Item[]>(),[q,setQ]=useState(''),[show,setShow]=useState<'all'|'pending'|'done'>('all'),[picked,setPicked]=useState<Set<string>>(new Set()),[error,setError]=useState('');
 useEffect(()=>{let live=true;fetch('/api/admin/translation?items='+kind).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);if(live){setItems(d.items);setError('')}}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[kind,refreshKey]);
 useEffect(()=>{setPicked(new Set());setQ('');setShow('all')},[kind]);
 const queued=new Set(data.job.items||[]);const inQueue=(id:string)=>queued.has(kind+'|'+id);
 const needle=q.trim().toLocaleLowerCase('tr');
 const list=(items||[]).filter(i=>(show==='all'||(show==='done'?i.state==='done':i.state!=='done'))&&(!needle||(i.label+' '+i.english).toLocaleLowerCase('tr').includes(needle)));
 const pending=data.status[kind].missing+data.status[kind].outdated;const disabled=busy||!data.hasKey;
 const translate=(ids:string[])=>act({action:'translate',kind,ids}).then(()=>setPicked(new Set()));
 const toggle=(id:string)=>setPicked(p=>{const n=new Set(p);if(n.has(id))n.delete(id);else n.add(id);return n});
 const allPicked=list.length>0&&list.every(i=>picked.has(i.id));
 return <section className="admin-card tr-items"><h2>İçerikleri ayrı ayrı çevir</h2><p>Bir bölüm seç; her içeriği tek tek, seçtiklerini birlikte ya da o bölümde bekleyenlerin hepsini çevirebilirsin. Çevrilmiş bir içeriği istersen yeniden çevirebilirsin.</p>
  <div className="tr-tabs" role="tablist">{kinds.map(([k,label])=>{const c=data.status[k];const n=c.missing+c.outdated;return <button key={k} role="tab" aria-selected={kind===k} className={kind===k?'on':''} onClick={()=>setKind(k)}>{label}<span className={'tr-count'+(n?' warn':'')}>{n?n+' bekliyor':c.done+'/'+c.total}</span></button>})}</div>
  <div className="tr-toolbar"><input type="search" placeholder="Bu bölümde ara" value={q} onChange={e=>setQ(e.target.value)} aria-label="Bu bölümde ara"/><select value={show} onChange={e=>setShow(e.target.value as typeof show)} aria-label="Duruma göre filtrele"><option value="all">Tümü</option><option value="pending">Çevrilmemiş / güncellenmeli</option><option value="done">Çevrilmiş</option></select></div>
  <div className="tr-bulk"><button disabled={disabled||!picked.size} onClick={()=>translate([...picked])}>Seçilenleri çevir{picked.size?' ('+picked.size+')':''}</button><button className="ghost" disabled={disabled||!pending||data.job.running} onClick={()=>act({action:'sync',kind})}>{pending?'Bu bölümde bekleyen '+pending+' içeriği çevir':'Bu bölümün hepsi çevrilmiş'}</button></div>
  {error&&<p className="admin-notice error" role="alert">{error}</p>}
  {!items?<p>Yükleniyor…</p>:!list.length?<p className="tr-empty">{items.length?'Bu filtreye uyan içerik yok.':'Bu bölümde çevrilecek içerik yok.'}</p>:
  <ul className="tr-list"><li className="tr-row tr-head"><label><input type="checkbox" checked={allPicked} onChange={()=>setPicked(allPicked?new Set():new Set(list.map(i=>i.id)))}/> Görünenlerin hepsini seç</label><span>{list.length} içerik</span></li>
   {list.map(i=>{const wait=inQueue(i.id);return <li key={i.id} className="tr-row"><input type="checkbox" checked={picked.has(i.id)} onChange={()=>toggle(i.id)} aria-label={i.label+' seç'}/><div className="tr-text"><strong>{i.label}</strong>{i.english&&<span lang="en">EN: {i.english}</span>}</div><span className={'tr-badge '+(wait?'busy':i.state)}>{wait?'Çevriliyor…':stateLabel[i.state]}</span><button className={i.state==='done'?'ghost':''} disabled={disabled||wait} onClick={()=>translate([i.id])}>{i.state==='done'?'Yeniden çevir':'Çevir'}</button></li>})}
  </ul>}
 </section>;
}
export default function Translation(){const [data,setData]=useState<Data>(),[tick,setTick]=useState(0),[apiKey,setApiKey]=useState(''),[model,setModel]=useState(''),[auto,setAuto]=useState(true),[notice,setNotice]=useState(''),[error,setError]=useState(false),[busy,setBusy]=useState(false);
 function apply(d:Data,form=false){setData(d);if(form){setModel(d.model);setAuto(d.auto)}}
 async function load(form=false){const r=await fetch('/api/admin/translation');const d=await r.json();if(!r.ok)throw Error(d.error);apply(d,form)}
 useEffect(()=>{load(true).catch(e=>{setError(true);setNotice(e.message)})},[]);
 // While a job runs, refresh the summary and the open list so finished rows update by themselves.
 useEffect(()=>{if(!data?.job.running){setTick(t=>t+1);return}const t=setInterval(()=>{load().then(()=>setTick(n=>n+1)).catch(()=>{})},3000);return()=>clearInterval(t)},[data?.job.running]);
 async function act(body:Record<string,unknown>){setBusy(true);setNotice('');try{const r=await fetch('/api/admin/translation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error);apply(d,body.action==='save');setTick(t=>t+1);setError(false);setNotice(d.message||'');if(body.action==='save')setApiKey('')}catch(e){setError(true);setNotice(e instanceof Error?e.message:'İşlem başarısız.')}finally{setBusy(false)}}
 const job=data?.job;const pending=data?Object.values(data.status).reduce((a,c)=>a+c.missing+c.outdated,0):0;
 return <div className="newsletter-admin translation-admin">{notice&&<p className={'admin-notice '+(error?'error':'')} role={error?'alert':'status'}>{notice}</p>}
  <section className="admin-card"><h2>İngilizce site</h2><p>İngilizce sayfalar <a href="/en" target="_blank" rel="noopener noreferrer">hasankokce.com/en</a> altında yayınlanır. Henüz çevrilmemiş bir içerik İngilizce sayfada Türkçe görünür; çevrilmemiş yazılar arama motorlarına İngilizce olarak gösterilmez.</p>
   {data&&<table className="translation-status"><thead><tr><th>İçerik</th><th>Çevrildi</th><th>Güncellenmeli</th><th>Bekliyor</th></tr></thead><tbody>{kinds.map(([k,label])=><tr key={k}><td>{label}</td><td>{data.status[k].done} / {data.status[k].total}</td><td>{data.status[k].outdated}</td><td>{data.status[k].missing}</td></tr>)}</tbody></table>}
   {job?.running?<p role="status">Çeviriliyor: {job.done+job.failed} / {job.total}{job.failed?' · '+job.failed+' başarısız':''}</p>:job?.finishedAt?<p>Son çeviri: {job.done} içerik çevrildi{job.failed?', '+job.failed+' başarısız':''}.{job.lastError&&' Son hata: '+job.lastError}</p>:null}
   <button disabled={busy||!data?.hasKey||job?.running||!pending} onClick={()=>act({action:'sync'})}>{pending?'Bekleyen tüm içerikleri çevir ('+pending+')':'Her şey çevrilmiş'}</button><small className="tr-hint">Çok sayıda içerik varsa aşağıdan bölüm bölüm ya da tek tek çevirmen daha kontrollü olur.</small>
  </section>
  {data&&<ItemList data={data} busy={busy} act={act} refreshKey={tick}/>}
  <section className="admin-card"><h2>OpenAI (ChatGPT) API bağlantısı</h2>
   <p>{data?.hasKey?'Kayıtlı anahtar: '+data.keyHint:data?.keyUnreadable?'Kayıtlı anahtar okunamadı (sunucu gizli anahtarı değişmiş olabilir). Anahtarı yeniden gir.':'Henüz API anahtarı kaydedilmedi.'} Anahtarı platform.openai.com → API keys sayfasından oluşturabilirsin. Anahtar sunucuda şifreli saklanır ve burada bir daha tam gösterilmez.</p>
   <fieldset disabled={busy}>
    <label>{data?.hasKey?'Yeni API anahtarı (değiştirmek istemiyorsan boş bırak)':'API anahtarı'}<input type="password" autoComplete="off" spellCheck={false} placeholder="sk-..." value={apiKey} onChange={e=>setApiKey(e.target.value)}/></label>
    <label>Model<input value={model} onChange={e=>setModel(e.target.value)} spellCheck={false}/><small>Varsayılan gpt-5-mini: hızlı ve ucuz. Daha yüksek kalite için gpt-5 yazabilirsin.</small></label>
    <label><input type="checkbox" style={{width:'auto',display:'inline'}} checked={auto} onChange={e=>setAuto(e.target.checked)}/> Yeni ve değişen içerikleri kaydedince otomatik çevir</label>
    <div className="translation-actions"><button onClick={()=>act({action:'save',apiKey:apiKey||undefined,model,auto})}>Kaydet</button><button disabled={!data?.hasKey} onClick={()=>act({action:'test'})}>Bağlantıyı test et</button>{data?.hasKey&&<button onClick={()=>{if(confirm('API anahtarı silinsin mi? Otomatik çeviri duracak.'))void act({action:'save',clearKey:true,model,auto})}}>Anahtarı sil</button>}</div>
   </fieldset>
  </section>
 </div>}

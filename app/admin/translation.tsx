'use client';
import {useEffect,useState} from 'react';
type Count={total:number;done:number;outdated:number;missing:number};
type Data={hasKey:boolean;keyHint:string;keyUnreadable:boolean;model:string;auto:boolean;status:Record<'post'|'prompt'|'site'|'term',Count>;job:{running:boolean;total:number;done:number;failed:number;queued:number;lastError:string;finishedAt:string};message?:string;error?:string};
const kinds=[['post','Yazılar'],['prompt','Promptlar'],['site','Site metinleri ve menüler'],['term','Kategori adları']] as const;
export default function Translation(){const [data,setData]=useState<Data>(),[apiKey,setApiKey]=useState(''),[model,setModel]=useState(''),[auto,setAuto]=useState(true),[notice,setNotice]=useState(''),[error,setError]=useState(false),[busy,setBusy]=useState(false);
 function apply(d:Data,form=false){setData(d);if(form){setModel(d.model);setAuto(d.auto)}}
 async function load(form=false){const r=await fetch('/api/admin/translation');const d=await r.json();if(!r.ok)throw Error(d.error);apply(d,form)}
 useEffect(()=>{load(true).catch(e=>{setError(true);setNotice(e.message)})},[]);
 useEffect(()=>{if(!data?.job.running)return;const t=setInterval(()=>{load().catch(()=>{})},3000);return()=>clearInterval(t)},[data?.job.running]);
 async function act(body:Record<string,unknown>){setBusy(true);setNotice('');try{const r=await fetch('/api/admin/translation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error);apply(d,body.action==='save');setError(false);setNotice(d.message||'');if(body.action==='save')setApiKey('')}catch(e){setError(true);setNotice(e instanceof Error?e.message:'İşlem başarısız.')}finally{setBusy(false)}}
 const job=data?.job;const pending=data?Object.values(data.status).reduce((a,c)=>a+c.missing+c.outdated,0):0;
 return <div className="newsletter-admin translation-admin">{notice&&<p className={'admin-notice '+(error?'error':'')} role={error?'alert':'status'}>{notice}</p>}
  <section className="admin-card"><h2>İngilizce site</h2><p>İngilizce sayfalar <a href="/en" target="_blank" rel="noopener noreferrer">hasankokce.com/en</a> altında yayınlanır. Henüz çevrilmemiş bir içerik İngilizce sayfada Türkçe görünür; çevrilmemiş yazılar arama motorlarına İngilizce olarak gösterilmez.</p>
   {data&&<table className="translation-status"><thead><tr><th>İçerik</th><th>Çevrildi</th><th>Güncellenmeli</th><th>Bekliyor</th></tr></thead><tbody>{kinds.map(([k,label])=><tr key={k}><td>{label}</td><td>{data.status[k].done} / {data.status[k].total}</td><td>{data.status[k].outdated}</td><td>{data.status[k].missing}</td></tr>)}</tbody></table>}
   {job?.running?<p role="status">Çeviriliyor: {job.done+job.failed} / {job.total}{job.failed?' · '+job.failed+' başarısız':''}</p>:job?.finishedAt?<p>Son çeviri: {job.done} içerik çevrildi{job.failed?', '+job.failed+' başarısız':''}.{job.lastError&&' Son hata: '+job.lastError}</p>:null}
   <button disabled={busy||!data?.hasKey||job?.running||!pending} onClick={()=>act({action:'sync'})}>{pending?pending+' içeriği şimdi çevir':'Her şey çevrilmiş'}</button>
  </section>
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

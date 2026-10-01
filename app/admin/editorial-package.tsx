'use client';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import articles from '../../content/editorial-2026-09.json';
import shortcuts from '../../content/shortcuts.json';
import type {Post,Settings} from '../content';

// A reviewed, finite content batch. It uses the same authenticated, versioned
// publication workflow as the manual editor; it is not a background importer.
export default function EditorialPackage({posts,settings}:{posts:Post[];settings:Settings}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const pending=articles.filter(p=>posts.some(x=>x.id===p.id&&x.demo));
 const missing=shortcuts.filter(t=>!settings.tools.some(x=>x.url===t.url));
 if(!pending.length&&!missing.length)return null;
 async function apply(){
  setBusy(true);setMessage('Mevcut içerikler kontrol ediliyor…');
  try{
   const res=await fetch('/api/admin/posts');if(!res.ok)throw Error('Yazılar okunamadı.');
   const current:Post[]=await res.json();
   for(const article of articles){
    const old=current.find(p=>p.id===article.id);if(!old?.demo)continue;
    setMessage(article.title+' hazırlanıyor…');
    const r=await fetch('/api/admin/workflow?id='+encodeURIComponent(article.id));if(!r.ok)throw Error('Sürüm geçmişi okunamadı.');
    const state=await r.json() as {schedule?:unknown;draft?:Post;version:number};
    if(state.schedule)throw Error('Bu yazının yayın planı var. Önce planı editörde kontrol et: '+old.title);
    if(state.draft&&!state.draft.demo)throw Error('Bu yazıda gerçek içerik taslağı var; üzerine yazılmadı: '+old.title);
    const saved=await fetch('/api/admin/workflow',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'publish',id:article.id,version:state.version,post:article})});
    const result=await saved.json() as {error?:string};if(!saved.ok)throw Error(result.error||'Yazı kaydedilemedi.');
   }
   setMessage('Kestirmeler ekleniyor…');
   const r=await fetch('/api/admin/settings');if(!r.ok)throw Error('Site ayarları okunamadı.');
   const latest:Settings=await r.json();
   const merged=shortcuts.map(t=>{const existing=latest.tools.find(x=>x.url===t.url);return existing?{...t,id:existing.id,image:existing.image}:t});
   const tools=[...merged,...latest.tools.filter(x=>!shortcuts.some(t=>t.url===x.url))];
   const saved=await fetch('/api/admin/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...latest,tools})});
   if(!saved.ok){const d=await saved.json() as {error?:string};throw Error(d.error||'Kestirmeler kaydedilemedi.')}
   setMessage('Dört makale ve yedi kestirme hazır.');window.location.reload();
  }catch(e){setMessage((e instanceof Error?e.message:'İşlem tamamlanamadı.')+' Tamamlanan yazılar korunur; yeniden denemede tekrarlanmaz.');setBusy(false)}
 }
 return <section className="admin-card editorial-package"><h2>Hazırlanan içerikler</h2><p>Kaynakları eklenmiş dört makale ve Linktree’deki yedi kestirme. Örnek yazıların eski sürümleri geçmişte saklanır; mevcut gerçek yazılara dokunulmaz.</p><ul>{articles.map(p=><li key={p.id}>{p.title}</li>)}</ul><p>Kapaklar temsili illüstrasyonlardır. Yazıları yayınladıktan sonra editörden düzenleyebilirsin.</p><Button disabled={busy} onClick={()=>void apply()}>{busy?'İçerikler kaydediliyor…':'Hazırlanan yazıları yayınla ve kestirmeleri ekle'}</Button>{message&&<p role="status">{message}</p>}</section>;
}

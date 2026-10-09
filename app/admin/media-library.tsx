'use client';
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Trash2,LoaderCircle,Layers,FileText,Sparkles,User,Wrench,FolderOpen} from 'lucide-react';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';

type MediaCategory = 'posts' | 'prompts' | 'profile' | 'tools' | 'other';
type Item = {
  key: string;
  url?: string;
  name: string;
  alt: string;
  category?: MediaCategory;
  usages?: string[];
};

const categoryBadges: Record<string, { label: string; bg: string; text: string; border: string }> = {
  posts: { label: 'Yazı Görseli', bg: '#eef2ff', text: '#3730a3', border: '#c7d2fe' },
  prompts: { label: 'Prompt', bg: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe' },
  profile: { label: 'Profil & Site', bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
  tools: { label: 'Araç / Ekipman', bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  other: { label: 'Genel Yükleme', bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb' },
};

export default function MediaLibrary({onSelect}:{onSelect?:(url:string,alt:string)=>void}){
 const [items,setItems]=useState<Item[]>([]),[query,setQuery]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [deleteTarget,setDeleteTarget]=useState<Item|null>(null),[deleting,setDeleting]=useState(false);
 const [activeCategory,setActiveCategory]=useState<'all'|MediaCategory>('all');

 async function load(){try{const r=await fetch('/api/admin/media');if(!r.ok)throw Error('Görsel arşivi yüklenemedi.');setItems(await r.json())}catch(e){setError(String(e))}}
 useEffect(()=>{void load()},[]);

 async function upload(file?:File){if(!file)return;setBusy(true);setError('');try{const f=new FormData();f.append('file',file);const r=await fetch('/api/admin/media',{method:'POST',body:f}),d=await r.json() as {error:string};if(!r.ok)throw Error(d.error);await load()}catch(e){setError(String(e))}finally{setBusy(false)}}
 async function save(item:Item){setBusy(true);try{const r=await fetch('/api/admin/media',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)});if(!r.ok)throw Error('Alternatif metin kaydedilemedi.');setError('Alternatif metin kaydedildi.')}catch(e){setError(String(e))}finally{setBusy(false)}}
 async function removeMedia(){if(!deleteTarget||deleting)return;setDeleting(true);try{const r=await fetch('/api/admin/media',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:deleteTarget.key,confirm:'DELETE'})});const d=await r.json() as {error?:string};if(!r.ok)throw Error(d.error||'Görsel silinemedi.');setItems(all=>all.filter(x=>x.key!==deleteTarget.key));setError('Görsel arşivden kalıcı olarak silindi.');setDeleteTarget(null)}catch(e){setError(String(e))}finally{setDeleting(false)}}

 const counts = {
  all: items.length,
  posts: items.filter(x => x.category === 'posts').length,
  prompts: items.filter(x => x.category === 'prompts').length,
  profile: items.filter(x => x.category === 'profile').length,
  tools: items.filter(x => x.category === 'tools').length,
  other: items.filter(x => !x.category || x.category === 'other').length,
 };

 const categories = [
  { id: 'all', label: 'Tümü', icon: Layers, count: counts.all },
  { id: 'posts', label: 'Yazılar', icon: FileText, count: counts.posts },
  { id: 'prompts', label: 'Promptlar', icon: Sparkles, count: counts.prompts },
  { id: 'profile', label: 'Profil & Site', icon: User, count: counts.profile },
  { id: 'tools', label: 'Araç & Ekipman', icon: Wrench, count: counts.tools },
  { id: 'other', label: 'Diğer / Yüklenenler', icon: FolderOpen, count: counts.other },
 ] as const;

 const filtered = items.filter(item => {
  const cat = item.category || 'other';
  if (activeCategory !== 'all' && cat !== activeCategory) return false;
  if (!query.trim()) return true;
  const q = query.toLocaleLowerCase('tr');
  const nameMatch = item.name.toLocaleLowerCase('tr').includes(q);
  const altMatch = (item.alt || '').toLocaleLowerCase('tr').includes(q);
  const usageMatch = (item.usages || []).some(u => u.toLocaleLowerCase('tr').includes(q));
  return nameMatch || altMatch || usageMatch;
 });

 return <section className="media-library">
  <AlertDialog open={!!deleteTarget} onOpenChange={v=>{if(!v&&!deleting)setDeleteTarget(null)}}>
   <AlertDialogContent>
    <AlertDialogHeader>
     <AlertDialogTitle>Görseli silmek istediğine emin misin?</AlertDialogTitle>
     <AlertDialogDescription>&ldquo;{deleteTarget?.name}&rdquo; adlı görsel depolama alanından ve arşivden kalıcı olarak silinecek. Varsa bu görseli kullanan yazılarda veya sayfalarda görsel bağlantısı çalışmayabilir. Bu işlem geri alınamaz.</AlertDialogDescription>
    </AlertDialogHeader>
    {deleteTarget&&<div style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px',background:'var(--surface-soft,#f7f9f6)',borderRadius:'8px',margin:'8px 0'}}>
     <img src={deleteTarget.url||'/api/media/'+deleteTarget.key} alt={deleteTarget.alt||deleteTarget.name} style={{width:'56px',height:'56px',objectFit:'cover',borderRadius:'6px',border:'1px solid var(--border)'}}/>
     <div style={{overflow:'hidden',minWidth:0}}>
      <strong style={{display:'block',fontSize:'14px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{deleteTarget.name}</strong>
      <small style={{color:'var(--muted-foreground)',fontSize:'12px'}}>{deleteTarget.key}</small>
     </div>
    </div>}
    <AlertDialogFooter>
     <AlertDialogCancel disabled={deleting} onClick={()=>setDeleteTarget(null)}>İptal</AlertDialogCancel>
     <AlertDialogAction disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={()=>void removeMedia()}>{deleting?<LoaderCircle className="spin" size={16}/>:null} {deleting?'Siliniyor…':'Kalıcı olarak sil'}</AlertDialogAction>
    </AlertDialogFooter>
   </AlertDialogContent>
  </AlertDialog>

  <div className="workflow-row">
   <Input aria-label="Görsellerde ara" placeholder="Dosya adı, alternatif metin veya kullanım alanına göre ara…" value={query} onChange={e=>setQuery(e.target.value)}/>
   <label className="upload-button">{busy?'Yükleniyor…':'Görsel yükle'}<input aria-label="Arşive görsel yükle" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>void upload(e.target.files?.[0])}/></label>
  </div>

  <div className="media-filter-bar" style={{display:'flex',gap:'8px',flexWrap:'wrap',margin:'14px 0 16px 0'}}>
   {categories.map(c => {
    const Icon = c.icon;
    const isActive = activeCategory === c.id;
    return (
     <button
      key={c.id}
      type="button"
      onClick={() => setActiveCategory(c.id)}
      style={{
       display: 'inline-flex',
       alignItems: 'center',
       gap: '6px',
       borderRadius: '9999px',
       padding: '6px 14px',
       fontSize: '13px',
       fontWeight: isActive ? 600 : 500,
       background: isActive ? 'var(--brand-ink, #203017)' : 'var(--surface-soft, #f7f9f6)',
       color: isActive ? '#ffffff' : 'var(--foreground, #1c201d)',
       border: isActive ? '1px solid var(--brand-ink, #203017)' : '1px solid var(--border, #e2e8df)',
       cursor: 'pointer',
       transition: 'all 0.15s ease'
      }}
     >
      <Icon size={14}/>
      <span>{c.label}</span>
      <span style={{
       fontSize: '11px',
       padding: '1px 6px',
       borderRadius: '10px',
       background: isActive ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.06)',
       color: isActive ? '#ffffff' : 'var(--muted-foreground, #667261)'
      }}>
       {c.count}
      </span>
     </button>
    );
   })}
  </div>

  <p className="admin-help">Kategorilere göre filtreleyebilir, alternatif metinlerini düzenleyebilir veya artık kullanmadığın görselleri arşivden kalıcı olarak silebilirsin.</p>
  {error&&<p role="status">{error}</p>}

  <div className="media-library-grid">
   {filtered.map(item => {
    const badge = categoryBadges[item.category || 'other'] || categoryBadges.other;
    return (
     <article key={item.key} style={{display:'flex',flexDirection:'column',gap:'10px',position:'relative'}}>
      <div style={{position:'relative',width:'100%',height:'150px',background:'var(--surface-soft,#f4f7f2)',borderRadius:'6px',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
       <img src={item.url||'/api/media/'+item.key} alt={item.alt||item.name} loading="lazy" style={{width:'100%',height:'100%',objectFit:'contain'}}/>
       <span style={{
        position:'absolute',
        top:'6px',
        left:'6px',
        fontSize:'10px',
        fontWeight:600,
        padding:'2px 7px',
        borderRadius:'4px',
        background:badge.bg,
        color:badge.text,
        border:`1px solid ${badge.border}`,
        boxShadow:'0 1px 2px rgba(0,0,0,0.06)'
       }}>
        {badge.label}
       </span>
      </div>
      <div style={{display:'grid',gap:'4px'}}>
       <strong style={{fontSize:'13px',lineHeight:'1.35',overflowWrap:'anywhere'}} title={item.name}>{item.name}</strong>
       {item.usages && item.usages.length > 0 ? (
        <span style={{fontSize:'11px',color:'var(--brand-ink,#203017)',background:'var(--surface-soft,#eef3ea)',padding:'2px 6px',borderRadius:'4px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'inline-block'}} title={item.usages.join(', ')}>
         📍 {item.usages[0]}
        </span>
       ) : (
        <span style={{fontSize:'11px',color:'var(--muted-foreground,#869280)'}}>
         Henüz bir yerde kullanılmıyor
        </span>
       )}
      </div>
      <Input aria-label={'Alternatif metin: '+item.name} placeholder="Alternatif metin (SEO)..." value={item.alt} onChange={e=>setItems(all=>all.map(x=>x.key===item.key?{...x,alt:e.target.value}:x))}/>
      <div className="workflow-row" style={{marginTop:'auto',paddingTop:'4px'}}>
       <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
        <Button size="sm" variant="outline" disabled={busy||deleting} onClick={()=>void save(item)}>Metni kaydet</Button>
        <Button size="icon" variant="ghost" disabled={busy||deleting} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" aria-label={'Görseli sil: '+item.name} title="Görseli sil" onClick={()=>setDeleteTarget(item)}><Trash2 size={16}/></Button>
       </div>
       {onSelect&&<Button size="sm" onClick={()=>onSelect(item.url||'/api/media/'+item.key,item.alt)}>Seç</Button>}
      </div>
     </article>
    );
   })}
  </div>
  {!filtered.length&&<p className="empty">{query?'Aramaya uygun görsel bulunamadı.':'Bu kategoride henüz kayıtlı görsel yok.'}</p>}
 </section>
}


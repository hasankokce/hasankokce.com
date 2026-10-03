'use client';
import {useState,type ReactNode} from 'react';
import {additionalPrompts,type PromptItem} from '../prompts';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Switch} from '@/components/ui/switch';
import {Plus,Copy,ArrowUp,ArrowDown,Trash2,LoaderCircle} from 'lucide-react';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';

export default function PromptEditor({items,onChange,onDelete,renderMedia}:{items:PromptItem[];onChange:(items:PromptItem[])=>void;onDelete?:(id:string)=>Promise<boolean>|boolean|void;renderMedia:(value:string,onChange:(v:string)=>void)=>ReactNode}){
 const [selected,setSelected]=useState(items[0]?.id||''),[search,setSearch]=useState('');
 const [deleteTarget,setDeleteTarget]=useState<PromptItem|null>(null);
 const [deleting,setDeleting]=useState(false);
 const [dismissMissing,setDismissMissing]=useState(false);

 const item=items.find(p=>p.id===selected);
 const missing=additionalPrompts.filter(p=>!items.some(i=>i.id===p.id||i.slug===p.slug));

 function edit(key:keyof PromptItem,value:string|boolean){onChange(items.map(p=>p.id===selected?{...p,[key]:value}:p))}
 function add(source?:PromptItem){const id=crypto.randomUUID();const newItem:PromptItem=source?{...source,id,slug:source.slug.slice(0,95)+'-'+id.slice(0,8),title:source.title+' (kopya)',visible:false}:{id,slug:'prompt-'+id.slice(0,8),title:'Yeni prompt',description:'',category:'',tool:'',prompt:'',notes:'',image:'',imageAlt:'',videoUrl:'',visible:false};onChange([...items,newItem]);setSelected(id);setSearch('')}
 function move(direction:number){const a=[...items],i=a.findIndex(p=>p.id===selected);if(i<0||i+direction<0||i+direction>=a.length)return;[a[i],a[i+direction]]=[a[i+direction],a[i]];onChange(a)}

 async function confirmDelete(){
  if(!deleteTarget||deleting)return;
  setDeleting(true);
  try{
   if(onDelete){
    await onDelete(deleteTarget.id);
   }
   const remaining=items.filter(p=>p.id!==deleteTarget.id);
   onChange(remaining);
   if(selected===deleteTarget.id){
    const nextIdx=items.findIndex(p=>p.id===deleteTarget.id);
    const fallback=remaining[nextIdx]||remaining[nextIdx-1]||remaining[0];
    setSelected(fallback?.id||'');
   }
   setDeleteTarget(null);
  }finally{
   setDeleting(false);
  }
 }

 const textField=(key:keyof PromptItem,label:string,multi=false,hint='')=><label className="admin-field" key={key}>{label}{multi?<Textarea rows={key==='prompt'?12:5} value={String(item?.[key]||'')} onChange={e=>edit(key,e.target.value)}/>:<Input value={String(item?.[key]||'')} onChange={e=>edit(key,e.target.value)}/ >}{hint&&<small>{hint}</small>}</label>;

 return <>
  <AlertDialog open={!!deleteTarget} onOpenChange={v=>{if(!v&&!deleting)setDeleteTarget(null)}}>
   <AlertDialogContent>
    <AlertDialogHeader>
     <AlertDialogTitle>Promptu kalıcı olarak sil?</AlertDialogTitle>
     <AlertDialogDescription>&ldquo;{deleteTarget?.title}&rdquo; promptu panelden ve siteden kalıcı olarak silinecektir. Varsa ana sayfadaki seçili promptlar listesinden de kaldırılır. Bu işlem geri alınamaz.</AlertDialogDescription>
    </AlertDialogHeader>
    {deleteTarget&&<div style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px',background:'var(--surface-soft,#f7f9f6)',borderRadius:'8px',margin:'8px 0'}}>
     {deleteTarget.image&&<img src={deleteTarget.image} alt={deleteTarget.title} style={{width:'50px',height:'60px',objectFit:'cover',borderRadius:'6px',border:'1px solid var(--border)'}}/>}
     <div style={{overflow:'hidden',minWidth:0}}>
      <strong style={{display:'block',fontSize:'14px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{deleteTarget.title}</strong>
      <small style={{color:'var(--muted-foreground)',fontSize:'12px'}}>/promptlar/{deleteTarget.slug} · {deleteTarget.category||'Kategori yok'}</small>
     </div>
    </div>}
    <AlertDialogFooter>
     <AlertDialogCancel disabled={deleting} onClick={()=>setDeleteTarget(null)}>Vazgeç</AlertDialogCancel>
     <AlertDialogAction disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={()=>void confirmDelete()}>
      {deleting?<LoaderCircle className="spin" size={16}/>:null} {deleting?'Siliniyor…':'Kalıcı olarak sil'}
     </AlertDialogAction>
    </AlertDialogFooter>
   </AlertDialogContent>
  </AlertDialog>

  {!dismissMissing&&missing.length>0&&<section className="admin-card prompt-admin-intro">
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'16px',marginBottom:'12px'}}>
    <div>
     <h2 style={{margin:0}}>Yeni örnek promptlar</h2>
     <p className="admin-help" style={{margin:'6px 0 0'}}>Yedi yeni konu için hazırlanan görseller, promptlar ve kullanım notları. İstersen örnek promptları kütüphanene ekleyebilirsin.</p>
    </div>
    <Button variant="ghost" size="sm" onClick={()=>setDismissMissing(true)} aria-label="Bu bildirimi gizle">Kapat ✕</Button>
   </div>
   <Button disabled={items.length+missing.length>100} onClick={()=>{onChange([...items,...missing]);setSelected(missing[0].id);setSearch('')}}>Hazırlanan {missing.length} promptu ekle</Button>
  </section>}

  <div className="prompt-editor">
   <aside className="prompt-editor-list">
    <Button disabled={items.length>=100} onClick={()=>add()}><Plus/> Prompt ekle</Button>
    <Input aria-label="Panelde prompt ara" placeholder="Prompt ara…" value={search} onChange={e=>setSearch(e.target.value)}/>
    <p className="admin-help">{items.length} prompt · {items.filter(p=>p.visible).length} görünür</p>
    {items.filter(p=>p.title.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr'))).map(p=><div className={'prompt-editor-row '+(p.id===selected?'selected':'')} key={p.id}>
     <button type="button" className="prompt-editor-row-btn" onClick={()=>setSelected(p.id)} aria-pressed={p.id===selected}>
      {p.image&&<img src={p.image} alt=""/>}
      <span><strong>{p.title}</strong><small>{p.visible?'Yayında':'Taslak / gizli'}</small></span>
     </button>
     <Button variant="ghost" size="icon" className="prompt-row-delete-btn text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Promptu sil" aria-label={'Promptu sil: '+p.title} onClick={(e)=>{e.stopPropagation();setDeleteTarget(p)}}>
      <Trash2 size={15}/>
     </Button>
    </div>)}
    {!items.length&&<p className="empty">Kayıtlı prompt bulunmuyor.</p>}
   </aside>

   {item?<section className="admin-card prompt-editor-form">
    <div className="prompt-editor-actions">
     <Button variant="outline" disabled={items.length>=100} onClick={()=>add(item)}><Copy/> Çoğalt</Button>
     <Button variant="outline" aria-label="Promptu yukarı taşı" disabled={items[0]?.id===item.id} onClick={()=>move(-1)}><ArrowUp/></Button>
     <Button variant="outline" aria-label="Promptu aşağı taşı" disabled={items.at(-1)?.id===item.id} onClick={()=>move(1)}><ArrowDown/></Button>
     <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={()=>setDeleteTarget(item)}><Trash2 size={16}/> Promptu sil</Button>
    </div>
    <h2>{item.title}</h2>
    <p className="admin-help">Kaydettiğinde değişiklikler siteye yansır. Yayından kaldırmak için görünürlüğü kapat; metnin panelde kalır.</p>
    <label className="switch-field"><span>Sitede göster</span><Switch checked={item.visible} onCheckedChange={v=>edit('visible',v)}/></label>
    {textField('title','Prompt başlığı')}
    {textField('slug','Sayfa adresi',false,'/promptlar/ ile başlar. Videoda paylaştıktan sonra bu adresi değiştirmemeni öneririm.')}
    {textField('description','Kısa açıklama',true)}
    <div className="contact-fields">
     {textField('category','Kategori',false,'Örnek: Portre, Ürün, 3D')}
     {textField('tool','Araç / model',false,'Yalnızca denediğin model adını veya genel araç türünü yaz.')}
    </div>
    {renderMedia(item.image,v=>edit('image',v))}
    {textField('imageAlt','Görsel açıklaması',false,'Görseli göremeyen ziyaretçiler için kısa bir açıklama.')}
    {textField('prompt','Kopyalanacak prompt',true,'Satır sonları ve uzun metinler aynen kopyalanır. En fazla 30.000 karakter.')}
    <p className="admin-help">{item.prompt.length.toLocaleString('tr-TR')} karakter</p>
    {textField('notes','Dikkat edilmesi gerekenler',true,'Her satır ayrı bir madde olarak gösterilir. Referans fotoğraf, oran, değiştirilecek alanlar ve araç sınırlamalarını belirtebilirsin.')}
    {textField('videoUrl','İlgili video bağlantısı',false,'İsteğe bağlı HTTPS bağlantısı. Boşsa video butonu görünmez.')}
    <p className="admin-help">Görünür kayıtların prompt metni, görseli ve görsel açıklaması dolu olmalı.</p>
    {item.visible&&<a href={'/promptlar/'+item.slug} target="_blank" rel="noopener noreferrer" className="text-link">Kaydedilmiş sayfayı aç ↗</a>}
    <div className="prompt-danger-zone">
     <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={()=>setDeleteTarget(item)}>
      <Trash2 size={16}/> Bu promptu kalıcı olarak sil
     </Button>
    </div>
   </section>:<section className="admin-card"><h2>İlk promptunu ekle.</h2><p>Görseli yükle, metni yapıştır, kullanım notlarını yaz. Hazır olduğunda görünür yapıp kaydet.</p></section>}
  </div>
 </>
}

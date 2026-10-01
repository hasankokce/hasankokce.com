 'use client';
import {useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
export default function CoverUpload({onUploaded,onBusy}:{onUploaded:(url:string)=>void;onBusy:(busy:boolean)=>void}){
 const input=useRef<HTMLInputElement>(null),locked=useRef(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(false);
 async function upload(file?:File){
  if(!file||locked.current)return;
  setError(false);setMessage('');
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024){setError(true);setMessage('En fazla 5 MB boyutunda PNG, JPEG veya WebP seç.');return;}
  locked.current=true;setBusy(true);onBusy(true);
  try{
   const form=new FormData();form.append('file',file);
   const r=await fetch('/api/admin/media',{method:'POST',body:form});
   const d=await r.json().catch(()=>null);
   if(!r.ok||!d?.url)throw Error(d?.error||(r.status===413?'Görsel sunucunun yükleme sınırını aşıyor.':'Görsel yüklenemedi. Tekrar dene.'));
   onUploaded(d.url);setMessage(file.name+' kapak olarak seçildi. Taslak otomatik kaydedilir; canlıya almak için yazıyı yayınla.');
  }catch(e){setError(true);setMessage(e instanceof Error?e.message:'Görsel yüklenemedi.');}
  finally{locked.current=false;setBusy(false);onBusy(false);}
 }
 return <div className="admin-field"><strong>Kapak görseli yükle</strong><input ref={input} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Bilgisayardan kapak görseli seç" hidden disabled={busy} onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';void upload(file)}}/><Button type="button" variant="outline" disabled={busy} onClick={()=>input.current?.click()}>{busy?'Görsel yükleniyor…':'Gözat / Görsel yükle'}</Button><small>Bilgisayarından seç · PNG, JPEG, WebP · En fazla 5 MB</small>{message&&<p role={error?'alert':'status'}>{message}</p>}</div>
}

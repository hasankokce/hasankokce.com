import {z} from 'zod';
import {guard,isAdmin} from '../../../auth';
import {getConfig,saveConfig,keyHint,translateTexts,translationStatus,translationItems,unitsFor,enqueue,jobState,TranslationError} from '../../../../runtime/translator';
export const dynamic='force-dynamic';
const kind=z.enum(['post','prompt','site','term']);
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('save'),apiKey:z.string().trim().max(400).optional(),clearKey:z.boolean().optional(),model:z.string().trim().regex(/^[a-zA-Z0-9._:-]{2,80}$/,'Geçerli bir model adı yaz.'),auto:z.boolean()}),
 z.object({action:z.literal('test')}),
 z.object({action:z.literal('sync'),kind:kind.optional()}),
 z.object({action:z.literal('translate'),kind,ids:z.array(z.string().min(1).max(300)).min(1).max(500)})
]);
async function overview(){const [cfg,{status}]=await Promise.all([getConfig(),translationStatus()]);return {hasKey:!!cfg.apiKey,keyHint:keyHint(cfg.apiKey),keyUnreadable:cfg.keyUnreadable,model:cfg.model,auto:cfg.auto,status,job:jobState()}}
export async function GET(request:Request){if(!await isAdmin())return Response.json({error:'Yetkisiz erişim'},{status:403});try{
 const k=kind.safeParse(new URL(request.url).searchParams.get('items'));
 // ?items=post lists every post with its translation state; without it only the summary is returned.
 if(k.success)return Response.json({items:await translationItems(k.data),job:jobState()},{headers:{'Cache-Control':'no-store'}});
 return Response.json(await overview(),{headers:{'Cache-Control':'no-store'}})}catch(e){console.error('translation read',e);return Response.json({error:'Çeviri bilgileri yüklenemedi.'},{status:503})}}
export async function POST(request:Request){const denied=await guard(request);if(denied)return denied;try{
 const raw=await request.text();if(raw.length>200000)return Response.json({error:'İstek çok büyük.'},{status:413});
 const parsed=input.safeParse(JSON.parse(raw));if(!parsed.success)return Response.json({error:parsed.error.issues.map(i=>i.message).join(' ')},{status:400});const i=parsed.data;
 if(i.action==='save'){if(i.apiKey&&!/^sk-[A-Za-z0-9_-]{20,}$/.test(i.apiKey))return Response.json({error:'API anahtarı “sk-” ile başlamalı. OpenAI panelinden kopyaladığın anahtarı yapıştır.'},{status:400});await saveConfig(i);return Response.json({...await overview(),message:i.clearKey?'API anahtarı silindi.':'Çeviri ayarları kaydedildi.'})}
 if(i.action==='test'){const cfg=await getConfig();const started=Date.now();const out=await translateTexts(cfg,{sample:'Merhaba! Teknolojiye bir de buradan bak.'});return Response.json({...await overview(),message:'Bağlantı çalışıyor ('+cfg.model+', '+((Date.now()-started)/1000).toFixed(1)+' sn): “'+out.sample+'”'})}
 if(i.action==='translate'){const units=await unitsFor(i.kind,i.ids);if(!units.length)return Response.json({error:'Seçilen içerik bulunamadı. Sayfayı yenileyip yeniden dene.'},{status:404});await enqueue(units);return Response.json({...await overview(),message:units.length===1?'Çeviri sırasına alındı.':units.length+' içerik çeviri sırasına alındı.'})}
 const pending=(await translationStatus()).pending.filter(u=>!i.kind||u.kind===i.kind);if(!pending.length)return Response.json({...await overview(),message:'Bu bölümde çevrilmeyi bekleyen içerik yok.'});await enqueue(pending);return Response.json({...await overview(),message:pending.length+' içerik çeviri sırasına alındı.'});
}catch(e){if(e instanceof TranslationError)return Response.json({error:e.message},{status:e.status});console.error('translation',e);return Response.json({error:'İşlem tamamlanamadı. Yeniden dene.'},{status:503})}}

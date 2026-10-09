import {after} from 'next/server';
import {autoTranslate} from '../../../../runtime/translator';
import {guard,isAdmin} from '../../../auth';
import {database,getSettings} from '../../../store';
import {settingsSchema} from '../../../validation';
export async function POST(request:Request){const denied=await guard(request);if(denied)return denied;try{const parsed=settingsSchema.safeParse(await request.json());if(!parsed.success)return Response.json({error:parsed.error.issues.map(e=>(e.path.length?e.path.join(' → ')+': ':'')+e.message).join(' ')},{status:400});await database().prepare("INSERT INTO settings (id,data) VALUES ('site',?) ON CONFLICT(id) DO UPDATE SET data=excluded.data").bind(JSON.stringify(parsed.data)).run();after(autoTranslate);return Response.json({ok:true})}catch(e){console.error('settings save',e);return Response.json({error:'Ayarlar kaydedilemedi. Tekrar deneyin.'},{status:503})}}

export async function GET(){if(!await isAdmin())return Response.json({error:"Yetkisiz erişim"},{status:403});try{return Response.json(await getSettings(true),{headers:{"Cache-Control":"no-store"}})}catch{return Response.json({error:"Ayarlar yüklenemedi."},{status:503})}}

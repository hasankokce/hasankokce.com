import {env} from '../../../../runtime/platform';
import {guard,isAdmin} from '../../../auth';
import {database,getSettings,getPosts} from '../../../store';
import {unlink} from 'node:fs/promises';
import {existsSync,readdirSync} from 'node:fs';
import path from 'node:path';

export async function POST(request:Request){const denied=await guard(request);if(denied)return denied;try{if(Number(request.headers.get('content-length')||0)>6*1024*1024)return Response.json({error:'En fazla 5 MB yükleyebilirsiniz.'},{status:413});const form=await request.formData();const file=form.get('file');if(!(file instanceof File)||file.size>5*1024*1024)return Response.json({error:'En fazla 5 MB PNG, JPEG veya WebP seçin.'},{status:400});const bytes=new Uint8Array(await file.arrayBuffer());const mime=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71?'image/png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP'?'image/webp':null;if(!mime||mime!==file.type)return Response.json({error:'Desteklenmeyen görsel dosyası.'},{status:400});const key=crypto.randomUUID()+'.'+({'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[mime]);await env.MEDIA.put(key,bytes,{httpMetadata:{contentType:mime}});await database().prepare('INSERT INTO media_library(key,name,alt,created_at) VALUES (?,?,?,?)').bind(key,file.name.slice(0,200),'',new Date().toISOString()).run();return Response.json({url:'/api/media/'+key,key})}catch(e){console.error('media upload',e);return Response.json({error:'Görsel yüklenemedi. Tekrar deneyin.'},{status:503})}}

function detectCategoryFromFilename(key:string,name:string):'posts'|'prompts'|'profile'|'tools'|'other'{
  const s=(key+' '+name).toLowerCase();
  if(s.includes('prompt-')||s.includes('prompt'))return 'prompts';
  if(s.includes('portrait')||s.includes('hasan')||s.includes('hero')||s.includes('avatar')||s.includes('profil'))return 'profile';
  if(s.includes('windows')||s.includes('rehber')||s.includes('yazi')||s.includes('article')||s.includes('post')||s.includes('yapay-zeka-kaynak'))return 'posts';
  if(s.includes('shortcut')||s.includes('kestirme')||s.includes('tool')||s.includes('gear')||s.includes('camera')||s.includes('mic'))return 'tools';
  return 'other';
}

export async function GET(){
  if(!await isAdmin())return Response.json({error:'Yetkisiz erişim'},{status:403});
  const [metadata,stored,settings,posts]=await Promise.all([
    database().prepare('SELECT key,name,alt,created_at FROM media_library ORDER BY created_at DESC LIMIT 500').all<{key:string;name:string;alt:string;created_at?:string}>(),
    env.MEDIA.list({limit:500}),
    getSettings(true),
    getPosts(true)
  ]);
  const deletedKeys=new Set(metadata.results.filter(i=>i.alt==='__deleted__').map(i=>i.key));
  const validMetadata=metadata.results.filter(i=>i.alt!=='__deleted__');

  const usageMap=new Map<string,{category:'posts'|'prompts'|'profile'|'tools'|'other';usages:string[]}>();
  function registerUsage(rawPath:string|undefined,category:'posts'|'prompts'|'profile'|'tools',label:string){
    if(!rawPath)return;
    const clean=rawPath.trim();
    if(!clean)return;
    const targets=[clean];
    if(clean.startsWith('/api/media/'))targets.push(clean.replace('/api/media/',''));
    if(clean.startsWith('/images/'))targets.push(clean);
    for(const target of targets){
      const curr=usageMap.get(target)||{category,usages:[]};
      if(!curr.usages.includes(label))curr.usages.push(label);
      curr.category=category;
      usageMap.set(target,curr);
    }
  }

  if(settings.portrait)registerUsage(settings.portrait,'profile','Profil fotoğrafı');
  if(settings.heroImage)registerUsage(settings.heroImage,'profile','Ana sayfa görseli');

  for(const pr of (settings.prompts||[])){
    if(pr.image)registerUsage(pr.image,'prompts',`Prompt: ${pr.title||'Başlıksız'}`);
  }

  for(const p of posts){
    if(p.image)registerUsage(p.image,'posts',`Yazı: ${p.title||'Başlıksız'}`);
    if(p.body){
      const matches=p.body.matchAll(/!\[.*?\]\((.*?)\)/g);
      for(const m of matches){
        if(m[1])registerUsage(m[1].split(' ')[0],'posts',`Yazı içi: ${p.title||'Başlıksız'}`);
      }
    }
  }

  for(const t of (settings.tools||[])){
    if(t.image)registerUsage(t.image,'tools',`Araç: ${t.title||'Araç'}`);
  }
  for(const g of (settings.gear||[])){
    if(g.image)registerUsage(g.image,'tools',`Ekipman: ${g.title||'Ekipman'}`);
  }
  for(const pr of (settings.projects||[])){
    if(pr.image)registerUsage(pr.image,'tools',`Proje: ${pr.title||'Proje'}`);
  }

  const items=new Map<string,{key:string;name:string;alt:string;url:string;category:'posts'|'prompts'|'profile'|'tools'|'other';usages:string[];created_at?:string}>();

  for(const m of validMetadata){
    const url=m.key.startsWith('/images/')?m.key:'/api/media/'+m.key;
    const usage=usageMap.get(m.key)||usageMap.get(url);
    const category=usage?.category||detectCategoryFromFilename(m.key,m.name);
    items.set(m.key,{
      ...m,
      url,
      category,
      usages:usage?.usages||[]
    });
  }

  for(const o of stored.objects){
    if(!deletedKeys.has(o.key)&&!items.has(o.key)){
      const url='/api/media/'+o.key;
      const usage=usageMap.get(o.key)||usageMap.get(url);
      const category=usage?.category||detectCategoryFromFilename(o.key,o.key);
      items.set(o.key,{
        key:o.key,
        name:o.key,
        alt:'',
        url,
        category,
        usages:usage?.usages||[]
      });
    }
  }

  const paths=[settings.heroImage,settings.portrait,...posts.map(p=>p.image),...settings.tools.map(p=>p.image),...settings.gear.map(p=>p.image),...settings.projects.map(p=>p.image),...(settings.prompts||[]).map(p=>p.image)].filter((x):x is string=>typeof x==='string'&&x.startsWith('/images/'));
  for(const pathKey of paths){
    if(!deletedKeys.has(pathKey)&&!items.has(pathKey)){
      const usage=usageMap.get(pathKey);
      const category=usage?.category||detectCategoryFromFilename(pathKey,pathKey);
      items.set(pathKey,{
        key:pathKey,
        name:pathKey.split('/').pop()||pathKey,
        alt:'',
        url:pathKey,
        category,
        usages:usage?.usages||[]
      });
    }
  }

  try{
    const publicImagesDir=path.resolve('public/images');
    if(existsSync(publicImagesDir)){
      const files=readdirSync(publicImagesDir);
      for(const file of files){
        if(/^[a-zA-Z0-9_.-]+$/.test(file)&&/\.(webp|png|jpe?g|svg)$/i.test(file)){
          const key='/images/'+file;
          if(!deletedKeys.has(key)&&!items.has(key)){
            const usage=usageMap.get(key);
            const category=usage?.category||detectCategoryFromFilename(key,file);
            items.set(key,{
              key,
              name:file,
              alt:'',
              url:key,
              category,
              usages:usage?.usages||[]
            });
          }
        }
      }
    }
  }catch(err){
    console.error('Failed reading public/images directory',err);
  }

  return Response.json([...items.values()],{headers:{'Cache-Control':'no-store'}});
}

export async function PATCH(req:Request){const denied=await guard(req);if(denied)return denied;const d=await req.json() as {key:string;alt:string};if(typeof d.key!=='string'||typeof d.alt!=='string'||d.alt.length>500)return Response.json({error:'Geçersiz alternatif metin.'},{status:400});if(!/^\/images\/[a-zA-Z0-9_.-]+$/.test(d.key)&&!await env.MEDIA.head(d.key))return Response.json({error:'Görsel bulunamadı.'},{status:404});await database().prepare('INSERT INTO media_library(key,name,alt,created_at) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET alt=excluded.alt').bind(d.key,d.key.split('/').pop(),d.alt,new Date().toISOString()).run();return Response.json({ok:true})}

export async function DELETE(req:Request){const denied=await guard(req);if(denied)return denied;try{const d=await req.json() as {key?:string;confirm?:string};if(!d||typeof d.key!=='string'||!d.key)return Response.json({error:'Geçersiz görsel anahtarı.'},{status:400});if(d.confirm!=='DELETE')return Response.json({error:'Silme işlemi onaylanmadı.'},{status:400});if(d.key.startsWith('/images/')){const safeRel=d.key.replace(/^\/+/,'');if(/^[a-zA-Z0-9_/.-]+$/.test(safeRel)&&!safeRel.includes('..')){const fullPath=path.resolve('public',safeRel);try{if(existsSync(fullPath))await unlink(fullPath)}catch(err){console.error('Failed to unlink public file',fullPath,err)}}await database().prepare('INSERT INTO media_library(key,name,alt,created_at) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET alt=excluded.alt').bind(d.key,d.key.split('/').pop()||d.key,'__deleted__',new Date().toISOString()).run();return Response.json({ok:true})}await env.MEDIA.delete(d.key);await database().prepare('DELETE FROM media_library WHERE key = ?').bind(d.key).run();return Response.json({ok:true})}catch(e){console.error('media delete',e);return Response.json({error:'Görsel silinemedi. Tekrar deneyin.'},{status:500})}}




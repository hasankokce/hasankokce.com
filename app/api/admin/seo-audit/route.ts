import {isAdmin} from '../../../auth';
import {getSettings,getPosts,siteOrigin} from '../../../store';
export async function GET(){
 if(!await isAdmin())return Response.json({error:'Yönetici girişi gerekli.'},{status:403});
 try{
 const [s,posts]=await Promise.all([getSettings(),getPosts()]);const real=posts.filter(p=>!p.demo);
 let accessibility:'public'|'restricted'|'unknown'='unknown';
 try{const response=await fetch(siteOrigin()+'/',{redirect:'manual',signal:AbortSignal.timeout(8000),headers:{'User-Agent':'SiteSEOCheck/1.0'}});accessibility=response.status===200?'public':([301,302,303,307,308,401,403].includes(response.status)?'restricted':'unknown');await response.body?.cancel()}catch{}
 return Response.json({origin:siteOrigin(),accessibility,googleVerified:!!s.googleVerification,bingVerified:!!s.bingVerification,published:real.length,prompts:s.prompts.length,issues:real.flatMap(p=>{const problems=[];if(!p.image)problems.push('Kapak görseli eksik');if(p.image&&!p.imageAlt)problems.push('Görsel açıklaması eksik');if(!p.sources?.trim())problems.push('Kaynaklar eksik');if(!(p.seoDescription||p.excerpt).trim())problems.push('Arama açıklaması eksik');return problems.length?[{title:p.title,url:'/yazi/'+p.slug,problems}]:[]})},{headers:{'Cache-Control':'no-store'}})
 }catch{return Response.json({error:'SEO kontrolü tamamlanamadı. Tekrar deneyin.'},{status:503})}
}

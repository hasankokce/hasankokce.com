import 'server-only';
import nodemailer from 'nodemailer';
import {getSettings} from '../app/store';
import {renderEmail,type EmailBrand} from '../app/email-template';
import {randomBytes,createHash} from 'node:crypto';
import {env} from './platform';
export const db=env.DB;
export const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const token=()=>randomBytes(32).toString('hex');
export const ready=()=>!!(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASSWORD);
export const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export async function emailBrand():Promise<EmailBrand>{const s=await getSettings();return {name:s.name,monogram:s.management.monogram,logo:s.management.logo,accent:s.accent,origin:env.SITE_ORIGIN,email:s.email,socials:[{name:'YouTube',url:s.youtube},{name:'Instagram',url:s.instagram},{name:'TikTok',url:s.tiktok},{name:'X',url:s.x}].filter(s=>s.url)}}
export async function mail(to:string,subject:string,body:string,url?:string,confirmation?:string){if(!ready())throw Error('SMTP bağlantısı tanımlanmamış.');const brand=await emailBrand();const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||465),secure:process.env.SMTP_SECURE!=='false',requireTLS:process.env.SMTP_SECURE==='false',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD},connectionTimeout:10000,socketTimeout:20000,disableFileAccess:true,disableUrlAccess:true});try{await transport.sendMail({from:{name:brand.name,address:process.env.SMTP_USER!},to,subject,text:body+(confirmation?'\n\nAboneliğimi doğrula: '+confirmation:'')+(url?'\n\nAbonelikten ayrıl: '+url:''),html:renderEmail(subject,body,brand,url,confirmation),...(url?{headers:{'List-Unsubscribe':`<${url.replace('/bulten?', '/api/newsletter/action?')}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}}:{})})}finally{transport.close()}}
export function originOK(r:Request){return r.headers.get('origin')===env.SITE_ORIGIN}
export const base=()=>env.SITE_ORIGIN;

export const newsletterDefaults={enabled:true,title:'Haftanın iyi fikirleri, gelen kutunda.',description:'Öne çıkan gelişmeler, işine yarayan araçlar ve yeni yazılarım. Haftada bir, kısa ve anlaşılır.',button:'Bültene katıl →'};
export async function newsletterSettings(){const row=await db.prepare("SELECT data FROM settings WHERE id='newsletter'").first<{data:string}>();return {...newsletterDefaults,...(row?JSON.parse(row.data):{})}}

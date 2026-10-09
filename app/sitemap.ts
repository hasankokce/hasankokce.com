export const dynamic='force-dynamic';
import {getPosts,getSettings,siteOrigin} from './store';
import {readTranslations} from './translations';
import {localePath} from './i18n';
// Each page is listed with its English twin; posts and prompts get an English entry once they are translated.
export default async function sitemap(){
 const origin=siteOrigin();const [settings,posts,translated]=await Promise.all([getSettings(),getPosts(),readTranslations(['post','prompt'])]);
 const entry=(path:string,english:boolean,lastModified?:string)=>{const tr=origin+path,en=origin+localePath('en',path);const alternates={languages:{tr,...(english?{en}:{})}};return [{url:tr,lastModified,alternates},...(english?[{url:en,lastModified,alternates}]:[])]};
 return [...['/','/yazilar','/hakkimda','/promptlar','/arac-kutusu','/kullandiklarim','/iletisim','/gizlilik','/kullanim-sartlari','/sss'].flatMap(path=>entry(path,true)),...settings.prompts.flatMap(p=>entry('/promptlar/'+p.slug,translated.has('prompt|'+p.id))),...posts.filter(p=>!p.demo).flatMap(p=>entry('/yazi/'+p.slug,translated.has('post|'+p.id),p.updatedDate||p.date))];
}

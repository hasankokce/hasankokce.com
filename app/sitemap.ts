export const dynamic='force-dynamic';
import {getPosts,getSettings,siteOrigin} from './store';
export default async function sitemap(){const origin=siteOrigin();return [{url:origin},{url:origin+'/yazilar'},{url:origin+'/hakkimda'},...['/promptlar','/arac-kutusu','/kullandiklarim','/iletisim','/gizlilik','/kullanim-sartlari','/sss'].map(path=>({url:origin+path})),...(await getSettings()).prompts.map(p=>({url:origin+'/promptlar/'+p.slug})),...(await getPosts()).filter(p=>!p.demo).map(p=>({url:origin+'/yazi/'+p.slug,lastModified:p.updatedDate||p.date}))]}

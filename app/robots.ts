export const dynamic='force-dynamic';
import {siteOrigin} from './store';
export default function robots(){
 const rules={allow:'/',disallow:['/admin','/api/admin/','/api/contact','/signin-with-chatgpt','/signout-with-chatgpt']};
 // Search visibility is separate from training-crawler policy.
 return {rules:[{userAgent:'*',...rules},{userAgent:'Googlebot',...rules},{userAgent:'Bingbot',...rules},{userAgent:'OAI-SearchBot',...rules}],sitemap:siteOrigin()+'/sitemap.xml'};
}

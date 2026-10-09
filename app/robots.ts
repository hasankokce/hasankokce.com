import {siteOrigin} from './store';
export default function robots(){
 const rules={allow:'/',disallow:['/admin','/api/admin/','/api/contact','/api/auth/','/api/newsletter','/signin-with-chatgpt','/signout-with-chatgpt','/cdn-cgi/']};
 // Search visibility is separate from training-crawler policy.
 return {rules:[{userAgent:'*',...rules},{userAgent:'Googlebot',...rules},{userAgent:'Bingbot',...rules},{userAgent:'OAI-SearchBot',...rules}],sitemap:siteOrigin()+'/sitemap.xml'};
}

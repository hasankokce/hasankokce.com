import type {Metadata} from 'next';
import type {Settings} from './content';
import {siteOrigin} from './store';
import {localePath,ogLocale,schemaLanguage} from './i18n';

export function plainText(text?:string){return (text||'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/[#*`]/g,'').replace(/\s+/g,' ').trim()}
// Both language versions of a page point at each other so search engines show the right one.
export function languageAlternates(path:string,english=true){const origin=siteOrigin();return {'tr':origin+path,...(english?{'en':origin+localePath('en',path)}:{}),'x-default':origin+path}}
export function navLabel(s:Settings,path:string,fallback:string){return s.navigation.find(n=>n.path===path)?.label||fallback}
export function pageMetadata(s:Settings,title:string,description:string,path:string):Metadata{
 const custom=s.management.pageSeo[path as keyof typeof s.management.pageSeo];title=custom?.title||title;const url=new URL(localePath(s.locale,path),siteOrigin()).href,desc=plainText(custom?.description||description).slice(0,300);
 const shareImage=new URL(s.heroImage||'/images/hero.webp',siteOrigin()).href;return {robots:{index:true,follow:true,'max-image-preview':'large','max-snippet':-1,'max-video-preview':-1},title,description:desc,alternates:{canonical:url,languages:languageAlternates(path)},openGraph:{type:'website',locale:ogLocale[s.locale||'tr'],siteName:s.name,title,description:desc,url,images:[{url:shareImage,width:1200,height:630,alt:s.heroImage?s.management.heroImageAlt:title}]},twitter:{card:'summary_large_image',title,description:desc,images:[shareImage]}};
}
export function JsonLd({data}:{data:unknown}){return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data).replace(/</g,'\\u003c')}}/>}
export function person(s:Settings){return {'@type':'Person','@id':siteOrigin()+'/#author',name:s.name,jobTitle:s.locale==='en'?'Technology Content Creator':'Teknoloji İçerik Üreticisi',url:siteOrigin()+localePath(s.locale,'/hakkimda'),sameAs:[s.youtube,s.instagram,s.tiktok,s.x].filter(Boolean),...(s.portrait?{image:new URL(s.portrait,siteOrigin()).href}:{})}}
export function SiteSchema({settings:s}:{settings:Settings}){return <JsonLd data={{'@context':'https://schema.org','@graph':[person(s),{'@type':'WebSite','@id':siteOrigin()+'/#website',url:siteOrigin()+localePath(s.locale,'/'),name:s.name,inLanguage:schemaLanguage[s.locale||'tr'],description:s.seoDescription||s.heroDescription,publisher:{'@id':siteOrigin()+'/#author'},potentialAction:{'@type':'SearchAction',target:{'@type':'EntryPoint',urlTemplate:siteOrigin()+localePath(s.locale,'/yazilar')+'?q={search_term_string}'},'query-input':'required name=search_term_string'}}]}}/>}

import type {Metadata} from 'next';
import type {Settings} from './content';
import {siteOrigin} from './store';

export function plainText(text:string){return text.replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/[#*`]/g,'').replace(/\s+/g,' ').trim()}
export function pageMetadata(s:Settings,title:string,description:string,path:string):Metadata{
 const custom=s.management.pageSeo[path as keyof typeof s.management.pageSeo];title=custom?.title||title;const url=new URL(path,siteOrigin()).href,desc=plainText(custom?.description||description).slice(0,300);
 return {robots:{index:true,follow:true,'max-image-preview':'large','max-snippet':-1,'max-video-preview':-1},title,description:desc,alternates:{canonical:url},openGraph:{type:'website',locale:'tr_TR',siteName:s.name,title,description:desc,url,images:s.heroImage?[{url:new URL(s.heroImage,siteOrigin()).href,alt:s.management.heroImageAlt}]:[]},twitter:{card:'summary_large_image',title,description:desc,images:s.heroImage?[new URL(s.heroImage,siteOrigin()).href]:[]}};
}
export function JsonLd({data}:{data:unknown}){return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data).replace(/</g,'\\u003c')}}/>}
export function person(s:Settings){return {'@type':'Person','@id':siteOrigin()+'/#author',name:s.name,url:siteOrigin()+'/hakkimda',sameAs:[s.youtube,s.instagram,s.tiktok,s.x].filter(Boolean),...(s.portrait?{image:new URL(s.portrait,siteOrigin()).href}:{})}}
export function SiteSchema({settings:s}:{settings:Settings}){return <JsonLd data={{'@context':'https://schema.org','@graph':[person(s),{'@type':'WebSite','@id':siteOrigin()+'/#website',url:siteOrigin()+'/',name:s.name,inLanguage:'tr-TR',description:s.seoDescription||s.heroDescription,publisher:{'@id':siteOrigin()+'/#author'}}]}}/>}

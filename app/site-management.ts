export const homeSections = [
 {id:'hero',label:'Karşılama ve ana görsel'}, {id:'topics',label:'Konu bağlantıları'},
 {id:'featured',label:'Öne çıkan yazı'}, {id:'latest',label:'Yazılar'},
 {id:'ad',label:'Reklam alanı'}, {id:'prompts',label:'Seçili promptlar'},
 {id:'about',label:'Kısa hakkımda'}, {id:'social',label:'Sosyal hesaplar'}
] as const;
export type HomeSectionId=typeof homeSections[number]['id'];
export const pagePaths=['/','/yazilar','/promptlar','/arac-kutusu','/kullandiklarim','/hakkimda','/iletisim','/gizlilik','/kullanim-sartlari','/sss'] as const;
export const pageNames=['Ana sayfa','Yazılar','Promptlar','Araç Kutusu','Kullandıklarım','Hakkımda','İletişim','Gizlilik','Kullanım şartları','Sık sorulan sorular'];
export const managementDefaults={
 premiumMotion:true,logo:'',logoAlt:'Hasan Kökçe',monogram:'hk.',favicon:'',heroImageAlt:'Yeşil camdan modüler formlar',heroArtIndex:'[ HK—01 ]',
 background:'#f7f8f5',foreground:'#20221f',surface:'#f0f2ed',muted:'#596158',font:'sans' as 'sans'|'serif'|'system',
 homeSections:homeSections.map(s=>({id:s.id,visible:true})),latestCount:3,
 heroReadUrl:'/yazilar',heroAboutUrl:'/hakkimda',toolsGuideUrl:'/yazi/iphone-kestirmeleri-nasil-eklenir',
 showToolsIntro:true,showCollaboration:true,showContactForm:true,showAboutSocial:true,showContactSocial:true,
 showToc:true,showUpdatedDate:true,showRelated:true,showFooterRss:true,showFooterAdmin:false,
 pageSeo:Object.fromEntries(pagePaths.map(path=>[path,{title:'',description:''}])) as Record<typeof pagePaths[number],{title:string;description:string}>
};
export type SiteManagement=typeof managementDefaults;

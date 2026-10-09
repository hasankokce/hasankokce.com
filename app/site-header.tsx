'use client';
import {useEffect,useState} from 'react';

import type {NavItem} from './site-copy';
import type {copyDefaults} from './site-copy';
import {usePathname} from 'next/navigation';
import {localePath,stripLocale,fixed,type Locale} from './i18n';
import {ArrowUpRight,Menu,X} from 'lucide-react';
import {Sheet,SheetTrigger,SheetContent,SheetTitle,SheetDescription,SheetClose} from '@/components/ui/sheet';
export function SiteHeader({children,navigation,copy,locale}:{children:React.ReactNode;navigation:NavItem[];copy:typeof copyDefaults;locale:Locale}){
 const links=navigation.filter(i=>i.visible).map(i=>[i.path,i.label]);const contact=navigation.find(i=>i.path==='/iletisim'&&i.visible);
 const fullPath=usePathname();const pathname=stripLocale(fullPath||'/');const t=fixed(locale);const other=locale==='en'?pathname:localePath('en',pathname);const lp=(url:string)=>localePath(locale,url);
 const switcher=<a className="lang-switch" href={other} hrefLang={t.switchLang} lang={t.switchLang} aria-label={t.switchLabel} title={t.switchLabel}>{t.switchShort}</a>;const [open,setOpen]=useState(false);
 useEffect(()=>{setOpen(false)},[fullPath]);
 useEffect(()=>{const mq=window.matchMedia('(min-width: 1180px)');const close=()=>{if(mq.matches)setOpen(false)};mq.addEventListener('change',close);return()=>mq.removeEventListener('change',close)},[]);
 const active=(url:string)=>pathname===url||(url==='/yazilar'&&pathname?.startsWith('/yazi/'))||(url==='/promptlar'&&pathname?.startsWith('/promptlar/'));
 return <div className="site-header-wrap"><a className="skip-link" href="#site-content">{copy.skipLink}</a><header className="header">{children}<nav aria-label={t.mainMenu}>{links.filter(([url])=>url!=='/'&&url!=='/iletisim').map(([url,label])=><a key={url} href={lp(url)} aria-current={active(url)?'page':undefined}>{label}</a>)}</nav>{contact&&<a href={lp('/iletisim')} className="nav-cta" aria-current={active('/iletisim')?'page':undefined}>{contact.label} <ArrowUpRight size={17}/></a>}{switcher}<div className="site-menu-toggle"><Sheet open={open} onOpenChange={setOpen}><SheetTrigger className="site-menu-button" aria-label={t.openMenu}><Menu size={22}/><span>{copy.menuButton}</span></SheetTrigger><SheetContent className="site-mobile-panel" showCloseButton={false}><div className="site-mobile-top"><div><SheetTitle>{copy.menuTitle}</SheetTitle><SheetDescription>{copy.menuDescription}</SheetDescription></div><SheetClose className="site-menu-button" aria-label={t.closeMenu}><X/></SheetClose></div><nav aria-label={t.mobileMenu}>{links.map(([url,label],i)=><a key={url} href={lp(url)} onClick={()=>setOpen(false)} aria-current={active(url)?'page':undefined}><span className="nav-number">{String(i+1).padStart(2,'0')}</span>{label}<ArrowUpRight size={18}/></a>)}</nav><a className="mobile-social-link" href={lp('/#takip')} onClick={()=>setOpen(false)}>{copy.menuSocial}</a><a className="mobile-social-link mobile-lang-link" href={other} hrefLang={t.switchLang} lang={t.switchLang}>{t.switchLabel} ↗</a></SheetContent></Sheet></div></header></div>
}

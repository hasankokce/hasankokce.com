'use client';
import {useEffect,useRef} from 'react';
import {useConsent} from './consent';
import type {Settings} from './content';
declare global{interface Window{adsbygoogle?:unknown[]}}
export function AdSlot({settings:s,placement='article'}:{settings:Settings;placement?:'home'|'archive'|'article'}){
 const consent=useConsent('ads');
 const ref=useRef<HTMLModElement>(null);
 const slot=placement==='home'?s.adsHomeSlot:placement==='archive'?s.adsArchiveSlot:s.adsSlot;
 const enabled=consent&&s.adsEnabled&&s.adsConsentReady&&/^ca-pub-\d{16}$/.test(s.adsClient)&&/^\d{10}$/.test(slot);
 useEffect(()=>{
  if(!enabled)return;
  const element=ref.current;if(!element)return;
  function render(){if(element?.isConnected&&!element.hasAttribute('data-adsbygoogle-status')){try{(window.adsbygoogle=window.adsbygoogle||[]).push({})}catch{}}}
  function load(){let script=document.querySelector<HTMLScriptElement>('script[data-ads-loader]');if(!script){script=document.createElement('script');script.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+s.adsClient;script.async=true;script.crossOrigin='anonymous';script.dataset.adsLoader='true';document.head.appendChild(script)}render()}
  if(!('IntersectionObserver' in window)){load();return;}
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();load()}},{rootMargin:'250px'});observer.observe(element);return ()=>observer.disconnect();
 },[enabled,s.adsClient,slot]);
 if(!enabled)return null;
 return <aside className={'ad-space ad-'+placement} aria-label="Reklam"><span>REKLAM</span><ins key={s.adsClient+slot} ref={ref} className="adsbygoogle" style={{display:'block',minHeight:250}} data-ad-client={s.adsClient} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true"/></aside>;
}

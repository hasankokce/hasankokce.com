export const dynamic='force-dynamic';
import type {Metadata} from 'next';
import {getSettings,siteOrigin} from './store';
import './globals.css';
export async function generateMetadata():Promise<Metadata>{const s=await getSettings();return {metadataBase:new URL(siteOrigin()),title:{default:s.seoTitle||s.name+' — '+s.heroTitle.replace(/\n/g,' '),template:'%s | '+s.name},description:s.seoDescription||s.heroDescription,verification:{google:s.googleVerification||undefined,other:s.bingVerification?{'msvalidate.01':s.bingVerification}:undefined},robots:{index:true,follow:true,'max-image-preview':'large','max-snippet':-1,'max-video-preview':-1},alternates:{types:{'application/rss+xml':'/feed.xml'}},icons:{icon:s.management.favicon||'/favicon.svg'},...(s.adsClient?{other:{'google-adsense-account':s.adsClient}}:{})}}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="tr"><body>{children}</body></html>}

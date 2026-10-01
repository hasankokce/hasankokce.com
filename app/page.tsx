import {pageMetadata,SiteSchema} from './seo';
import {HomeView} from './site';
import {getSettings,getPosts} from './store';
export const dynamic='force-dynamic';
export async function generateMetadata(){const s=await getSettings();return pageMetadata(s,s.seoTitle||s.name+' — Teknoloji, yapay zekâ ve dijital yaşam',s.seoDescription||s.heroDescription,'/')}
export default async function Home(){const [settings,posts]=await Promise.all([getSettings(),getPosts()]);return <><SiteSchema settings={settings}/><HomeView settings={settings} posts={posts}/></>}

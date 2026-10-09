import Portrait from '../portrait';
import {pageMetadata,JsonLd,person,navLabel} from '../seo';
import {localePath} from '../i18n';

import {Shell,Socials} from '../site';
import {getSettings,siteOrigin} from '../store';
import {Prose} from '../prose';
export const dynamic='force-dynamic';
export async function generateMetadata(){const s=await getSettings();return pageMetadata(s,navLabel(s,'/hakkimda','Hakkımda'),s.aboutBody,'/hakkimda')}
export default async function About(){const s=await getSettings();return <Shell settings={s}><JsonLd data={{"@context":"https://schema.org","@type":"ProfilePage",url:siteOrigin()+localePath(s.locale,'/hakkimda'),mainEntity:person(s)}}/><main className="main"><section className="about-page"><div><span className="section-label">{s.ui.aboutHello} {s.name.toLocaleUpperCase(s.locale==='en'?'en-US':'tr-TR')}</span><h1>{s.aboutTitle}</h1><Prose body={s.aboutBody} locale={s.locale}/><a className="pill dark" href={localePath(s.locale,'/iletisim')}>{s.ui.aboutContact}</a></div><div className="about-photo">{s.portrait?<Portrait src={s.portrait} name={s.name}/>:<span className="about-initial">{s.management.monogram}</span>}</div></section><section className="about-details">{s.aboutJourney&&<article><span className="section-label">{s.ui.journeyLabel}</span><h2>{s.ui.journeyTitle}</h2><Prose body={s.aboutJourney} locale={s.locale}/></article>}{s.aboutTopics&&<article><span className="section-label">{s.ui.topicsLabel}</span><h2>{s.ui.topicsTitle}</h2><ul>{s.aboutTopics.split("\n").filter(Boolean).map(t=><li key={t}>{t}</li>)}</ul></article>}{s.aboutApproach&&<article><span className="section-label">{s.ui.approachLabel}</span><h2>{s.ui.approachTitle}</h2><Prose body={s.aboutApproach} locale={s.locale}/></article>}</section>{s.management.showAboutSocial&&<Socials settings={s}/>}</main></Shell>}

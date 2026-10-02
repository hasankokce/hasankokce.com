import {Shell} from '../site';
import {getSettings} from '../store';
import {pageMetadata} from '../seo';
import {Prose} from '../prose';
export const dynamic='force-dynamic';
export async function generateMetadata(){const s=await getSettings();return pageMetadata(s,s.ui.faqTitle,s.ui.faqDescription,'/sss')}
export default async function Page(){const s=await getSettings();return <Shell settings={s}><main className="main"><article className="reading"><h1>{s.ui.faqTitle}</h1><p className="lede">{s.ui.faqDescription}</p><div className="faq-list">{s.ui.faqBody.split(/\n\s*\n/).filter(Boolean).map((item,i)=>{const [question,...answer]=item.split('\n');return <details key={i}><summary>{question}</summary><p>{answer.join(' ')}</p></details>})}</div><a className="pill dark" href="/iletisim">{s.ui.contactInvitation}</a></article></main></Shell>}

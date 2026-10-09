import {pageMetadata,navLabel} from '../seo';
import {localePath} from '../i18n';
import {Shell} from '../site';import {getSettings} from '../store';import {Collection} from '../collection';
export const dynamic='force-dynamic';export async function generateMetadata(){const s=await getSettings();return pageMetadata(s,navLabel(s,'/arac-kutusu','Araç Kutusu'),s.toolsDescription,'/arac-kutusu')}
export default async function Tools(){const s=await getSettings();return <Shell settings={s}><main className="main archive"><header className="page-intro"><span className="section-label">{s.ui.toolsLabel}</span><h1>{s.toolsTitle}</h1><p>{s.toolsDescription}</p></header>{s.management.showToolsIntro&&<aside className="shortcut-intro"><h2>{s.ui.toolsIntroTitle}</h2><p>{s.ui.toolsIntroBody}</p><a className="text-link" href={localePath(s.locale,s.management.toolsGuideUrl)}>{s.ui.toolsGuide}</a></aside>}<Collection items={s.tools} kind="tools" copy={s.ui}/></main></Shell>}

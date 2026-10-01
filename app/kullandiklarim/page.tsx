import {pageMetadata} from '../seo';
import {Shell} from '../site';import {getSettings} from '../store';import {Collection} from '../collection';
export const dynamic='force-dynamic';export async function generateMetadata(){const s=await getSettings();return pageMetadata(s,'Kullandıklarım',s.gearDescription,'/kullandiklarim')}
export default async function Gear(){const s=await getSettings();return <Shell settings={s}><main className="main archive"><header className="page-intro"><span className="section-label">{s.ui.gearLabel}</span><h1>{s.gearTitle}</h1><p>{s.gearDescription}</p></header><Collection items={s.gear} kind="gear" copy={s.ui}/></main></Shell>}

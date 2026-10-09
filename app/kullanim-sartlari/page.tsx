import {Shell} from '../site';
import {getSettings} from '../store';
import {pageMetadata} from '../seo';
import {Prose} from '../prose';
import {localePath} from '../i18n';
export const dynamic='force-dynamic';
export async function generateMetadata(){const s=await getSettings();return pageMetadata(s,s.ui.termsTitle,s.ui.termsDescription,'/kullanim-sartlari')}
export default async function Page(){const s=await getSettings();return <Shell settings={s}><main className="main"><article className="reading"><h1>{s.ui.termsTitle}</h1><p className="lede">{s.ui.termsDescription}</p><Prose body={s.ui.termsBody} locale={s.locale}/><a className="pill dark" href={localePath(s.locale,'/iletisim')}>{s.ui.contactInvitation}</a></article></main></Shell>}

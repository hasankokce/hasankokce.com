import {permanentRedirect} from 'next/navigation';
import {getSettings} from '../store';
import {localePath} from '../i18n';
export default async function Guides(){const [s,raw]=await Promise.all([getSettings(),getSettings(true)]);const split=(c:string)=>c.split(',').map(x=>x.trim()).filter(Boolean);const topic=split(s.categories)[split(raw.categories).indexOf('Rehberler')]||'Rehberler';permanentRedirect(localePath(s.locale,'/yazilar?konu='+encodeURIComponent(topic)))}

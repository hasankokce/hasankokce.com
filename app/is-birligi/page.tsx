import {permanentRedirect} from 'next/navigation';
import {getLocale} from '../locale';
import {localePath} from '../i18n';
export default async function OldCollaboration(){permanentRedirect(localePath(await getLocale(),'/iletisim'))}

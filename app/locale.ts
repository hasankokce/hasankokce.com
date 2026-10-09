import 'server-only';
import {headers} from 'next/headers';
import {localeHeader,type Locale} from './i18n';
// The proxy sets this header on every page request, so a visitor cannot choose it for a Turkish URL.
export async function getLocale():Promise<Locale>{try{return (await headers()).get(localeHeader)==='en'?'en':'tr'}catch{return 'tr'}}

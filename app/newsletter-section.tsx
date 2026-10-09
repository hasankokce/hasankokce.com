import NewsletterForm from './newsletter-form';
import {newsletterSettings,ready} from '../runtime/newsletter';
import {englishNewsletter,readTranslations} from './translations';
import type {Locale} from './i18n';
export default async function NewsletterSection({locale='tr'}:{locale?:Locale}){const stored=await newsletterSettings();if(!stored.enabled||!ready())return null;const settings=locale==='en'?englishNewsletter(stored,await readTranslations(['site'])):stored;return <NewsletterForm settings={settings} locale={locale}/>}

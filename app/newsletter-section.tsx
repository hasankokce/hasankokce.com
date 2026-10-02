import NewsletterForm from './newsletter-form';
import {newsletterSettings,ready} from '../runtime/newsletter';
export default async function NewsletterSection(){const settings=await newsletterSettings();return settings.enabled&&ready()?<NewsletterForm settings={settings}/>:null}

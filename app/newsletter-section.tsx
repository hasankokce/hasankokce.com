import NewsletterForm from './newsletter-form';
import {newsletterSettings} from '../runtime/newsletter';
export default async function NewsletterSection(){const settings=await newsletterSettings();return settings.enabled?<NewsletterForm settings={settings}/>:null}

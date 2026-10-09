import {getSettings} from './store';
import {Header,Footer} from './site';
import {localePath,fixed} from './i18n';
export default async function NotFound(){const s=await getSettings();return <div className="public-site"><Header settings={s}/><main id="site-content" tabIndex={-1} className="status-box"><span className="section-label">404</span><h1>{s.ui.notFoundTitle}</h1><p>{s.ui.notFoundBody}</p><a className="pill dark" href={localePath(s.locale,'/yazilar')}>{s.ui.articleBack}</a><form className="search-form" action={localePath(s.locale,'/yazilar')}><label htmlFor="missing-search">{s.ui.articleSearch}</label><input id="missing-search" type="search" name="q"/><button type="submit">{fixed(s.locale).search}</button></form></main><Footer settings={s}/></div>}

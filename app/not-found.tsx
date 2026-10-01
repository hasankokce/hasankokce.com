import {getSettings} from './store';

export default async function NotFound(){const s=await getSettings();return <main className="status-box"><span className="section-label">404</span><h1>{s.ui.notFoundTitle}</h1><p>{s.ui.notFoundBody}</p><a className="pill dark" href="/yazilar">{s.ui.articleBack}</a></main>}

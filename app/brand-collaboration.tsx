import type {Settings} from './content';
import {Prose} from './prose';

export function BrandCollaboration({settings:s}:{settings:Settings}) {
  return <section id="is-birligi" className="brand-section" aria-labelledby="brand-title">
    <div className="brand-intro">
      <div>
        <span className="section-label">{s.ui.brandLabel}</span>
        <h2 id="brand-title">{s.collabTitle}</h2>
        <Prose body={s.collabBody}/>
        <div className="brand-actions">
          <a href={s.management.showContactForm?"#iletisim-formu":"mailto:"+s.email} className="pill dark">{s.ui.brandProject}</a>
          {s.mediaKitUrl&&<a className="text-link" href={s.mediaKitUrl} target="_blank" rel="noopener noreferrer">{s.ui.brandKit}</a>}
        </div>
      </div>
      <aside className="brand-approach">
        <span className="section-label">{s.ui.brandApproach}</span>
        <h3>{s.collabApproachTitle}</h3>
        <Prose body={s.collabApproachBody}/>
        <span className="brand-signature">{s.name}</span>
      </aside>
    </div>
    {s.collabFormats.length>0&&<section className="brand-formats" aria-labelledby="brand-formats-title">
      <span className="section-label">{s.ui.brandFormats}</span>
      <h3 id="brand-formats-title" className="brand-heading">{s.collabFormatsTitle}</h3>
      <div className="brand-format-grid">{s.collabFormats.map((item,i)=><article key={i}>
        <span className="brand-index" aria-hidden="true">{String(i+1).padStart(2,'0')} ↗</span>
        <h4>{item.title}</h4><Prose body={item.body}/>
      </article>)}</div>
    </section>}
    {s.collabSteps.length>0&&<section className="brand-process" aria-labelledby="brand-process-title">
      <span className="section-label">{s.ui.brandProcess}</span>
      <h3 id="brand-process-title" className="brand-heading">{s.collabProcessTitle}</h3>
      <ol className="brand-step-grid">{s.collabSteps.map((item,i)=><li key={i}>
        <span className="brand-step-number" aria-hidden="true">{String(i+1).padStart(2,'0')}</span>
        <div><h4>{item.title}</h4><Prose body={item.body}/></div>
      </li>)}</ol>
    </section>}
    <div className="brand-brief">
      <div><span className="section-label">{s.ui.brandFirstStep}</span><h3 className="brand-heading">{s.collabCtaTitle}</h3><Prose body={s.collabCtaBody}/></div>
      <a href={s.management.showContactForm?"#iletisim-formu":"mailto:"+s.email} className="pill dark">{s.ui.brandShare}</a>
    </div>
  </section>;
}

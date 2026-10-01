// Isolated integration test. Uses a temporary database and never contacts SMTP.
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomBytes,scryptSync} from 'node:crypto';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
const directory=mkdtempSync(path.join(tmpdir(),'hk-analytics-'));
const port=process.env.ANALYTICS_TEST_PORT||'3104',base='http://localhost:'+port;
const password='Local-analytics-preview-only',salt=randomBytes(16).toString('hex');
const environment={...process.env,ADMIN_EMAIL:'analytics@example.test',ADMIN_PASSWORD_HASH:salt+':'+scryptSync(password,salt,64).toString('hex'),SESSION_SECRET:randomBytes(32).toString('hex'),SITE_ORIGIN:base,PORT:port,DATA_DIR:directory,SMTP_PASSWORD:''};
let child,cookie='';const ua='Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 Chrome/130 Safari/537.36';
async function start(){child=spawn(process.execPath,['scripts/start.mjs'],{env:environment,stdio:['ignore','ignore','pipe']});child.stderr.on('data',d=>{if(!String(d).includes('ExperimentalWarning')&&!String(d).includes('trace-warnings'))process.stderr.write(d)});for(let i=0;i<100;i++){try{if((await fetch(base)).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error('Test server failed to start')}
async function stop(){if(child&&child.exitCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await ended}}
async function login(){const r=await fetch(base+'/api/auth/login',{method:'POST',redirect:'manual',headers:{origin:base,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:environment.ADMIN_EMAIL,password})});assert.equal(r.status,303);cookie=r.headers.get('set-cookie').split(';')[0]}
async function admin(route,body){const r=await fetch(base+route,{method:body?'POST':'GET',headers:{cookie,origin:base,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();assert(r.ok,JSON.stringify(data));return data}
async function ticket(route='/'){const r=await fetch(base+route);const html=await r.text();assert(r.ok,route);const token=html.match(/data-analytics-ticket="([^"]+)"/)?.[1];assert(token,'page ticket missing');return token}
async function events(t,events,headers={}){return fetch(base+'/api/analytics',{method:'POST',headers:{origin:base,'content-type':'application/json','user-agent':ua,...headers},body:JSON.stringify({ticket:t,events,referrer:'https://www.google.com/search?q=private-term',utm:''})})}
const ev=(kind,id,event='view')=>({kind,id,event});
const getReport=()=>admin('/api/admin/analytics');
try{
 await start();await login();assert.equal((await fetch(base+'/api/admin/analytics')).status,403);
 const initial=await getReport();assert.equal(initial.totals.views,0);assert(initial.rows.some(r=>r.kind==='post'&&r.views===0));
 let settings=await admin('/api/admin/settings');assert.equal(settings.featuredPromptIds.length,4);const home=await (await fetch(base)).text();assert.equal((home.match(/class="prompt-card"/g)||[]).length,4);const posts=await admin('/api/admin/posts');const post={...posts.find(p=>p.status==='published'),id:'analytics-new-post',slug:'analytics-new-post',title:'Yeni test yazısı',featured:false,demo:false};
 await admin('/api/admin/posts',post);
 const prompt={...settings.prompts[0],id:'analytics-new-prompt',slug:'analytics-new-prompt',title:'Yeni test promptu',visible:true};const gear={...settings.gear[0],id:'analytics-new-product',title:'Yeni test ürünü',url:'https://example.test/product',visible:true};
 settings.prompts.push(prompt);settings.gear.push(gear);await admin('/api/admin/settings',settings);
 let report=await getReport();for(const id of [post.id,prompt.id,gear.id])assert(report.rows.some(r=>r.id===id&&r.views===0),'new item auto included');
 const t=await ticket('/yazi/'+post.slug);const view=ev('post',post.id);
 await Promise.all(Array.from({length:16},()=>events(t,[view])));report=await getReport();assert.equal(report.rows.find(r=>r.id===post.id).views,1,'concurrent duplicates count once');
 const rejected=await events(t,[view],{origin:'https://wrong.example'});assert.equal(rejected.status,403);
 assert.equal((await events('invalid',[view])).status,400);
 for(const body of ['{','null','[]'])assert.equal((await fetch(base+'/api/analytics',{method:'POST',headers:{origin:base,'user-agent':ua},body})).status,400,'malformed payload rejected');
 assert.equal((await events(t,[null,{},ev('toString','bad'),ev('__proto__','bad')])).status,204,'invalid events ignored');
 assert.equal((await fetch(base+'/api/analytics',{method:'POST',headers:{origin:base,'user-agent':ua},body:JSON.stringify({ticket:t,events:[view],utm:'constructor'})})).status,204,'prototype-like source handled');
 for(const headers of [{cookie},{dnt:'1'},{'sec-gpc':'1'},{'user-agent':'Googlebot'}])await events(await ticket('/yazi/'+post.slug),[view],headers);
 report=await getReport();assert.equal(report.rows.find(r=>r.id===post.id).views,1,'admin/privacy/bot excluded');
 await events(t,[ev('post',post.id,'read'),ev('post',post.id,'engaged'),ev('post','nonexistent')]);
 const pt=await ticket('/promptlar/'+prompt.slug);await events(pt,[ev('prompt',prompt.id,'copy')]);assert.equal((await getReport()).totals.copies,0,'copy needs view');
 await events(pt,[ev('prompt',prompt.id),ev('prompt',prompt.id,'copy'),ev('prompt',prompt.id,'copy')]);
 const gt=await ticket('/kullandiklarim');await events(gt,[ev('gear',gear.id),ev('gear',gear.id,'click')]);
 report=await getReport();assert.equal(report.totals.pageViews,2);assert.equal(report.totals.cardViews,1);assert.equal(report.totals.copies,1);assert.equal(report.totals.clicks,1);assert.equal(report.totals.reads,1);assert(report.sources.some(s=>s.name==='Google'));
 post.slug='analytics-renamed-post';post.title='Yeniden adlandırılan yazı';await admin('/api/admin/posts',post);
 settings.prompts=settings.prompts.map(p=>p.id===prompt.id?{...p,slug:'analytics-renamed-prompt',title:'Yeni prompt başlığı'}:p);await admin('/api/admin/settings',settings);
 await events(await ticket('/yazi/'+post.slug),[view]);await events(await ticket('/promptlar/analytics-renamed-prompt'),[ev('prompt',prompt.id)]);
 report=await getReport();assert.equal(report.rows.find(r=>r.id===post.id).views,2);assert.equal(report.rows.find(r=>r.id===post.id).title,post.title);assert.equal(report.rows.find(r=>r.id===prompt.id).views,2);
 post.status='archived';await admin('/api/admin/posts',post);settings.prompts=settings.prompts.filter(p=>p.id!==prompt.id);await admin('/api/admin/settings',settings);
 report=await getReport();assert.equal(report.rows.find(r=>r.id===post.id).views,2);assert.equal(report.rows.find(r=>r.id===prompt.id).status,'removed');assert.equal(report.rows.find(r=>r.id===prompt.id).copies,1);
 const csv=await fetch(base+'/api/admin/analytics?format=csv',{headers:{cookie}});assert(csv.headers.get('content-type').includes('text/csv'));assert((await csv.text()).includes(post.id));
 assert.equal((await fetch(base+'/api/admin/analytics?from=2026-02-30&to=2026-03-01',{headers:{cookie}})).status,400);
 const db=new DatabaseSync(path.join(directory,'site.sqlite'));const privacy=JSON.parse(db.prepare("SELECT data FROM settings WHERE id='site'").get().data).privacy;assert(privacy.includes('Site içi içerik istatistikleri'));
 const schema=db.prepare('PRAGMA table_info(analytics_receipts)').all().map(x=>x.name);assert(!schema.some(n=>/ip|email|user_agent|referrer/.test(n)));
 const current=report.from;const prev=report.previousFrom;db.prepare("INSERT INTO analytics_daily VALUES (?,'post',?,'view','Google','Mobil',7)").run(prev,post.id);
 report=await getReport();assert.equal(report.previous.pageViews,7);assert.equal(report.rows.find(r=>r.id===post.id).previousViews,7);db.close();
 await stop();await start();await login();const after=await getReport();assert.equal(after.totals.views,report.totals.views);assert.equal(after.rows.find(r=>r.id===prompt.id).copies,1);
 console.log('PASS: new content auto inclusion; concurrent deduplication; valid signed tickets; admin/bot/DNT/GPC exclusion; post read; prompt copy; product clicks; rename continuity; archive/delete history; period comparison; CSV; date validation; restart persistence.');
 if(process.argv.includes('--serve')){console.log('Preview ready at '+base+'/admin#analytics (isolated test data).');await new Promise(resolve=>{process.once('SIGINT',resolve);process.once('SIGTERM',resolve)})}
}finally{await stop()}

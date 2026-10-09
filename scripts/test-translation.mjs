// Isolated integration test for the English site. Uses a temporary database and a local fake OpenAI server; no real API calls.
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomBytes,scryptSync} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
const directory=mkdtempSync(path.join(tmpdir(),'hk-translation-'));
const port=process.env.TRANSLATION_TEST_PORT||'3105',base='http://localhost:'+port,fakePort=Number(port)+1;
const password='Local-translation-preview-only',salt=randomBytes(16).toString('hex'),apiKey='sk-test-'+randomBytes(16).toString('hex');
const environment={...process.env,ADMIN_EMAIL:'translation@example.test',ADMIN_PASSWORD_HASH:salt+':'+scryptSync(password,salt,64).toString('hex'),SESSION_SECRET:randomBytes(32).toString('hex'),SITE_ORIGIN:base,PORT:port,DATA_DIR:directory,SMTP_PASSWORD:'',OPENAI_BASE_URL:'http://127.0.0.1:'+fakePort+'/v1'};

// Fake OpenAI: "translates" by prefixing each text with EN: and keeps the keys, like the real model is asked to.
const calls=[];let failNext=0;
const fake=createServer(async(req,res)=>{let raw='';for await(const c of req)raw+=c;const body=JSON.parse(raw||'{}');calls.push({auth:req.headers.authorization,body});
 if(req.headers.authorization!=='Bearer '+apiKey){res.writeHead(401,{'content-type':'application/json'});return res.end(JSON.stringify({error:{message:'Incorrect API key provided'}}))}
 if(failNext>0){failNext--;res.writeHead(429,{'content-type':'application/json'});return res.end(JSON.stringify({error:{message:'You exceeded your current quota, please check your plan and billing details.'}}))}
 const input=JSON.parse(body.messages[1].content);const out=Object.fromEntries(Object.entries(input).map(([k,v])=>[k,'EN:'+v]));
 res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(out)}}]}))});
await new Promise(r=>fake.listen(fakePort,'127.0.0.1',r));

let child,cookie='';
async function start(){child=spawn(process.execPath,['scripts/start.mjs'],{env:environment,stdio:['ignore','ignore','pipe']});child.stderr.on('data',d=>{const s=String(d);if(!s.includes('ExperimentalWarning')&&!s.includes('trace-warnings')&&!s.includes('translation'))process.stderr.write(d)});for(let i=0;i<100;i++){try{if((await fetch(base)).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error('Test server failed to start')}
async function stop(){if(child&&child.exitCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await ended}fake.close()}
async function login(){const r=await fetch(base+'/api/auth/login',{method:'POST',redirect:'manual',headers:{origin:base,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:environment.ADMIN_EMAIL,password})});assert.equal(r.status,303);cookie=r.headers.get('set-cookie').split(';')[0]}
async function admin(route,body,expectOk=true){const r=await fetch(base+route,{method:body?'POST':'GET',headers:{cookie,origin:base,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(expectOk)assert(r.ok,JSON.stringify(data));return {status:r.status,...data}}
const translation=body=>admin('/api/admin/translation',body);
async function idle(){for(let i=0;i<200;i++){const d=await translation();if(!d.job.running)return d;await new Promise(r=>setTimeout(r,100))}throw Error('translation job did not finish')}
const page=async p=>{const r=await fetch(base+p,{redirect:'manual'});return {status:r.status,html:await r.text(),location:r.headers.get('location')}};

try{
 await start();await login();
 assert.equal((await fetch(base+'/api/admin/translation')).status,403,'admin only');
 assert.equal((await fetch(base+'/api/admin/translation',{method:'POST',headers:{cookie,origin:'https://wrong.example','content-type':'application/json'},body:'{"action":"sync"}'})).status,403,'origin checked');

 // Before any translation the English site works and falls back to Turkish text.
 let en=await page('/en');assert.equal(en.status,200);assert(en.html.includes('<html lang="en"'),'english html lang');assert(en.html.includes('href="/en/yazilar"'),'links stay in english');assert(/hreflang="tr"/i.test(en.html),'language alternates');
 let tr=await page('/');assert(tr.html.includes('<html lang="tr"'));assert(tr.html.includes('href="/en"'),'switch to english');assert(!tr.html.includes('href="/en/yazilar"'));
 const spoof=await fetch(base+'/',{headers:{'x-site-locale':'en'}});assert((await spoof.text()).includes('<html lang="tr"'),'visitors cannot force english on turkish urls');

 let d=await translation();assert.equal(d.hasKey,false);assert(d.status.site.missing>0&&d.status.post.missing>0&&d.status.prompt.missing>0);
 assert.equal((await admin('/api/admin/translation',{action:'test'},false)).status,400,'test needs a key');
 assert.equal((await admin('/api/admin/translation',{action:'save',apiKey:'not-a-key',model:'gpt-5-mini',auto:true},false)).status,400,'key format checked');
 d=await translation({action:'save',apiKey:'sk-wrong-'+randomBytes(16).toString('hex'),model:'gpt-5-mini',auto:false});assert.equal(d.hasKey,true);
 const wrong=await admin('/api/admin/translation',{action:'test'},false);assert.equal(wrong.status,400);assert.match(wrong.error,/geçersiz/,'bad key explained');
 d=await translation({action:'save',apiKey,model:'gpt-5-mini',auto:false});assert.equal(d.keyHint,'••••'+apiKey.slice(-4));
 const settingsRow=JSON.stringify(await admin('/api/admin/settings'));assert(!settingsRow.includes(apiKey),'key not in site settings');
 const test=await translation({action:'test'});assert.match(test.message,/EN:Merhaba/);assert.equal(calls.at(-1).body.reasoning_effort,'low');

 // Translate everything, then check the English pages.
 const total=Object.values(d.status).reduce((a,c)=>a+c.missing,0);
 await translation({action:'sync'});d=await idle();assert.equal(d.job.failed,0,d.job.lastError);
 for(const k of ['post','prompt','site','term'])assert.equal(d.status[k].done,d.status[k].total,k+' translated');
 assert(d.job.done>=total);
 const settings=await admin('/api/admin/settings');
 en=await page('/en');assert(en.html.includes('EN:'+settings.heroDescription),'hero translated');assert(en.html.includes('EN:'+settings.navigation.find(n=>n.path==='/yazilar').label),'menu translated');
 tr=await page('/');assert(!tr.html.includes('EN:'),'turkish site untouched');
 const postsList=await admin('/api/admin/posts');const post=Object.values(postsList).find(p=>p&&p.status==='published'&&!p.demo)||Object.values(postsList).find(p=>p&&p.status==='published');
 const article=await page('/en/yazi/'+post.slug);assert.equal(article.status,200);assert(article.html.includes('EN:'+post.title),'article translated');assert(article.html.includes('rel="canonical" href="'+base+'/en/yazi/'+post.slug+'"'),'english canonical');assert(!article.html.includes('noindex'),'translated article indexable');
 const prompt=settings.prompts.find(p=>p.visible);const promptPage=await page('/en/promptlar/'+prompt.slug);assert(promptPage.html.includes('EN:'+prompt.title),'prompt translated');
 const sitemap=await page('/sitemap.xml');assert(sitemap.html.includes(base+'/en/yazi/'+post.slug),'english article in sitemap');assert(/hreflang="en"/i.test(sitemap.html));
 assert.equal((await page('/en/admin')).status,307,'admin is not served under /en');

 // Auto translation: a new post is translated right after it is saved.
 await translation({action:'save',model:'gpt-5-mini',auto:true});
 const fresh={...post,id:'translation-new-post',slug:'translation-new-post',title:'Otomatik çevrilecek yazı',featured:false,demo:false,status:'published'};delete fresh.translated;
 await admin('/api/admin/posts',fresh);
 let page2;for(let i=0;i<100;i++){page2=await page('/en/yazi/'+fresh.slug);if(page2.html.includes('<h1>EN:Otomatik çevrilecek yazı</h1>'))break;await new Promise(r=>setTimeout(r,100))}
 assert(page2.html.includes('<h1>EN:Otomatik çevrilecek yazı</h1>'),'new post auto translated');

 // Untranslated English article pages stay out of search results.
 await translation({action:'save',model:'gpt-5-mini',auto:false});
 const manual={...fresh,id:'translation-manual-post',slug:'translation-manual-post',title:'Henüz çevrilmedi'};await admin('/api/admin/posts',manual);
 const pending=await page('/en/yazi/'+manual.slug);assert.equal(pending.status,200);assert(pending.html.includes('Henüz çevrilmedi'));assert(pending.html.includes('noindex'),'untranslated english page is noindex');

 // Per-item list and single-item translation: only the chosen post is translated, other kinds stay untouched.
 let list=await admin('/api/admin/translation?items=post');const row=list.items.find(i=>i.id===manual.id);assert(row&&row.state==='missing'&&row.label==='Henüz çevrilmedi','post listed as missing');
 assert.equal((await admin('/api/admin/translation?items=term')).items.every(i=>typeof i.label==='string'),true);
 const before=(await translation()).status;
 d=await translation({action:'translate',kind:'post',ids:[manual.id]});assert.equal(d.message,'Çeviri sırasına alındı.');d=await idle();
 list=await admin('/api/admin/translation?items=post');assert.equal(list.items.find(i=>i.id===manual.id).state,'done','single post translated');assert.equal(list.items.find(i=>i.id===manual.id).english,'EN:Henüz çevrilmedi');
 assert.deepEqual(d.status.prompt,before.prompt,'prompts untouched by single post translation');
 // A translated item can be re-translated on request.
 const calls0=calls.length;await translation({action:'translate',kind:'post',ids:[manual.id]});await idle();assert(calls.length>calls0,'re-translate calls OpenAI again');
 assert.equal((await admin('/api/admin/translation',{action:'translate',kind:'post',ids:['no-such-post']},false)).status,404);
 // Section sync only queues that kind.
 settings.prompts[0].title=settings.prompts[0].title+' yeni';await admin('/api/admin/settings',settings);settings.heroDescription='Bölüm testi';await admin('/api/admin/settings',settings);
 d=await translation({action:'sync',kind:'prompt'});d=await idle();assert.equal(d.status.prompt.outdated+d.status.prompt.missing,0,'prompt section synced');assert(d.status.site.outdated+d.status.site.missing>0,'site texts left for later');

 // Quota errors are reported and stop the queue.
 failNext=99;await translation({action:'sync'});d=await idle();assert(d.job.failed>0);assert.match(d.job.lastError,/bakiye/);failNext=0;

 // An edited site text drops its old translation until it is translated again.
 settings.heroDescription='Yeni açıklama';await admin('/api/admin/settings',settings);en=await page('/en');assert(en.html.includes('Yeni açıklama')&&!en.html.includes('EN:Yeni açıklama'));
 await translation({action:'sync'});await idle();en=await page('/en');assert(en.html.includes('EN:Yeni açıklama'));

 d=await translation({action:'save',clearKey:true,model:'gpt-5-mini',auto:true});assert.equal(d.hasKey,false);
 console.log('Translation integration test passed.');
}finally{await stop()}

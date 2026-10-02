import {existsSync} from 'node:fs';import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const [major,minor]=process.versions.node.split('.').map(Number);
if(major!==24||minor<14)throw Error('Bu proje Node.js 24.14 veya üzeri bir 24.x sürümü gerektirir. Mevcut sürüm: '+process.version);
const require=createRequire(import.meta.url);
let nextBin;
try{nextBin=require.resolve('next/dist/bin/next')}catch{throw Error('Next.js bulunamadı. Önce npm ci --include=dev, ardından npm run build çalıştırın.')}
if(!existsSync('.next/BUILD_ID'))throw Error('Üretim derlemesi bulunamadı. Önce npm run build çalıştırın.');
if(existsSync('.env'))process.loadEnvFile('.env');
for(const name of ['ADMIN_EMAIL','ADMIN_PASSWORD_HASH','SESSION_SECRET','SITE_ORIGIN'])if(!process.env[name])throw Error(name+' gerekli');
if(process.env.SESSION_SECRET.length<32)throw Error('SESSION_SECRET en az 32 karakter olmalı');const url=new URL(process.env.SITE_ORIGIN);if(url.origin!==process.env.SITE_ORIGIN)throw Error('SITE_ORIGIN yalnızca alan adı ve protokol olmalı');if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw Error('Canlı sitede HTTPS gerekli');
const child=spawn(process.execPath,[nextBin,'start','-p',process.env.PORT||'3000','-H',process.env.BIND_HOST||'0.0.0.0'],{stdio:'inherit',env:process.env});for(const s of ['SIGTERM','SIGINT'])process.on(s,()=>child.kill(s));child.on('exit',c=>process.exit(c??1));

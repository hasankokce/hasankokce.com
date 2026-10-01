import {getSettings} from '../store';
export async function GET(){try{const s=await getSettings();const content=/^ca-pub-\d{16}$/.test(s.adsClient)?'google.com, '+s.adsClient.replace('ca-','')+', DIRECT, f08c47fec0942fa0\n':'';return new Response(content,{headers:{'Content-Type':'text/plain'}})}catch{return new Response('Unavailable',{status:503})}}

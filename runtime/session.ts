import 'server-only';
import {createHmac,timingSafeEqual,scryptSync} from 'node:crypto';
import {cookies} from 'next/headers';
export const cookieName='hk_admin_session';
function secret(){const s=process.env.SESSION_SECRET;if(!s||s.length<32)throw Error('SESSION_SECRET must contain at least 32 characters');return s}
export function sign(payload:string){return createHmac('sha256',secret()).update(payload).digest('base64url')}
export function createSession(){const payload=Buffer.from(JSON.stringify({email:process.env.ADMIN_EMAIL,exp:Date.now()+8*3600000,revision:sign(process.env.ADMIN_PASSWORD_HASH||'')})).toString('base64url');return payload+'.'+sign(payload)}
export async function sessionUser(){try{const token=(await cookies()).get(cookieName)?.value;if(!token)return null;const [p,sig]=token.split('.');const expected=sign(p);if(!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;const data=JSON.parse(Buffer.from(p,'base64url').toString());if(data.exp<Date.now()||data.email!==process.env.ADMIN_EMAIL||data.revision!==sign(process.env.ADMIN_PASSWORD_HASH||''))return null;return {userId:'owner',email:data.email,displayName:data.email,fullName:null}}catch{return null}}
export function passwordMatches(value:string){try{const [salt,hex]=String(process.env.ADMIN_PASSWORD_HASH||'').split(':');if(!salt||!hex)return false;const expected=Buffer.from(hex,'hex');const actual=scryptSync(value,salt,64);return expected.length===actual.length&&timingSafeEqual(expected,actual)}catch{return false}}

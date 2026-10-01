import {env} from '../runtime/platform';
import {getChatGPTUser} from './chatgpt-auth';
export async function isAdmin(){const u=await getChatGPTUser();if(!u)return false;const expected=env.ADMIN_EMAIL?.trim().toLowerCase();return !!expected&&u.email.trim().toLowerCase()===expected}
export async function guard(request:Request){if(!await isAdmin())return Response.json({error:'Bu işlem için yönetici girişi gerekli.'},{status:403});const origin=request.headers.get('origin');if(!origin||origin!==env.SITE_ORIGIN)return Response.json({error:'Geçersiz istek kaynağı.'},{status:403});return null}

import {redirect} from 'next/navigation';
import {sessionUser} from '../runtime/session';
export type ChatGPTUser={userId:string;displayName:string;email:string;fullName:string|null};
export const getChatGPTUser=sessionUser;
export async function requireChatGPTUser(returnTo:string){const user=await sessionUser();if(user)return user;redirect('/admin/login?return_to='+encodeURIComponent(returnTo))}
export function chatGPTSignInPath(_returnTo:string){return '/admin/login'}
export function chatGPTSignOutPath(){return '/admin/logout'}

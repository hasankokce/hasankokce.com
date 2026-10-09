import {NextResponse,type NextRequest} from 'next/server';
import {localeHeader} from './app/i18n';
// /en/... is served by the same pages as the Turkish site; the header tells them to render English content.
export function proxy(request:NextRequest){
 const {pathname}=request.nextUrl;const english=/^\/en(?:\/|$)/.test(pathname);
 const headers=new Headers(request.headers);headers.set(localeHeader,english?'en':'tr');
 if(!english)return NextResponse.next({request:{headers}});
 const url=request.nextUrl.clone();url.pathname=pathname.slice(3)||'/';
 if(/^\/(?:api|admin|_next)(?:\/|$)/.test(url.pathname))return NextResponse.redirect(url);
 return NextResponse.rewrite(url,{request:{headers}});
}
export const config={matcher:['/((?!_next/static|_next/image|images/|icons/|favicon).*)']};

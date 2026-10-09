'use client';
import {Button} from '@/components/ui/button';
import {usePathname} from 'next/navigation';
import {fixed} from './i18n';
export default function ErrorPage({reset}:{reset:()=>void}){const t=fixed(/^\/en(\/|$)/.test(usePathname()||'')?'en':'tr');return <main className="status-box"><h1>{t.errorTitle}</h1><p>{t.errorBody}</p><Button onClick={reset}>{t.errorRetry}</Button></main>}

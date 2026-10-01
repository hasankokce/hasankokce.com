'use client';
import {trackPromptCopy} from '../analytics-tracker';
import type {copyDefaults} from '../site-copy';
import {useRef,useState} from 'react';
import {Copy,Check,Link as LinkIcon} from 'lucide-react';
import {Button} from '@/components/ui/button';
export default function CopyPrompt({id,text,copy:labels}:{id:string;text:string;copy:typeof copyDefaults}){
 const field=useRef<HTMLTextAreaElement>(null);const [state,setState]=useState(''),[linkState,setLinkState]=useState('');
 async function copy(){try{await navigator.clipboard.writeText(text);trackPromptCopy(id);setState(labels.promptCopySuccess)}catch{field.current?.focus();field.current?.select();setState(labels.promptCopyFallback)}}
 async function link(){try{await navigator.clipboard.writeText(window.location.origin+window.location.pathname);setLinkState(labels.promptShareSuccess)}catch{setLinkState(labels.promptShareFallback)}}
 return <section className="prompt-copy"><div className="prompt-copy-heading"><h2>{labels.promptTextTitle}</h2><Button className="prompt-copy-button" onClick={()=>void copy()}>{state===labels.promptCopySuccess?<Check/>:<Copy/>}{state===labels.promptCopySuccess?labels.promptCopied:labels.promptCopy}</Button></div><label className="sr-only" htmlFor="prompt-text">Kopyalanacak prompt metni</label><textarea id="prompt-text" ref={field} readOnly value={text} rows={12} spellCheck={false}/><p className="prompt-copy-status" role="status">{state||labels.promptCopyHint}</p><Button variant="outline" onClick={()=>void link()}><LinkIcon/> {labels.promptShare}</Button><span className="prompt-link-status" role="status">{linkState}</span></section>
}

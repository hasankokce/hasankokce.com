"use client";
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
export default function LabelsEditor({label,values,onChange,max=20}:{label:string;values:string[];onChange:(values:string[])=>void;max?:number}){
 const [value,setValue]=useState(''),[error,setError]=useState('');
 function add(){const next=[...values];for(const v of value.split(',').map(x=>x.trim()).filter(Boolean)){if(v.length>60){setError('Her ad en fazla 60 karakter olabilir.');return}if(!next.some(x=>x.toLocaleLowerCase('tr-TR')===v.toLocaleLowerCase('tr-TR')))next.push(v)}if(next.length>max){setError(`En fazla ${max} öğe ekleyebilirsin.`);return}onChange(next);setValue('');setError('')}
 return <section className="admin-field"><strong>{label}</strong><div className="filters">{values.map(v=><Button type="button" variant="outline" key={v} aria-label={v+' kaldır'} onClick={()=>onChange(values.filter(x=>x!==v))}>{v} ×</Button>)}</div><div className="workflow-row"><Input aria-label={label+' ekle'} value={value} placeholder="Ad yaz, Ekle’ye bas" maxLength={300} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add()}}}/><Button type="button" variant="outline" disabled={!value.trim()} onClick={add}>Ekle</Button></div>{error&&<small role="alert">{error}</small>}</section>
}

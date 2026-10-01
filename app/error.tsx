'use client';
import {Button} from '@/components/ui/button';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="status-box"><h1>İçerik şu an yüklenemiyor.</h1><p>Bağlantıda kısa süreli bir sorun oluştu. Biraz sonra yeniden deneyebilirsin.</p><Button onClick={reset}>Yeniden dene</Button></main>}

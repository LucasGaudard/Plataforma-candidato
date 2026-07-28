'use client';
import { useState } from 'react';
export function CampaignLogo({ logoUrl, name, className = 'h-10 w-10' }: { logoUrl?: string | null; name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  // URL externa dinâmica: <img> permite fallback via onError sem liberar hosts globais no Next.
  // eslint-disable-next-line @next/next/no-img-element
  if (logoUrl && !failed) return <img src={logoUrl} alt={`Logo da campanha ${name}`} className={`${className} rounded-lg object-contain`} onError={() => setFailed(true)} />;
  return <span className={`${className} inline-flex items-center justify-center rounded-lg gradient-brand font-bold text-white`} aria-label={`Logo padrão de ${name}`}>{name.charAt(0).toUpperCase()}</span>;
}

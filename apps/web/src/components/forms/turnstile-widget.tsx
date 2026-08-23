'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

declare global {
  interface Window {
    turnstile?: {
      render(container: HTMLElement, options: Record<string, unknown>): string;
      remove(widgetId: string): void;
    };
  }
}

export function TurnstileWidget({ onTokenChange, onRequirementChange }: {
  onTokenChange(token: string): void;
  onRequirementChange(required: boolean): void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string>();
  const [config, setConfig] = useState<{ required: boolean; available: boolean; siteKey: string }>();
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    api.getPublicAntiAbuseConfig().then((value) => {
      setConfig(value);
      onRequirementChange(value.required);
    }).catch(() => {
      setConfig({ required: true, available: false, siteKey: '' });
      onRequirementChange(true);
    });
  }, [onRequirementChange]);

  useEffect(() => {
    if (!scriptReady || !config?.available || !containerRef.current || !window.turnstile) return;
    widgetId.current = window.turnstile.render(containerRef.current, {
      sitekey: config.siteKey,
      callback: (token: string) => onTokenChange(token),
      'expired-callback': () => onTokenChange(''),
      'error-callback': () => onTokenChange(''),
      theme: 'light',
    });
    return () => {
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
    };
  }, [config, onTokenChange, scriptReady]);

  if (!config) return <p className="text-sm text-slate-500">Carregando verificação de segurança...</p>;
  if (config.required && !config.available) {
    return <p className="text-sm font-medium text-red-600">A verificação de segurança está indisponível. Tente novamente mais tarde.</p>;
  }
  if (!config.required) return null;
  return (
    <div>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={() => setScriptReady(true)} />
      <div ref={containerRef} aria-label="Verificação de segurança" />
    </div>
  );
}

'use client';

import { FormEvent, useState } from 'react';
import { LEGAL_CONTACT_EMAIL } from '@/lib/legal';

type FormState = {
  name: string;
  phone: string;
  email: string;
  campaign: string;
  reason: string;
  confirmed: boolean;
};

const initialState: FormState = { name: '', phone: '', email: '', campaign: '', reason: '', confirmed: false };

export function DataDeletionForm() {
  const [form, setForm] = useState(initialState);
  const [message, setMessage] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = form.name.trim();
    const cleanPhone = form.phone.replace(/\D/g, '');
    const cleanEmail = form.email.trim();

    if (!cleanName || cleanPhone.length < 10 || !/^\S+@\S+\.\S+$/.test(cleanEmail) || !form.confirmed) {
      setMessage('Revise os campos obrigatórios e confirme a solicitação de exclusão.');
      return;
    }

    const subject = 'Solicitação de exclusão de dados — Conecta Eleitor';
    const body = [
      'Solicito a exclusão dos meus dados pessoais no Conecta Eleitor.',
      '',
      `Nome: ${cleanName}`,
      `Telefone/WhatsApp: ${form.phone.trim()}`,
      `E-mail: ${cleanEmail}`,
      `Campanha: ${form.campaign.trim() || 'Não informada'}`,
      `Motivo: ${form.reason.trim() || 'Não informado'}`,
      '',
      'Confirmo que desejo solicitar a exclusão dos meus dados.',
    ].join('\n');

    setMessage('Seu aplicativo de e-mail será aberto com a solicitação preenchida. Revise e envie a mensagem para concluir o pedido.');
    window.location.href = `mailto:${LEGAL_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const fieldClass = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100';

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-800">
          Nome completo <span className="text-brand-700">*</span>
          <input className={fieldClass} name="name" autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </label>
        <label className="text-sm font-semibold text-slate-800">
          Telefone/WhatsApp <span className="text-brand-700">*</span>
          <input className={fieldClass} name="phone" type="tel" autoComplete="tel" placeholder="(00) 00000-0000" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
        </label>
        <label className="text-sm font-semibold text-slate-800">
          E-mail <span className="text-brand-700">*</span>
          <input className={fieldClass} name="email" type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
        </label>
        <label className="text-sm font-semibold text-slate-800">
          Campanha, se souber
          <input className={fieldClass} name="campaign" value={form.campaign} onChange={(event) => setForm({ ...form, campaign: event.target.value })} />
        </label>
      </div>
      <label className="mt-5 block text-sm font-semibold text-slate-800">
        Motivo (opcional)
        <textarea className={`${fieldClass} min-h-28 resize-y`} name="reason" maxLength={1000} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
      </label>
      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
        <input className="mt-1 h-4 w-4 shrink-0 accent-pink-700" name="confirmed" type="checkbox" checked={form.confirmed} onChange={(event) => setForm({ ...form, confirmed: event.target.checked })} required />
        <span>Confirmo que desejo solicitar a exclusão dos meus dados pessoais. <span className="font-semibold text-brand-700">*</span></span>
      </label>
      <button type="submit" className="mt-6 w-full rounded-xl bg-brand-700 px-5 py-3.5 font-bold text-white shadow-brand transition hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 sm:w-auto">
        Preparar solicitação por e-mail
      </button>
      {message && <p className="mt-4 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm leading-6 text-brand-900" role="status">{message}</p>}
      <p className="mt-4 text-xs leading-5 text-slate-500">Os dados preenchidos não são enviados ao servidor nem armazenados por este formulário. Eles serão inseridos em uma mensagem no seu aplicativo de e-mail.</p>
    </form>
  );
}

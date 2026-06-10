'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card } from '@platform/ui';
import { RegisterForm } from '@/components/forms/register-form';
import { api } from '@/lib/api';

export default function LiderCadastroPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [leader, setLeader] = useState<{
    firstName: string;
    lastName: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getLeaderBySlug(slug)
      .then((data) => setLeader(data))
      .catch(() => setError('Líder não encontrado'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !leader) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md text-center">
          <h1 className="text-xl font-bold text-brand-900">Link inválido</h1>
          <p className="mt-2 text-sm text-slate-500">
            O link de cadastro não foi encontrado.
          </p>
          <Link
            href="/cadastro"
            className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline"
          >
            Cadastrar sem indicação
          </Link>
        </Card>
      </div>
    );
  }

  const leaderName = `${leader.firstName} ${leader.lastName}`;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-gold font-bold text-brand-900">
              C
            </div>
            <span className="text-xl font-bold text-brand-900">Campanha 2026</span>
          </Link>
        </div>

        <Card padding="lg">
          <h1 className="text-2xl font-bold text-brand-900">Cadastro via Líder</h1>
          <p className="mt-1 text-sm text-slate-500">
            Você foi indicado por <strong>{leaderName}</strong>
          </p>

          <div className="mt-6">
            <RegisterForm leaderSlug={slug} leaderName={leaderName} />
          </div>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, Alert, Card } from '@platform/ui';
import { useAuth } from '@/contexts/auth-context';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
      router.push('/dashboard');
    } catch (err) {
      setError((err as Error).message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-gold font-bold text-brand-900">
              C
            </div>
            <span className="text-xl font-bold text-brand-900">Campanha 2026</span>
          </Link>
        </div>

        <Card padding="lg">
          <h1 className="text-2xl font-bold text-brand-900">Entrar</h1>
          <p className="mt-1 text-sm text-slate-500">
            Acesse sua conta na plataforma
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}

            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />

            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              required
            />

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Entrar
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Não tem conta?{' '}
            <Link href="/cadastro" className="font-semibold text-brand-600 hover:underline">
              Cadastre-se
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

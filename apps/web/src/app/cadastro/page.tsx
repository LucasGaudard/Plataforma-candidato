import Link from 'next/link';
import { Card } from '@platform/ui';
import { RegisterForm } from '@/components/forms/register-form';

export default function CadastroPage() {
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
          <h1 className="text-2xl font-bold text-brand-900">Criar conta</h1>
          <p className="mt-1 text-sm text-slate-500">
            Preencha seus dados para se cadastrar na campanha
          </p>

          <div className="mt-6">
            <RegisterForm />
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            Já tem conta?{' '}
            <Link href="/login" className="font-semibold text-brand-600 hover:underline">
              Entrar
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

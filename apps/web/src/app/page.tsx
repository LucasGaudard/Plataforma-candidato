import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@platform/ui';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />

      <section className="gradient-hero px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-block rounded-full bg-accent-500/20 px-4 py-1.5 text-sm font-semibold text-accent-400">
            Campanha 2026
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Juntos por um futuro{' '}
            <span className="text-accent-400">melhor</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
            Plataforma oficial da campanha. Cadastre-se, acompanhe novidades,
            participe de eventos e faça parte da mudança que nossa região precisa.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/cadastro">
              <Button size="lg" variant="secondary">
                Quero me cadastrar
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                Já tenho conta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-brand-900">Como funciona</h2>
            <p className="mt-3 text-slate-600">
              Uma plataforma completa para organizar e engajar apoiadores
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: '📝',
                title: 'Cadastre-se',
                description:
                  'Preencha seus dados e faça parte oficialmente da campanha.',
              },
              {
                icon: '🔗',
                title: 'Indique amigos',
                description:
                  'Líderes compartilham links personalizados para ampliar a rede.',
              },
              {
                icon: '📢',
                title: 'Acompanhe',
                description:
                  'Receba comunicados, vídeos, lives e convites para eventos.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="text-3xl">{item.icon}</span>
                <h3 className="mt-4 text-lg font-semibold text-brand-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-900 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Faça parte da mudança
          </h2>
          <p className="mt-4 text-white/70">
            Cada apoiador conta. Cadastre-se agora e ajude a construir uma campanha forte.
          </p>
          <Link href="/cadastro" className="mt-8 inline-block">
            <Button size="lg" variant="secondary">
              Cadastrar agora
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
        © 2026 Campanha Deputado — Todos os direitos reservados
      </footer>
    </div>
  );
}

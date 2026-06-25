import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { PostsFeed } from '@/components/content/posts-feed';
import { Button } from '@platform/ui';

// ─── Dados da campanha atual ──────────────────────────────────────────────────
// Para trocar de candidato no futuro, altere apenas este bloco.
const CAMPAIGN = {
  candidateName: 'Paula Quintanilha',
  candidateTitle: 'Pré-candidata a Deputada Estadual',
  slogan: 'Filha da Baixada lutando por nossas famílias',
  sloganSub: 'Uma mulher da nossa terra, comprometida com a saúde, a educação e o futuro das nossas famílias.',
  region: 'Baixada Fluminense',
  photo: '/Images/PaulaQuintanilha.jpeg',
  year: 2026,
};

const features = [
  {
    icon: '🤝',
    title: 'Captação de Apoiadores',
    description: 'Cadastro simplificado via link personalizado de cada líder. Cada apoiador conta.',
  },
  {
    icon: '📱',
    title: 'Comunicação via WhatsApp',
    description: 'Envie comunicados, eventos e lives diretamente para sua base de apoiadores.',
  },
  {
    icon: '👥',
    title: 'Gestão de Lideranças',
    description: 'Organize coordenadores e líderes em uma hierarquia clara e eficiente.',
  },
  {
    icon: '📅',
    title: 'Eventos da Campanha',
    description: 'Crie, divulgue e acompanhe a participação em eventos e atos políticos.',
  },
  {
    icon: '📺',
    title: 'Lives e Conteúdo',
    description: 'Transmita e gerencie lives do YouTube. Mantenha apoiadores sempre informados.',
  },
  {
    icon: '📊',
    title: 'Dashboard em Tempo Real',
    description: 'Acompanhe crescimento, rankings de líderes e status da base de apoio.',
  },
];

const howItWorks = [
  {
    step: '01',
    icon: '📝',
    title: 'Cadastre-se',
    description: 'Preencha seus dados e faça parte oficialmente da campanha de Paula Quintanilha.',
  },
  {
    step: '02',
    icon: '🔗',
    title: 'Conecte sua rede',
    description: 'Líderes compartilham links personalizados para ampliar a rede de apoiadores.',
  },
  {
    step: '03',
    icon: '💬',
    title: 'Receba novidades',
    description: 'Acompanhe comunicados, vídeos, lives e convites para eventos da campanha.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* ══════════════════════════════════════════════════════════
          HERO — Foto + Slogan + CTAs
         ══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden gradient-hero">
        {/* Decoração de fundo */}
        <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
          <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-[400px] w-[400px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-brand-700/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">

            {/* Coluna esquerda — Texto */}
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-accent-400 animate-pulse" />
                <span className="text-sm font-semibold text-white/90">
                  Conecta Eleitor · {CAMPAIGN.year}
                </span>
              </div>

              <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-5xl xl:text-6xl">
                {CAMPAIGN.slogan}
              </h1>

              <p className="mt-4 text-lg font-semibold text-accent-400">
                {CAMPAIGN.candidateName}
              </p>
              <p className="mt-1 text-sm text-white/60 font-medium">
                {CAMPAIGN.candidateTitle} · {CAMPAIGN.region}
              </p>

              <p className="mt-5 max-w-lg text-base text-white/70 leading-relaxed">
                {CAMPAIGN.sloganSub}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/cadastro">
                  <button className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-bold text-brand-700 shadow-brand-lg transition-all hover:bg-brand-50 hover:-translate-y-0.5 active:translate-y-0">
                    💪 Quero apoiar
                  </button>
                </Link>
                <Link href="/login">
                  <button className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 px-6 py-3 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:-translate-y-0.5">
                    Entrar no sistema →
                  </button>
                </Link>
              </div>

              {/* Social proof */}
              <div className="mt-8 flex items-center gap-6">
                <div className="flex -space-x-2">
                  {['P','A','M','J','R'].map((l, i) => (
                    <div key={i} className="h-8 w-8 rounded-full border-2 border-white gradient-brand flex items-center justify-center text-xs font-bold text-white" style={{zIndex: 5 - i}}>
                      {l}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-white/70">
                  Junte-se a <span className="font-semibold text-white">milhares</span> de apoiadores
                </p>
              </div>
            </div>

            {/* Coluna direita — Foto da candidata */}
            <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
              <div className="relative">
                {/* Glow atrás da foto */}
                <div className="absolute inset-0 rounded-2xl bg-white/20 blur-2xl scale-95 translate-y-4" />
                <div className="relative overflow-hidden rounded-2xl shadow-brand-lg border-2 border-white/20 max-w-sm w-full">
                  <Image
                    src={CAMPAIGN.photo}
                    alt={`${CAMPAIGN.candidateName} — ${CAMPAIGN.candidateTitle}`}
                    width={480}
                    height={560}
                    className="h-auto w-full object-cover object-top"
                    priority
                  />
                  {/* Badge sobre a foto */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="rounded-xl bg-white/95 px-4 py-3 shadow-lg backdrop-blur-md">
                      <p className="text-sm font-bold text-brand-700">{CAMPAIGN.candidateName}</p>
                      <p className="text-xs text-slate-500">{CAMPAIGN.candidateTitle}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          POSTS — Últimas novidades
         ══════════════════════════════════════════════════════════ */}
      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <PostsFeed limit={6} title="Últimas novidades da campanha" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FUNCIONALIDADES — O que o Conecta Eleitor oferece
         ══════════════════════════════════════════════════════════ */}
      <section className="gradient-soft px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <span className="inline-block rounded-full bg-brand-100 px-4 py-1 text-sm font-semibold text-brand-700">
              Plataforma Completa
            </span>
            <h2 className="mt-4 font-display text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Tudo o que sua campanha precisa
            </h2>
            <p className="mt-3 text-slate-500 max-w-xl mx-auto">
              Conecta Eleitor é uma plataforma de gestão política criada para organizar apoiadores,
              lideranças e comunicação em um único lugar.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feat) => (
              <div
                key={feat.title}
                className="group rounded-2xl border border-brand-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-brand hover:border-brand-200"
              >
                <span className="text-3xl">{feat.icon}</span>
                <h3 className="mt-4 text-base font-bold text-slate-900">{feat.title}</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          COMO FUNCIONA — 3 passos
         ══════════════════════════════════════════════════════════ */}
      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="font-display text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Como funciona
            </h2>
            <p className="mt-3 text-slate-500">
              Simples, rápido e direto — em três passos você já faz parte da campanha.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {howItWorks.map((step, idx) => (
              <div key={step.step} className="relative text-center">
                {/* Linha conectora */}
                {idx < howItWorks.length - 1 && (
                  <div className="absolute top-8 left-[calc(50%+2.5rem)] hidden h-px w-[calc(100%-5rem)] bg-gradient-to-r from-brand-200 to-transparent sm:block" />
                )}
                <div className="relative inline-flex h-16 w-16 items-center justify-center rounded-2xl gradient-brand shadow-brand text-2xl">
                  {step.icon}
                  <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-700 text-[10px] font-black text-white border-2 border-white">
                    {step.step}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          CTA FINAL
         ══════════════════════════════════════════════════════════ */}
      <section className="gradient-hero px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
            Faça parte da mudança que a{' '}
            <span className="text-accent-400">{CAMPAIGN.region}</span>{' '}
            precisa
          </h2>
          <p className="mt-4 text-white/70 text-base">
            Cada apoiador fortalece a campanha. Cadastre-se agora e ajude Paula Quintanilha
            a chegar mais longe.
          </p>
          <Link href="/cadastro" className="mt-8 inline-block">
            <button className="rounded-xl bg-white px-8 py-3.5 text-base font-bold text-brand-700 shadow-brand-lg transition-all hover:bg-brand-50 hover:-translate-y-0.5">
              💪 Quero apoiar agora
            </button>
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FOOTER
         ══════════════════════════════════════════════════════════ */}
      <footer className="border-t border-slate-100 bg-white px-4 py-8">
        <div className="mx-auto max-w-6xl flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-brand">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            </div>
            <span className="text-sm font-bold text-brand-700">Conecta Eleitor</span>
          </div>
          <p className="text-xs text-slate-400 text-center">
            © {CAMPAIGN.year} Conecta Eleitor · Campanha de {CAMPAIGN.candidateName} · Todos os direitos reservados
          </p>
          <div className="flex gap-4 text-xs text-slate-400">
            <Link href="/login" className="hover:text-brand-600 transition-colors">Entrar</Link>
            <Link href="/cadastro" className="hover:text-brand-600 transition-colors">Cadastrar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

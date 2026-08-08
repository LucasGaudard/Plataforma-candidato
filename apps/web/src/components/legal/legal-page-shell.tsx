import Image from 'next/image';
import Link from 'next/link';
import { LEGAL_DOCUMENTS, LEGAL_LAST_UPDATED } from '@/lib/legal';

type LegalPageShellProps = {
  document: (typeof LEGAL_DOCUMENTS)[keyof typeof LEGAL_DOCUMENTS];
  eyebrow: string;
  introduction: string;
  children: React.ReactNode;
};

export function LegalPageShell({ document, eyebrow, introduction, children }: LegalPageShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" aria-label="Voltar à página inicial do Conecta Eleitor" className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-4">
            <Image src="/Images/conecta-eleitor-horizontal.png" alt="Conecta Eleitor" width={190} height={52} className="h-auto w-36 sm:w-44" priority />
          </Link>
          <Link href="/" className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">
            Voltar ao início
          </Link>
        </div>
      </header>

      <main>
        <section className="gradient-hero text-white">
          <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-pink-100">{eyebrow}</p>
            <h1 className="max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl">{document.title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-pink-50 sm:text-lg">{introduction}</p>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-pink-100">
              <span>{document.title} {document.version}</span>
              <span aria-hidden="true">•</span>
              <span>Última atualização: {LEGAL_LAST_UPDATED}</span>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-5xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:py-16">
          <article className="legal-content min-w-0 space-y-10">{children}</article>
          <aside className="lg:order-last" aria-label="Documentos legais">
            <nav className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
              <h2 className="text-base font-bold text-slate-900">Documentos legais</h2>
              <ul className="mt-3 space-y-1">
                {Object.values(LEGAL_DOCUMENTS).map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={item.href === document.href ? 'page' : undefined}
                      className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${item.href === document.href ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-7 text-sm text-slate-600 sm:px-8 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} Conecta Eleitor</span>
          <span>Informação clara, privacidade e respeito ao titular.</span>
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">{title}</h2>
      <div className="mt-4 space-y-4 text-base leading-7 text-slate-700">{children}</div>
    </section>
  );
}

'use client';

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-accent-50 px-4">
      <section className="w-full max-w-lg rounded-2xl border border-brand-100 bg-white p-8 text-center shadow-brand sm:p-10">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl gradient-brand text-3xl text-white"
          aria-hidden="true"
        >
          !
        </div>

        <h1 className="mt-6 text-2xl font-bold text-brand-900 sm:text-3xl">
          Você está sem conexão
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          Verifique sua internet e tente novamente. Algumas informações do
          Conecta Eleitor precisam de conexão para serem atualizadas.
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          Tentar novamente
        </button>
      </section>
    </main>
  );
}

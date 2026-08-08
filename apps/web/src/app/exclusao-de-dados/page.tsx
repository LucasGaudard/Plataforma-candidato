import type { Metadata } from 'next';
import { DataDeletionForm } from '@/components/legal/data-deletion-form';
import { LegalPageShell, LegalSection } from '@/components/legal/legal-page-shell';
import { LEGAL_CONTACT_EMAIL, LEGAL_DOCUMENTS } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Exclusão de Dados',
  description: 'Instruções públicas para solicitar a exclusão de dados pessoais tratados pelo Conecta Eleitor.',
};

export default function DataDeletionPage() {
  return (
    <LegalPageShell document={LEGAL_DOCUMENTS.deletion} eyebrow="Direitos do titular" introduction="Você pode solicitar a exclusão dos seus dados pessoais e a interrupção de comunicações seguindo as orientações abaixo.">
      <LegalSection title="1. O que pode ser solicitado">
        <p>Você pode pedir a exclusão dos dados associados ao seu cadastro, como nome, telefone/WhatsApp, e-mail, CPF quando existente, localização, vínculo com campanha, registros de consentimento e outros dados pessoais mantidos na plataforma.</p>
        <p>A solicitação também pode incluir a revogação do consentimento e a interrupção de novas mensagens pelo WhatsApp.</p>
      </LegalSection>

      <LegalSection title="2. Dados que podem precisar ser mantidos">
        <p>Alguns registros poderão ser conservados pelo período necessário para cumprir obrigação legal ou regulatória, exercer direitos, prevenir fraudes, preservar a segurança ou demonstrar o atendimento da própria solicitação. Quando possível, esses dados serão bloqueados, minimizados ou anonimizados.</p>
      </LegalSection>

      <LegalSection title="3. Como solicitar">
        <p>Preencha o formulário abaixo. Informe nome, telefone/WhatsApp e e-mail usados no cadastro e, se souber, a campanha relacionada. Essas informações são necessárias para localizar o registro e evitar a exclusão de dados de outra pessoa.</p>
        <p>O formulário prepara uma mensagem para <a className="font-semibold text-brand-700 underline underline-offset-4" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>. Você deverá revisar e enviar o e-mail no aplicativo de sua preferência. Nenhuma exclusão ocorre automaticamente.</p>
      </LegalSection>

      <DataDeletionForm />

      <LegalSection title="4. Análise e confirmação">
        <p>Após o recebimento, a solicitação será analisada e poderemos pedir informações adicionais estritamente necessárias para confirmar sua identidade e localizar o cadastro. A resposta será fornecida em prazo compatível com a LGPD e com a complexidade do pedido.</p>
        <p>Concluída a análise, você receberá confirmação pelo canal de contato informado, incluindo eventual justificativa sobre dados que precisem ser mantidos.</p>
      </LegalSection>

      <LegalSection title="5. Interrupção imediata de mensagens">
        <p>Para deixar de receber comunicações pelo WhatsApp, utilize opções como <strong>SAIR</strong> ou <strong>NÃO QUERO</strong>, quando disponíveis, ou solicite a interrupção por e-mail. O opt-out pode ser processado antes da conclusão de um pedido mais amplo de exclusão.</p>
      </LegalSection>
    </LegalPageShell>
  );
}

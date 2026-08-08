import type { Metadata } from 'next';
import { LegalPageShell, LegalSection } from '@/components/legal/legal-page-shell';
import { LEGAL_CONTACT_EMAIL, LEGAL_DOCUMENTS } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Saiba como o Conecta Eleitor coleta, utiliza, protege e permite o controle de dados pessoais.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell document={LEGAL_DOCUMENTS.privacy} eyebrow="Privacidade e proteção de dados" introduction="Esta Política explica como dados pessoais podem ser tratados no Conecta Eleitor e como o titular pode exercer seus direitos.">
      <LegalSection title="1. Sobre esta Política">
        <p>O Conecta Eleitor é uma plataforma tecnológica de organização, relacionamento e comunicação para campanhas. O tratamento de dados ocorre conforme a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD), de acordo com o contexto e as finalidades informadas ao titular.</p>
        <p>A campanha à qual o cadastro está vinculado pode atuar como controladora dos dados e definir as finalidades do tratamento. O Conecta Eleitor e seus provedores atuam no suporte tecnológico e operacional, conforme suas respectivas responsabilidades.</p>
      </LegalSection>

      <LegalSection title="2. Dados que podem ser coletados">
        <p>Conforme o formulário, a campanha e a forma de uso da plataforma, podemos tratar:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>nome, telefone/WhatsApp, e-mail e CPF, quando solicitado;</li>
          <li>data de nascimento, quando aplicável;</li>
          <li>cidade, estado, bairro e zona;</li>
          <li>vínculo com campanha, coordenador ou líder;</li>
          <li>status de cadastro e de confirmação por WhatsApp;</li>
          <li>data e registro do consentimento; e</li>
          <li>dados técnicos mínimos de acesso e operação, como data, horário, registros de segurança e informações necessárias ao funcionamento do serviço.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Finalidades do tratamento">
        <p>Os dados podem ser utilizados para realizar o cadastro, identificar o vínculo com a campanha, organizar apoiadores, enviar comunicações autorizadas, confirmar consentimento por WhatsApp e gerenciar eventos, informações e atualizações.</p>
        <p>Também podem ser tratados para prevenir fraudes e abusos, cumprir obrigações legais ou regulatórias, proteger direitos e manter a segurança, a integridade e o funcionamento do sistema.</p>
      </LegalSection>

      <LegalSection title="4. Bases legais e consentimento">
        <p>O tratamento poderá se apoiar no consentimento do titular e, conforme o caso concreto, no cumprimento de obrigação legal ou regulatória, no exercício regular de direitos e em outras bases previstas na LGPD.</p>
        <p>Quando o tratamento depender de consentimento, ele deverá ser livre, informado e relacionado às finalidades apresentadas. O titular pode revogá-lo a qualquer momento, sem afetar tratamentos realizados validamente antes da revogação.</p>
      </LegalSection>

      <LegalSection title="5. Uso do WhatsApp">
        <p>A plataforma utiliza a WhatsApp Cloud API, fornecida pela Meta, para enviar mensagens vinculadas à campanha. As comunicações somente devem ser enviadas quando houver consentimento ou outra autorização válida.</p>
        <p>Uma resposta pelo botão <strong>SIM</strong> pode registrar a confirmação do consentimento. O titular pode deixar de receber mensagens usando opções de saída como <strong>SAIR</strong> ou <strong>NÃO QUERO</strong>, quando disponíveis, ou entrando em contato conosco.</p>
      </LegalSection>

      <LegalSection title="6. Compartilhamento de dados">
        <p>Os dados podem ser acessados ou compartilhados, no limite necessário, com a campanha cadastrada; administradores, coordenadores, líderes e outros operadores autorizados; Meta/WhatsApp; provedores de hospedagem, banco de dados, infraestrutura e serviços essenciais ao funcionamento da plataforma.</p>
        <p>Também poderá haver compartilhamento com autoridades públicas quando exigido por lei, ordem válida ou para o exercício regular de direitos. Não comercializamos dados pessoais.</p>
      </LegalSection>

      <LegalSection title="7. Armazenamento, segurança e retenção">
        <p>Os dados são armazenados em infraestrutura tecnológica contratada, incluindo serviços de hospedagem e banco de dados. São adotadas medidas técnicas e administrativas razoáveis para reduzir riscos de acesso não autorizado, perda, alteração ou divulgação indevida. Nenhum ambiente digital, contudo, é totalmente imune a incidentes.</p>
        <p>Os dados serão mantidos pelo tempo necessário às finalidades informadas, ao relacionamento com a campanha e ao cumprimento de obrigações legais, regulatórias, de auditoria, segurança ou exercício de direitos. Depois, poderão ser eliminados ou anonimizados, conforme aplicável.</p>
      </LegalSection>

      <LegalSection title="8. Direitos do titular">
        <p>Nos termos da LGPD, o titular pode solicitar confirmação da existência de tratamento, acesso, correção, portabilidade quando aplicável, anonimização, bloqueio ou exclusão de dados desnecessários ou tratados em desconformidade, informação sobre compartilhamentos e revogação do consentimento.</p>
        <p>O exercício de alguns direitos pode depender da validação da identidade e observar hipóteses legais de conservação. Para solicitar exclusão, consulte a <a className="font-semibold text-brand-700 underline decoration-brand-200 underline-offset-4 hover:text-brand-900" href="/exclusao-de-dados">página de Exclusão de Dados</a>.</p>
      </LegalSection>

      <LegalSection title="9. Contato e atualizações">
        <p>Dúvidas, pedidos ou solicitações sobre dados pessoais podem ser enviados para <a className="font-semibold text-brand-700 underline underline-offset-4" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>. Poderemos solicitar informações adicionais para localizar o cadastro e confirmar a identidade do solicitante.</p>
        <p>Esta Política pode ser atualizada para refletir mudanças legais, operacionais ou tecnológicas. A versão e a data mais recentes serão sempre indicadas no início desta página.</p>
      </LegalSection>
    </LegalPageShell>
  );
}

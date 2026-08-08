import type { Metadata } from 'next';
import { LegalPageShell, LegalSection } from '@/components/legal/legal-page-shell';
import { LEGAL_CONTACT_EMAIL, LEGAL_DOCUMENTS } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description: 'Conheça as condições e responsabilidades para utilização da plataforma Conecta Eleitor.',
};

export default function TermsPage() {
  return (
    <LegalPageShell document={LEGAL_DOCUMENTS.terms} eyebrow="Condições de utilização" introduction="Estes Termos apresentam as regras essenciais para o uso responsável, seguro e autorizado do Conecta Eleitor.">
      <LegalSection title="1. Aceitação e finalidade">
        <p>Ao acessar ou utilizar o Conecta Eleitor, o usuário declara ter lido e concordado com estes Termos e com a Política de Privacidade. Caso não concorde, não deverá utilizar a plataforma.</p>
        <p>O Conecta Eleitor é uma plataforma tecnológica para organização de campanhas, equipes, apoiadores, eventos, informações e comunicações autorizadas. A plataforma não é órgão público, não representa a Justiça Eleitoral e não garante candidatura, votação ou qualquer resultado eleitoral.</p>
      </LegalSection>

      <LegalSection title="2. Cadastro e responsabilidades do usuário">
        <p>O usuário deve fornecer dados verdadeiros, completos e atualizados, proteger suas credenciais e comunicar suspeitas de uso indevido. É responsável pelas atividades realizadas em sua conta quando decorrentes de sua ação ou omissão.</p>
        <p>Não é permitido inserir dados falsos, praticar fraude, personificar terceiros, violar direitos, tentar acessar áreas sem autorização, comprometer a segurança ou utilizar a plataforma para qualquer finalidade ilícita.</p>
      </LegalSection>

      <LegalSection title="3. Responsabilidades das campanhas e operadores">
        <p>Administradores de campanha, coordenadores, líderes e demais operadores autorizados devem utilizar dados pessoais apenas para as finalidades legítimas e informadas, respeitando a LGPD, estes Termos, as permissões de acesso e as regras eleitorais aplicáveis.</p>
        <p>Comunicações, inclusive pelo WhatsApp, devem respeitar o consentimento e pedidos de interrupção. Solicitações de saída ou opt-out devem ser observadas, e o acesso aos dados deve se limitar ao necessário para cada função.</p>
      </LegalSection>

      <LegalSection title="4. Regras de uso e suspensão">
        <p>É proibido usar a plataforma para spam, assédio, discriminação, desinformação deliberada, coleta indevida de dados, envio de conteúdo ilegal ou violação de direitos de terceiros. Também é vedado contornar controles de segurança ou prejudicar a disponibilidade do serviço.</p>
        <p>O uso indevido, a violação destes Termos, riscos à segurança ou exigências legais podem resultar em limitação, bloqueio ou exclusão de acesso, de forma proporcional e observadas as circunstâncias aplicáveis.</p>
      </LegalSection>

      <LegalSection title="5. Disponibilidade e serviços de terceiros">
        <p>Buscamos manter a plataforma disponível e segura, mas podem ocorrer manutenções, atualizações, indisponibilidades ou falhas. Serviços de terceiros — como Meta, WhatsApp, Vercel, Render, Neon e provedores de internet — podem afetar funcionalidades e disponibilidade.</p>
        <p>Não prometemos funcionamento ininterrupto nem ausência total de erros. Quando possível, serão adotadas medidas razoáveis para restaurar ou preservar o serviço.</p>
      </LegalSection>

      <LegalSection title="6. Propriedade intelectual">
        <p>A plataforma, sua marca, interface, textos institucionais, software e demais elementos próprios são protegidos pela legislação aplicável. O acesso não transfere direitos de propriedade intelectual nem autoriza cópia, exploração ou modificação fora das permissões concedidas.</p>
        <p>Conteúdos inseridos pelas campanhas permanecem sob responsabilidade de seus respectivos titulares e devem respeitar direitos autorais, de imagem, de marca e outros direitos de terceiros.</p>
      </LegalSection>

      <LegalSection title="7. Limitações de responsabilidade">
        <p>A plataforma fornece recursos tecnológicos de apoio e não substitui assessoria jurídica, eleitoral ou de proteção de dados. Cada usuário e campanha permanece responsável por suas decisões, conteúdos, comunicações e pelo cumprimento da legislação.</p>
        <p>Eventuais responsabilidades serão avaliadas conforme a legislação aplicável, a participação de cada parte e as circunstâncias concretas, sem exclusões ou limitações vedadas por lei.</p>
      </LegalSection>

      <LegalSection title="8. Privacidade, alterações e legislação">
        <p>O tratamento de dados pessoais é descrito na <a className="font-semibold text-brand-700 underline decoration-brand-200 underline-offset-4 hover:text-brand-900" href="/politica-de-privacidade">Política de Privacidade</a>. Estes Termos podem ser atualizados por razões legais, operacionais ou tecnológicas; a versão vigente e sua data estarão indicadas nesta página.</p>
        <p>Aplicam-se as leis da República Federativa do Brasil. Dúvidas podem ser encaminhadas para <a className="font-semibold text-brand-700 underline underline-offset-4" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.</p>
      </LegalSection>
    </LegalPageShell>
  );
}

import type { CampaignContent, PublicCampaignSummary } from '@platform/types';

export const campaignContentDefaults: CampaignContent = {
  heroTitle: 'Juntos por uma campanha mais próxima das pessoas',
  heroSubtitle: 'Participe, acompanhe e ajude a construir novas possibilidades.',
  heroDescription: 'Conheça nossas propostas, eventos e formas de participar.',
  ctaTitle: 'Faça parte desta campanha',
  ctaDescription: 'Cadastre-se para receber novidades e participar das próximas ações.',
  ctaButtonText: 'Quero participar',
  aboutTitle: 'Sobre a campanha',
  aboutText: 'Uma campanha baseada em diálogo, participação e compromisso com as pessoas.',
  proposalTitle: 'Nossas propostas',
  proposalItems: [
    { title: 'Participação', description: 'Mais diálogo e participação popular nas decisões.' },
    { title: 'Desenvolvimento', description: 'Iniciativas que gerem oportunidades e desenvolvimento local.' },
    { title: 'Serviços públicos', description: 'Compromisso com serviços públicos acessíveis e eficientes.' },
    { title: 'Transparência', description: 'Comunicação clara, responsabilidade e prestação de contas.' },
  ],
  areasTitle: 'Áreas de atuação',
  areaItems: ['Educação', 'Saúde', 'Desenvolvimento', 'Segurança', 'Cultura', 'Meio ambiente'],
  bannerImageUrl: null,
  footerText: 'Todos os direitos reservados.',
  showHero: true, showAbout: true, showProposals: true, showAreas: true, showContact: true,
};

export function resolveCampaignContent(campaign: PublicCampaignSummary): CampaignContent {
  return {
    ...campaignContentDefaults,
    ...Object.fromEntries(Object.entries(campaignContentDefaults).map(([key, fallback]) => [
      key, campaign[key as keyof CampaignContent] ?? fallback,
    ])),
  } as CampaignContent;
}

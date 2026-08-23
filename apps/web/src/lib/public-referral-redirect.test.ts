import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  PUBLIC_REFERRAL_SUCCESS_URL,
  redirectAfterPublicReferralRegistration,
} from './public-referral-redirect';

test('redireciona o cadastro público por indicação para o Instagram na mesma aba', () => {
  const assignedUrls: string[] = [];

  redirectAfterPublicReferralRegistration({
    assign(url) {
      assignedUrls.push(url);
    },
  });

  assert.deepEqual(assignedUrls, [PUBLIC_REFERRAL_SUCCESS_URL]);
  assert.equal(PUBLIC_REFERRAL_SUCCESS_URL, 'https://www.instagram.com/paulaquintanilha/');
});

test('líder e coordenador compartilham o redirect, sem alcançar o cadastro geral', () => {
  const referralPage = readFileSync(
    new URL('../components/campaign/referral-registration-page.tsx', import.meta.url),
    'utf8',
  );
  const generalRegistrationPage = readFileSync(
    new URL('../app/campanhas/[campaignSlug]/cadastro/page.tsx', import.meta.url),
    'utf8',
  );

  assert.match(referralPage, /redirectAfterPublicReferralRegistration\(\)/);
  assert.match(referralPage, /referrerType: 'leader' \| 'coordinator'/);
  assert.doesNotMatch(generalRegistrationPage, /redirectAfterPublicReferralRegistration/);
});

test('a página compartilhada contém identidade, banner, apresentação, convite e formulário', () => {
  const referralPage = readFileSync(
    new URL('../components/campaign/referral-registration-page.tsx', import.meta.url),
    'utf8',
  );

  assert.match(referralPage, /\/Images\/conecta-eleitor-horizontal\.png/);
  assert.match(referralPage, /alt="Conecta Eleitor"/);
  assert.match(referralPage, /\/Images\/paula-quintanilha\.png/);
  assert.match(referralPage, /alt="Paula Quintanilha, candidata a deputada estadual, número 22252"/);
  assert.doesNotMatch(referralPage, /Trabalho que transforma\. Experiência para fazer ainda mais\./);
  assert.match(referralPage, /Paula Quintanilha é vereadora, mãe, esposa, empresária e engenheira química formada pela UFRRJ\./);
  assert.match(referralPage, /Você recebeu um convite de:/);
  assert.match(referralPage, /referrerType === 'leader'/);
  assert.match(referralPage, /Coordenador da campanha/);
  assert.match(referralPage, /<SupporterForm/);
});

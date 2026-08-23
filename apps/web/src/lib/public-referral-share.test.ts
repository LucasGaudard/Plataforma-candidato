import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildPublicReferralInvitation,
  buildPublicReferralWhatsappUrl,
  openPublicReferralInvitation,
  PUBLIC_REFERRAL_WHATSAPP_WINDOW_NAME,
} from './public-referral-share';

const leaderLink = 'https://conecta.example/campanhas/paula-2026/lider/joao-silva';
const coordinatorLink = 'https://conecta.example/campanhas/paula-2026/coordenador/maria-coordenadora';

test('líder recebe convite com nome próprio, campaignSlug e link individual exato', () => {
  const message = buildPublicReferralInvitation('João da Silva', leaderLink);
  assert.match(message, /Eu sou João da Silva/);
  assert.match(message, /cadastro é opcional/);
  assert.equal(message.includes(leaderLink), true);
  assert.equal(message.includes('/campanhas/paula-2026/'), true);
  assert.equal(message.includes(coordinatorLink), false);
});

test('coordenador recebe convite com nome e link próprios', () => {
  const message = buildPublicReferralInvitation('Maria da Conceição', coordinatorLink);
  assert.match(message, /Eu sou Maria da Conceição/);
  assert.equal(message.includes(coordinatorLink), true);
  assert.equal(message.includes(leaderLink), false);
});

test('URL do WhatsApp codifica acentos, emoji e preserva quebras de linha', () => {
  const message = buildPublicReferralInvitation('João', leaderLink);
  const url = buildPublicReferralWhatsappUrl('João', leaderLink);
  assert.match(url, /^https:\/\/wa\.me\/\?text=/);
  assert.match(url, /Jo%C3%A3o/);
  assert.match(url, /%F0%9F%98%8A/);
  assert.match(url, /%0A%0A/);
  assert.equal(decodeURIComponent(url.split('?text=')[1]), message);
});

test('fallback abre WhatsApp preenchido sem enviar mensagem automaticamente', () => {
  const calls: Array<{ url: string; target: string; features?: string }> = [];
  const result = openPublicReferralInvitation('João', leaderLink, {
    open: (url, target, features) => {
      calls.push({ url, target, features });
      return { opener: {} };
    },
  });
  assert.equal(result, 'OPENED');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].target, PUBLIC_REFERRAL_WHATSAPP_WINDOW_NAME);
  assert.match(calls[0].url, /^https:\/\/wa\.me\/\?text=/);
  assert.equal(calls[0].features, 'noopener,noreferrer');
});

test('cartão compartilhado mantém copiar link e não usa APIs de comunicação ou Meta', () => {
  const card = readFileSync(new URL('../components/dashboard/referral-link-card.tsx', import.meta.url), 'utf8');
  const leader = readFileSync(new URL('../components/dashboard/leader-dashboard.tsx', import.meta.url), 'utf8');
  const coordinator = readFileSync(new URL('../components/dashboard/coordinator-dashboard.tsx', import.meta.url), 'utf8');
  assert.match(card, /navigator\.clipboard\.writeText\(referralLink\)/);
  assert.match(card, /Compartilhar convite/);
  assert.match(leader, /ReferralLinkCard/);
  assert.match(coordinator, /ReferralLinkCard/);
  for (const source of [card, leader, coordinator]) {
    assert.doesNotMatch(source, /manual-communications|createManualCommunication|Meta|Cloud API/);
  }
});

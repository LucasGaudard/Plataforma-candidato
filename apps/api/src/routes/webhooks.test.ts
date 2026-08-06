import { createHmac } from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeBrazilianPhone, normalizeBrazilianPhoneForSending } from '@platform/utils';
import { parseWhatsAppReply, validSignature } from './webhooks';
import { blocksConfirmationRetry } from '../services/whatsapp.service';
import { WhatsAppMessageStatus } from '@prisma/client';

test('normaliza telefone brasileiro para comparação e envio', () => {
  assert.equal(normalizeBrazilianPhone('(11) 99999-1234'), '11999991234');
  assert.equal(normalizeBrazilianPhone('5511999991234'), '11999991234');
  assert.equal(normalizeBrazilianPhoneForSending('(11) 99999-1234'), '5511999991234');
  assert.equal(normalizeBrazilianPhoneForSending('5511999991234'), '5511999991234');
  assert.equal(normalizeBrazilianPhone('123'), null);
});

test('confirma somente resposta de botão SIM', () => {
  assert.equal(parseWhatsAppReply({ type: 'button', button: { text: 'SIM' } }).confirms, true);
  assert.equal(parseWhatsAppReply({ type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: 'SIM', title: 'Sim' } } }).confirms, true);
  assert.equal(parseWhatsAppReply({ type: 'text', text: { body: 'sim' } }).confirms, false);
  assert.equal(parseWhatsAppReply({ type: 'button', button: { text: 'Talvez' } }).confirms, false);
});

test('reconhece opt-out explícito com ou sem acento', () => {
  for (const response of ['SAIR', 'NÃO', 'NAO', 'NÃO QUERO', 'NAO QUERO']) {
    assert.equal(parseWhatsAppReply({ type: 'text', text: { body: response } }).optsOut, true);
  }
});

test('bloqueia duplicidade pendente ou enviada, mas permite retry após falha', () => {
  assert.equal(blocksConfirmationRetry(WhatsAppMessageStatus.QUEUED), true);
  assert.equal(blocksConfirmationRetry(WhatsAppMessageStatus.SENT), true);
  assert.equal(blocksConfirmationRetry(WhatsAppMessageStatus.DELIVERED), true);
  assert.equal(blocksConfirmationRetry(WhatsAppMessageStatus.READ), true);
  assert.equal(blocksConfirmationRetry(WhatsAppMessageStatus.FAILED), false);
});

test('valida assinatura e rejeita assinatura inválida', () => {
  const previousSecret = process.env.META_APP_SECRET;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.META_APP_SECRET = 'test-secret';
  process.env.NODE_ENV = 'production';
  try {
    const body = Buffer.from('{"object":"whatsapp_business_account"}');
    const signature = `sha256=${createHmac('sha256', 'test-secret').update(body).digest('hex')}`;
    assert.equal(validSignature(body, signature), true);
    assert.equal(validSignature(body, 'sha256=invalid'), false);
  } finally {
    if (previousSecret === undefined) delete process.env.META_APP_SECRET;
    else process.env.META_APP_SECRET = previousSecret;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

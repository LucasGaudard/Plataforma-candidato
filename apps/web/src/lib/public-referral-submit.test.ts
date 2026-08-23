import assert from 'node:assert/strict';
import test from 'node:test';
import { submitPublicReferralRegistration } from './public-referral-submit';

const payload = {
  firstName: 'Maria',
  lastName: 'Silva',
  phone: '21999990000',
  city: 'Seropedica',
  state: 'RJ',
  neighborhood: 'Centro',
  lgpdConsent: true,
};

test('sucesso real via lider executa a acao pos-cadastro', async () => {
  const calls: string[] = [];
  await submitPublicReferralRegistration({
    createSupporter: async () => { calls.push('api'); },
    createCoordinatorSupporter: async () => assert.fail('endpoint incorreto'),
  }, {
    campaignSlug: 'campanha', referrerSlug: 'lider', referrerType: 'leader', payload,
  }, () => calls.push('redirect'));
  assert.deepEqual(calls, ['api', 'redirect']);
});

test('sucesso real via coordenador usa o endpoint correto', async () => {
  const calls: string[] = [];
  await submitPublicReferralRegistration({
    createSupporter: async () => assert.fail('endpoint incorreto'),
    createCoordinatorSupporter: async () => { calls.push('api'); },
  }, {
    campaignSlug: 'campanha', referrerSlug: 'coordenador', referrerType: 'coordinator', payload,
  }, () => calls.push('redirect'));
  assert.deepEqual(calls, ['api', 'redirect']);
});

for (const status of [400, 409, 429, 500]) {
  test(`erro HTTP ${status} nao executa redirect`, async () => {
    let redirected = false;
    const error = Object.assign(new Error('falha'), { status });
    await assert.rejects(() => submitPublicReferralRegistration({
      createSupporter: async () => { throw error; },
      createCoordinatorSupporter: async () => { throw error; },
    }, {
      campaignSlug: 'campanha', referrerSlug: 'lider', referrerType: 'leader', payload,
    }, () => { redirected = true; }), error);
    assert.equal(redirected, false);
  });
}

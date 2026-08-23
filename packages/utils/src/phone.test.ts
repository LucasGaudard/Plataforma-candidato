import assert from 'node:assert/strict';
import test from 'node:test';
import { isValidBrazilianMobilePhone, normalizeBrazilianPhone } from './phone';
import { validateSupporterInput } from './validation';

test('aceita celular brasileiro válido com ou sem DDI', () => {
  assert.equal(isValidBrazilianMobilePhone('(21) 96950-1194'), true);
  assert.equal(isValidBrazilianMobilePhone('+55 21 96950-1194'), true);
  assert.equal(normalizeBrazilianPhone('+55 21 96950-1194'), '21969501194');
});

test('validação pública exige celular estruturalmente válido', () => {
  const base = { firstName: 'Maria', lastName: 'Silva', city: 'Seropédica', state: 'RJ', lgpdConsent: true };
  assert.equal(validateSupporterInput({ ...base, phone: '2132650119' }).valid, false);
  assert.equal(validateSupporterInput({ ...base, phone: '21969501194' }).valid, true);
});

test('rejeita DDD inexistente, fixo, repetição e sequência artificial', () => {
  assert.equal(isValidBrazilianMobilePhone('00969501194'), false);
  assert.equal(isValidBrazilianMobilePhone('2132650119'), false);
  assert.equal(isValidBrazilianMobilePhone('11999999999'), false);
  assert.equal(isValidBrazilianMobilePhone('01234567890'), false);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  changeSupporterFilterState,
  clearSupporterFilters,
  normalizeSupporterFilters,
} from './supporter-filter-state';

test('filtros combinados são preservados e a busca é aparada', () => {
  assert.deepEqual(normalizeSupporterFilters({
    search: '  Maria  ',
    state: 'RJ',
    city: 'Rio de Janeiro',
    neighborhood: 'Centro',
    zone: 'NORTH',
  }), {
    search: 'Maria',
    state: 'RJ',
    city: 'Rio de Janeiro',
    neighborhood: 'Centro',
    zone: 'NORTH',
  });
});

test('trocar estado limpa cidade e bairro dependentes', () => {
  const changed = changeSupporterFilterState({
    search: 'Maria', state: 'RJ', city: 'Rio de Janeiro', neighborhood: 'Centro', zone: 'NORTH',
  }, 'SP');
  assert.equal(changed.state, 'SP');
  assert.equal(changed.city, '');
  assert.equal(changed.neighborhood, '');
  assert.equal(changed.search, 'Maria');
  assert.equal(changed.zone, 'NORTH');
});

test('limpar remove todos os filtros', () => {
  assert.deepEqual(clearSupporterFilters(), {
    search: '', city: '', state: '', neighborhood: '', zone: '',
  });
});

test('a lista atualiza ao voltar para a aba depois de cadastro externo', () => {
  const page = readFileSync(new URL('../app/dashboard/apoiadores/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /window\.addEventListener\('focus', refreshOnFocus\)/);
  assert.match(page, /document\.addEventListener\('visibilitychange', refreshWhenVisible\)/);
  assert.match(page, /window\.removeEventListener\('focus', refreshOnFocus\)/);
});

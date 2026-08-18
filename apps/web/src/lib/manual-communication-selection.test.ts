import assert from 'node:assert/strict';
import test from 'node:test';
import { updateManualSelection } from './manual-communication-selection';

test('seleção individual e de página preserva IDs escolhidos em outras páginas', () => {
  const firstPage = updateManualSelection(new Set(), ['a', 'b'], true);
  const secondPage = updateManualSelection(firstPage, ['c', 'd'], true);
  assert.deepEqual([...secondPage], ['a', 'b', 'c', 'd']);
  assert.deepEqual([...updateManualSelection(secondPage, ['a', 'b'], false)], ['c', 'd']);
});

test('seleção individual não duplica ID', () => {
  assert.deepEqual([...updateManualSelection(new Set(['a']), ['a'], true)], ['a']);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { manualSelectionCount, updateManualSelection } from './manual-communication-selection';

test('seleção individual e de página preserva IDs escolhidos em outras páginas', () => {
  const firstPage = updateManualSelection(new Set(), ['a', 'b'], true);
  const secondPage = updateManualSelection(firstPage, ['c', 'd'], true);
  assert.deepEqual([...secondPage], ['a', 'b', 'c', 'd']);
  assert.deepEqual([...updateManualSelection(secondPage, ['a', 'b'], false)], ['c', 'd']);
});

test('seleção individual não duplica ID', () => {
  assert.deepEqual([...updateManualSelection(new Set(['a']), ['a'], true)], ['a']);
});

test('contagem permanece zero sem seleção e respeita FIRST e ALL_FILTERED', () => {
  assert.equal(manualSelectionCount('IDS', 100, new Set(), 0), 0);
  assert.equal(manualSelectionCount('FIRST', 10, new Set(), 25), 10);
  assert.equal(manualSelectionCount('ALL_FILTERED', 312, new Set(), 0), 312);
});

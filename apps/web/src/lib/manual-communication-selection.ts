export function updateManualSelection(
  current: ReadonlySet<string>,
  ids: string[],
  selected: boolean,
): Set<string> {
  const next = new Set(current);
  for (const id of ids) selected ? next.add(id) : next.delete(id);
  return next;
}

export function manualSelectionCount(
  mode: 'IDS' | 'FIRST' | 'ALL_FILTERED',
  eligible: number,
  selectedIds: ReadonlySet<string>,
  firstCount: number,
): number {
  if (mode === 'ALL_FILTERED') return eligible;
  if (mode === 'FIRST') return Math.min(firstCount, eligible);
  return selectedIds.size;
}

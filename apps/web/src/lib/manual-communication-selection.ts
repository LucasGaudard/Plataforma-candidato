export function updateManualSelection(
  current: ReadonlySet<string>,
  ids: string[],
  selected: boolean,
): Set<string> {
  const next = new Set(current);
  for (const id of ids) selected ? next.add(id) : next.delete(id);
  return next;
}

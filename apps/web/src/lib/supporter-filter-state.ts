export type SupporterFilterValues = {
  search: string;
  city: string;
  state: string;
  neighborhood: string;
  zone: string;
};

export const EMPTY_SUPPORTER_FILTERS: SupporterFilterValues = {
  search: '',
  city: '',
  state: '',
  neighborhood: '',
  zone: '',
};

export function normalizeSupporterFilters(filters: SupporterFilterValues): SupporterFilterValues {
  return { ...filters, search: filters.search.trim() };
}

export function changeSupporterFilterState(
  filters: SupporterFilterValues,
  state: string,
): SupporterFilterValues {
  return { ...filters, state, city: '', neighborhood: '' };
}

export function clearSupporterFilters(): SupporterFilterValues {
  return { ...EMPTY_SUPPORTER_FILTERS };
}

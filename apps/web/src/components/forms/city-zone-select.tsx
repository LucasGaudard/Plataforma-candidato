import type { CityZone } from '@platform/types';
import { CITY_ZONE_OPTIONS } from '@platform/utils';
import { Select } from '@platform/ui';

interface CityZoneSelectProps {
  value?: CityZone | null;
  onChange: (value: CityZone | undefined) => void;
  error?: string;
  disabled?: boolean;
}

export function CityZoneSelect({ value, onChange, error, disabled }: CityZoneSelectProps) {
  return (
    <Select
      label="Zona (Opcional)"
      name="zone"
      value={value || ''}
      onChange={(event) => onChange((event.target.value || undefined) as CityZone | undefined)}
      error={error}
      disabled={disabled}
      options={[{ value: '', label: 'Zona não informada' }, ...CITY_ZONE_OPTIONS]}
    />
  );
}

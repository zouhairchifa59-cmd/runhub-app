export const formatDistanceDisplay = (
  value?: string | number | null
): string => {
  if (value === undefined || value === null) return '—';

  const raw = String(value).trim();

  if (!raw) return '—';

  const digits = raw.replace(/[^0-9]/g, '');

  if (!digits) return '—';

  return `${digits} KM`;
};

export const formatPaceDisplay = (value?: string | null): string => {
  if (!value) return '—';

  const raw = String(value).trim();

  if (!raw) return '—';

  const match = raw.match(/^(\d{1,2}):(\d{2})/);

  if (match) {
    return `${match[1]}:${match[2]} min/km`;
  }

  if (raw.includes('min/km')) return raw;

  return `${raw} min/km`;
};
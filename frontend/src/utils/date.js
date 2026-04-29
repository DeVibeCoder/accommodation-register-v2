export function toIsoDate(value) {
  const text = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

export function formatDisplayDate(value, fallback = '-') {
  const iso = toIsoDate(value);
  if (iso) {
    const [year, month, day] = iso.split('-');
    return `${day}/${month}/${year}`;
  }

  if (!value) return fallback;

  try {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(value);
  }
}

export function formatDisplayDateTime(value, fallback = '-') {
  if (!value) return fallback;

  try {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);

    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    const hours = String(parsed.getHours()).padStart(2, '0');
    const minutes = String(parsed.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return String(value);
  }
}
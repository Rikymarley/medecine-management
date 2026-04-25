export const minutesAgo = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.round(diffMs / 60000));
};

export const minutesUntil = (iso: string) => {
  const diffMs = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.round(diffMs / 60000));
};

export const formatDateTime = (iso: string) => {
  const raw = String(iso ?? '').trim();
  if (!raw) {
    return '';
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }
  const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const monthLabel = monthShort[date.getMonth()] ?? String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}/${monthLabel}/${year} ${hours}:${minutes}:${seconds}`;
};

export const formatDateHaiti = (isoDate: string) => {
  const raw = String(isoDate ?? '').trim();
  if (!raw) {
    return '';
  }

  const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Keep calendar dates stable (avoid timezone shift for YYYY-MM-DD / midnight UTC).
  const stableDateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.\d+)?Z)?$/);
  if (stableDateMatch) {
    const [, year, month, day] = stableDateMatch;
    const monthIndex = Number(month) - 1;
    const monthLabel = monthShort[monthIndex] ?? month;
    return `${day}/${monthLabel}/${year}`;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }
  const day = String(date.getDate()).padStart(2, '0');
  const monthLabel = monthShort[date.getMonth()] ?? String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${monthLabel}/${year}`;
};

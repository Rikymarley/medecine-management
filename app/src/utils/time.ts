export const minutesAgo = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.round(diffMs / 60000));
};

export const minutesUntil = (iso: string) => {
  const diffMs = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.round(diffMs / 60000));
};

export const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleString('fr-FR');
};

export const formatDateHaiti = (isoDate: string) => {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

export const maskHaitiPhone = (value: string): string => {
  const raw = (value ?? '').trim();
  if (!raw) {
    return '';
  }

  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('509')) {
    digits = digits.slice(3);
  }
  digits = digits.slice(0, 8);

  if (!digits) {
    return '+509-';
  }
  if (digits.length <= 4) {
    return `+509-${digits}`;
  }
  return `+509-${digits.slice(0, 4)}-${digits.slice(4)}`;
};


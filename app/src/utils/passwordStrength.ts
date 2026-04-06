export type PasswordStrength = {
  label: 'Faible' | 'Moyen' | 'Fort';
  color: 'danger' | 'warning' | 'success';
  score: number;
};

export const getPasswordStrength = (password: string): PasswordStrength => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score >= 5) {
    return { label: 'Fort', color: 'success', score };
  }
  if (score >= 3) {
    return { label: 'Moyen', color: 'warning', score };
  }
  return { label: 'Faible', color: 'danger', score };
};


export const OTHER_SPECIALTY_VALUE = '__other__';

export const DOCTOR_SPECIALTY_OPTIONS = [
  'Anesthesie-Reanimation',
  'Cardiologie',
  'Chirurgie generale',
  'Dermatologie',
  'Endocrinologie',
  'Gynecologie-Obstetrique',
  'Infectiologie',
  'Medecine generale',
  'Medecine interne',
  'Neurologie',
  'Ophtalmologie',
  'ORL',
  'Orthopedie',
  'Pediatrie',
  'Physiotherapie',
  'Psychiatrie',
  'Radiologie',
  'Urologie'
] as const;

const normalizeSpecialty = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const parseDoctorSpecialty = (
  value: string | null | undefined,
  options: readonly string[] = DOCTOR_SPECIALTY_OPTIONS
) => {
  const raw = (value ?? '').trim();
  if (!raw) {
    return { selected: '', custom: '' };
  }

  const known = options.find(
    (option) => normalizeSpecialty(option) === normalizeSpecialty(raw)
  );

  if (known) {
    return { selected: known, custom: '' };
  }

  return { selected: OTHER_SPECIALTY_VALUE, custom: raw };
};

export const buildDoctorSpecialty = (selected: string, custom: string) => {
  if (!selected) {
    return '';
  }
  if (selected === OTHER_SPECIALTY_VALUE) {
    return custom.trim();
  }
  return selected.trim();
};

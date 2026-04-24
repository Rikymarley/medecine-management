const VISIT_TYPE_LABELS: Record<string, string> = {
  consultation: 'Consultation',
  follow_up: 'Suivi',
  emergency: 'Urgence',
  teleconsultation: 'Téléconsultation',
  rehab_follow_up: 'Suivi de rééducation',
};

export const getVisitTypeLabel = (value: string | null | undefined): string => {
  const key = (value ?? '').trim().toLowerCase();
  if (!key) {
    return 'Consultation';
  }
  return VISIT_TYPE_LABELS[key] ?? value?.trim() ?? 'Consultation';
};


export const prescriptionStatusLabel: Record<string, string> = {
  pending: 'En attente',
  sent_to_pharmacies: 'Envoyee aux pharmacies',
  partially_available: 'Partiellement disponible',
  available: 'Disponible',
  expired: 'Expiree',
  completed: 'Completee'
};

const statusTone: Record<string, string> = {
  pending: 'pending',
  sent_to_pharmacies: 'sent',
  partially_available: 'partial',
  available: 'available',
  expired: 'expired',
  completed: 'completed'
};

export const getPrescriptionStatusLabel = (status: string) =>
  prescriptionStatusLabel[status] ?? status;

export const getPrescriptionStatusClassName = (status: string) => {
  const tone = statusTone[status] ?? 'pending';
  return `status-badge status-${tone}`;
};

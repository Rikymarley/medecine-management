import { ApiPrescription } from '../services/api';

export const getPrescriptionCode = (
  prescription: Pick<ApiPrescription, 'id' | 'print_code'> | null | undefined
): string => {
  if (!prescription) {
    return '';
  }
  return prescription.print_code?.trim() ? prescription.print_code : String(prescription.id);
};


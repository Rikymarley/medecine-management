import { ApiPrescription } from '../services/api';

export const getPrescriptionCode = (
  prescription: Pick<ApiPrescription, 'id' | 'print_code' | 'prescription_code'> | null | undefined
): string => {
  if (!prescription) {
    return '';
  }
  if (prescription.prescription_code?.trim()) {
    return prescription.prescription_code;
  }
  if (prescription.print_code?.trim()) {
    return prescription.print_code;
  }
  return String(prescription.id);
};

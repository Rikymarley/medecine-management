export type Role = 'doctor' | 'pharmacy' | 'patient';

export type AvailabilityStatus = 'available' | 'low' | 'equivalent' | 'not_available';

export interface MedicineRequest {
  id: string;
  name: string;
  strength: string;
  form: string;
  genericAllowed: boolean;
  conversionAllowed: boolean;
}

export interface Prescription {
  id: string;
  patientName: string;
  doctorName: string;
  createdAt: string;
  medicineRequests: MedicineRequest[];
}

export interface Pharmacy {
  id: string;
  name: string;
  distanceKm: number;
  reliabilityScore: number;
  openNow: boolean;
}

export interface PharmacyResponse {
  id: string;
  prescriptionId: string;
  medicineRequestId: string;
  pharmacyId: string;
  status: AvailabilityStatus;
  timestamp: string;
  expiresAt: string;
}

export interface AppState {
  role: Role | null;
  prescriptions: Prescription[];
  pharmacies: Pharmacy[];
  responses: PharmacyResponse[];
}

export type CreatePrescriptionInput = {
  patientName: string;
  doctorName: string;
  medicineRequests: MedicineRequest[];
};

export type RespondToMedicineInput = {
  prescriptionId: string;
  medicineRequestId: string;
  pharmacyId: string;
  status: AvailabilityStatus;
  expiresAtMinutes: number;
};

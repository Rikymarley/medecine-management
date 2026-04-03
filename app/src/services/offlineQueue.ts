import { api, ApiPharmacyResponse } from './api';

const PHARMACY_RESPONSE_OUTBOX_KEY = 'offline-outbox-pharmacy-responses-v1';
const PATIENT_PURCHASE_OUTBOX_KEY = 'offline-outbox-patient-purchases-v1';

type PharmacyResponseOutboxItem = {
  id: string;
  created_at: string;
  payload: {
    pharmacy_id: number;
    prescription_id: number;
    medicine_request_id: number;
    status: ApiPharmacyResponse['status'];
    expires_at_minutes: number;
  };
};

type PatientPurchaseOutboxItem = {
  id: string;
  created_at: string;
  payload: {
    prescription_id: number;
    medicine_request_id: number;
    pharmacy_id: number;
    purchased: boolean;
    quantity?: number;
  };
};

const readOutbox = (): PharmacyResponseOutboxItem[] => {
  const raw = localStorage.getItem(PHARMACY_RESPONSE_OUTBOX_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as PharmacyResponseOutboxItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(PHARMACY_RESPONSE_OUTBOX_KEY);
    return [];
  }
};

const writeOutbox = (items: PharmacyResponseOutboxItem[]) => {
  localStorage.setItem(PHARMACY_RESPONSE_OUTBOX_KEY, JSON.stringify(items));
};

const dedupeKey = (item: PharmacyResponseOutboxItem['payload']) =>
  `${item.pharmacy_id}-${item.prescription_id}-${item.medicine_request_id}`;

const readPatientPurchaseOutbox = (): PatientPurchaseOutboxItem[] => {
  const raw = localStorage.getItem(PATIENT_PURCHASE_OUTBOX_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as PatientPurchaseOutboxItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(PATIENT_PURCHASE_OUTBOX_KEY);
    return [];
  }
};

const writePatientPurchaseOutbox = (items: PatientPurchaseOutboxItem[]) => {
  localStorage.setItem(PATIENT_PURCHASE_OUTBOX_KEY, JSON.stringify(items));
};

const patientPurchaseDedupeKey = (item: PatientPurchaseOutboxItem['payload']) =>
  `${item.prescription_id}-${item.pharmacy_id}-${item.medicine_request_id}`;

export const getPendingPharmacyResponseCount = () => readOutbox().length;
export const getPendingPatientPurchaseCount = () => readPatientPurchaseOutbox().length;

export const enqueuePharmacyResponse = (payload: PharmacyResponseOutboxItem['payload']) => {
  const current = readOutbox();
  const key = dedupeKey(payload);
  const filtered = current.filter((row) => dedupeKey(row.payload) !== key);
  filtered.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    created_at: new Date().toISOString(),
    payload
  });
  writeOutbox(filtered);
  return filtered.length;
};

export const enqueuePatientPurchase = (payload: PatientPurchaseOutboxItem['payload']) => {
  const current = readPatientPurchaseOutbox();
  const key = patientPurchaseDedupeKey(payload);
  const filtered = current.filter((row) => patientPurchaseDedupeKey(row.payload) !== key);
  filtered.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    created_at: new Date().toISOString(),
    payload
  });
  writePatientPurchaseOutbox(filtered);
  return filtered.length;
};

export const flushPharmacyResponsesOutbox = async (token: string): Promise<number> => {
  const queue = readOutbox();
  if (queue.length === 0) {
    return 0;
  }

  const remaining: PharmacyResponseOutboxItem[] = [];
  for (const item of queue) {
    try {
      await api.createPharmacyResponse(token, item.payload);
    } catch {
      remaining.push(item);
    }
  }
  writeOutbox(remaining);
  return remaining.length;
};

export const flushPatientPurchasesOutbox = async (token: string): Promise<number> => {
  const queue = readPatientPurchaseOutbox();
  if (queue.length === 0) {
    return 0;
  }

  const groupedByPrescription = new Map<number, PatientPurchaseOutboxItem['payload'][]>();
  queue.forEach((item) => {
    const rows = groupedByPrescription.get(item.payload.prescription_id) ?? [];
    rows.push(item.payload);
    groupedByPrescription.set(item.payload.prescription_id, rows);
  });

  const remaining: PatientPurchaseOutboxItem[] = [];

  for (const [prescriptionId, items] of groupedByPrescription.entries()) {
    try {
      await api.setPatientMedicinePurchasesBatch(token, {
        prescription_id: prescriptionId,
        items
      });
    } catch {
      items.forEach((payload) => {
        remaining.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          created_at: new Date().toISOString(),
          payload
        });
      });
    }
  }

  writePatientPurchaseOutbox(remaining);
  return remaining.length;
};

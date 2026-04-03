import { api, ApiEmergencyContact, ApiFamilyMember, ApiPharmacyResponse } from './api';

const PHARMACY_RESPONSE_OUTBOX_KEY = 'offline-outbox-pharmacy-responses-v1';
const PATIENT_PURCHASE_OUTBOX_KEY = 'offline-outbox-patient-purchases-v1';
const PATIENT_PRESCRIPTION_STATUS_OUTBOX_KEY = 'offline-outbox-patient-prescription-status-v1';
const PATIENT_EMERGENCY_CONTACT_OUTBOX_KEY = 'offline-outbox-patient-emergency-contacts-v1';
const PATIENT_FAMILY_MEMBER_OUTBOX_KEY = 'offline-outbox-patient-family-members-v1';

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

type PatientPrescriptionStatusOutboxItem = {
  id: string;
  created_at: string;
  payload: {
    prescription_id: number;
    action: 'complete' | 'reopen';
  };
};

type EmergencyContactMutationPayload = {
  op: 'create' | 'update' | 'delete';
  local_id: number;
  data?: {
    name: string;
    phone: string;
    category: ApiEmergencyContact['category'];
    city?: string | null;
    department?: string | null;
    address?: string | null;
    available_hours?: string | null;
    priority?: number | null;
    is_24_7?: boolean;
    is_favorite?: boolean;
    notes?: string | null;
  };
};

type FamilyMemberMutationPayload = {
  op: 'create' | 'update' | 'delete';
  local_id: number;
  data?: {
    name: string;
    age?: number | null;
    date_of_birth?: string | null;
    gender?: ApiFamilyMember['gender'];
    relationship?: ApiFamilyMember['relationship'];
    allergies?: string | null;
    chronic_diseases?: string | null;
    blood_type?: ApiFamilyMember['blood_type'];
    emergency_notes?: string | null;
    weight_kg?: number | null;
    height_cm?: number | null;
    surgical_history?: string | null;
    vaccination_up_to_date?: boolean | null;
    primary_caregiver?: boolean;
  };
};

type EmergencyContactOutboxItem = {
  id: string;
  created_at: string;
  payload: EmergencyContactMutationPayload;
};

type FamilyMemberOutboxItem = {
  id: string;
  created_at: string;
  payload: FamilyMemberMutationPayload;
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

const readPatientPrescriptionStatusOutbox = (): PatientPrescriptionStatusOutboxItem[] => {
  const raw = localStorage.getItem(PATIENT_PRESCRIPTION_STATUS_OUTBOX_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as PatientPrescriptionStatusOutboxItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(PATIENT_PRESCRIPTION_STATUS_OUTBOX_KEY);
    return [];
  }
};

const writePatientPrescriptionStatusOutbox = (items: PatientPrescriptionStatusOutboxItem[]) => {
  localStorage.setItem(PATIENT_PRESCRIPTION_STATUS_OUTBOX_KEY, JSON.stringify(items));
};

const readEmergencyContactOutbox = (): EmergencyContactOutboxItem[] => {
  const raw = localStorage.getItem(PATIENT_EMERGENCY_CONTACT_OUTBOX_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as EmergencyContactOutboxItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(PATIENT_EMERGENCY_CONTACT_OUTBOX_KEY);
    return [];
  }
};

const writeEmergencyContactOutbox = (items: EmergencyContactOutboxItem[]) => {
  localStorage.setItem(PATIENT_EMERGENCY_CONTACT_OUTBOX_KEY, JSON.stringify(items));
};

const readFamilyMemberOutbox = (): FamilyMemberOutboxItem[] => {
  const raw = localStorage.getItem(PATIENT_FAMILY_MEMBER_OUTBOX_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as FamilyMemberOutboxItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(PATIENT_FAMILY_MEMBER_OUTBOX_KEY);
    return [];
  }
};

const writeFamilyMemberOutbox = (items: FamilyMemberOutboxItem[]) => {
  localStorage.setItem(PATIENT_FAMILY_MEMBER_OUTBOX_KEY, JSON.stringify(items));
};

const patientPurchaseDedupeKey = (item: PatientPurchaseOutboxItem['payload']) =>
  `${item.prescription_id}-${item.pharmacy_id}-${item.medicine_request_id}`;

export const getPendingPharmacyResponseCount = () => readOutbox().length;
export const getPendingPatientPurchaseCount = () => readPatientPurchaseOutbox().length;
export const getPendingPatientPrescriptionStatusCount = () => readPatientPrescriptionStatusOutbox().length;
export const getPendingEmergencyContactMutationCount = () => readEmergencyContactOutbox().length;
export const getPendingFamilyMemberMutationCount = () => readFamilyMemberOutbox().length;
export const getPendingFamilyMemberMutationStateById = (): Record<number, 'create' | 'update' | 'delete'> => {
  const state: Record<number, 'create' | 'update' | 'delete'> = {};
  readFamilyMemberOutbox().forEach((item) => {
    state[item.payload.local_id] = item.payload.op;
  });
  return state;
};

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

export const enqueuePatientPrescriptionStatus = (
  payload: PatientPrescriptionStatusOutboxItem['payload']
) => {
  const current = readPatientPrescriptionStatusOutbox();
  const filtered = current.filter((row) => row.payload.prescription_id !== payload.prescription_id);
  filtered.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    created_at: new Date().toISOString(),
    payload
  });
  writePatientPrescriptionStatusOutbox(filtered);
  return filtered.length;
};

export const enqueueEmergencyContactMutation = (payload: EmergencyContactMutationPayload) => {
  const current = readEmergencyContactOutbox();

  if (payload.op === 'delete') {
    const withoutSame = current.filter((row) => row.payload.local_id !== payload.local_id);
    // No need to keep a delete for unsynced new record.
    if (payload.local_id < 0) {
      writeEmergencyContactOutbox(withoutSame);
      return withoutSame.length;
    }
    withoutSame.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      created_at: new Date().toISOString(),
      payload
    });
    writeEmergencyContactOutbox(withoutSame);
    return withoutSame.length;
  }

  const key = `${payload.local_id}-${payload.op}`;
  const filtered = current.filter((row) => `${row.payload.local_id}-${row.payload.op}` !== key);
  filtered.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    created_at: new Date().toISOString(),
    payload
  });
  writeEmergencyContactOutbox(filtered);
  return filtered.length;
};

export const enqueueFamilyMemberMutation = (payload: FamilyMemberMutationPayload) => {
  const current = readFamilyMemberOutbox();

  if (payload.op === 'delete') {
    const withoutSame = current.filter((row) => row.payload.local_id !== payload.local_id);
    if (payload.local_id < 0) {
      writeFamilyMemberOutbox(withoutSame);
      return withoutSame.length;
    }
    withoutSame.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      created_at: new Date().toISOString(),
      payload
    });
    writeFamilyMemberOutbox(withoutSame);
    return withoutSame.length;
  }

  const key = `${payload.local_id}-${payload.op}`;
  const filtered = current.filter((row) => `${row.payload.local_id}-${row.payload.op}` !== key);
  filtered.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    created_at: new Date().toISOString(),
    payload
  });
  writeFamilyMemberOutbox(filtered);
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

export const flushPatientPrescriptionStatusOutbox = async (token: string): Promise<number> => {
  const queue = readPatientPrescriptionStatusOutbox();
  if (queue.length === 0) {
    return 0;
  }

  const remaining: PatientPrescriptionStatusOutboxItem[] = [];
  for (const item of queue) {
    try {
      if (item.payload.action === 'complete') {
        await api.completePrescriptionAsPatient(token, item.payload.prescription_id);
      } else {
        await api.reopenPrescriptionAsPatient(token, item.payload.prescription_id);
      }
    } catch {
      remaining.push(item);
    }
  }

  writePatientPrescriptionStatusOutbox(remaining);
  return remaining.length;
};

export const flushEmergencyContactMutationsOutbox = async (token: string): Promise<number> => {
  const queue = readEmergencyContactOutbox();
  if (queue.length === 0) {
    return 0;
  }

  const tempIdMap = new Map<number, number>();
  const remaining: EmergencyContactOutboxItem[] = [];

  for (const item of queue) {
    try {
      const payload = { ...item.payload };
      const resolvedId = tempIdMap.get(payload.local_id) ?? payload.local_id;

      if (payload.op === 'create') {
        if (!payload.data) {
          continue;
        }
        const created = await api.createPatientEmergencyContact(token, payload.data);
        if (payload.local_id < 0) {
          tempIdMap.set(payload.local_id, created.id);
        }
        continue;
      }

      if (payload.op === 'update') {
        if (!payload.data || resolvedId < 1) {
          continue;
        }
        await api.updatePatientEmergencyContact(token, resolvedId, payload.data);
        continue;
      }

      if (payload.op === 'delete') {
        if (resolvedId < 1) {
          continue;
        }
        await api.deletePatientEmergencyContact(token, resolvedId);
      }
    } catch {
      remaining.push(item);
    }
  }

  writeEmergencyContactOutbox(remaining);
  return remaining.length;
};

export const flushFamilyMemberMutationsOutbox = async (token: string): Promise<number> => {
  const queue = readFamilyMemberOutbox();
  if (queue.length === 0) {
    return 0;
  }

  const tempIdMap = new Map<number, number>();
  const remaining: FamilyMemberOutboxItem[] = [];

  for (const item of queue) {
    try {
      const payload = { ...item.payload };
      const resolvedId = tempIdMap.get(payload.local_id) ?? payload.local_id;

      if (payload.op === 'create') {
        if (!payload.data) {
          continue;
        }
        const created = await api.createPatientFamilyMember(token, payload.data);
        if (payload.local_id < 0) {
          tempIdMap.set(payload.local_id, created.id);
        }
        continue;
      }

      if (payload.op === 'update') {
        if (!payload.data || resolvedId < 1) {
          continue;
        }
        await api.updatePatientFamilyMember(token, resolvedId, payload.data);
        continue;
      }

      if (payload.op === 'delete') {
        if (resolvedId < 1) {
          continue;
        }
        await api.deletePatientFamilyMember(token, resolvedId);
      }
    } catch {
      remaining.push(item);
    }
  }

  writeFamilyMemberOutbox(remaining);
  return remaining.length;
};

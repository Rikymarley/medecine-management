const API_URL = import.meta.env.VITE_API_URL ?? '/api';
const DEFAULT_GET_CACHE_TTL_MS = 30_000;

type RequestOptions = RequestInit & {
  token?: string;
  cacheTtlMs?: number;
  bypassCache?: boolean;
  dedupe?: boolean;
};

type CachedEntry = {
  expiresAt: number;
  payload: unknown;
};

const getResponseCache = new Map<string, CachedEntry>();
const inFlightGetRequests = new Map<string, Promise<unknown>>();

const makeGetCacheKey = (path: string, options: RequestOptions): string => {
  const tokenPart = options.token ?? 'anonymous';
  return `${tokenPart}::${path}`;
};

const getApiOrigin = (): string | null => {
  try {
    if (/^https?:\/\//i.test(API_URL)) {
      return new URL(API_URL).origin;
    }
  } catch {
    // ignore and fallback below
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return null;
};

const normalizeStorageUrl = (value: string): string => {
  const apiOrigin = getApiOrigin();
  if (value.startsWith('/storage/')) {
    return apiOrigin ? `${apiOrigin}${value}` : value;
  }
  const match = value.match(/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(\/storage\/.+)$/i);
  if (!match) {
    return value;
  }
  return apiOrigin ? `${apiOrigin}${match[1]}` : value;
};

const normalizePayloadStorageUrls = <T>(payload: T): T => {
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizePayloadStorageUrls(item)) as T;
  }
  if (payload && typeof payload === 'object') {
    const next: Record<string, unknown> = {};
    Object.entries(payload as Record<string, unknown>).forEach(([key, value]) => {
      next[key] = normalizePayloadStorageUrls(value);
    });
    return next as T;
  }
  if (typeof payload === 'string') {
    return normalizeStorageUrl(payload) as T;
  }
  return payload;
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const method = (options.method ?? 'GET').toUpperCase();
  const isGetRequest = method === 'GET';
  const cacheKey = isGetRequest ? makeGetCacheKey(path, options) : null;
  const shouldUseCache = isGetRequest && !options.bypassCache;
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_GET_CACHE_TTL_MS;
  const shouldDedupe = options.dedupe !== false;

  if (cacheKey && shouldUseCache) {
    const cached = getResponseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.payload as T;
    }
    if (cached) {
      getResponseCache.delete(cacheKey);
    }
    if (shouldDedupe) {
      const inFlight = inFlightGetRequests.get(cacheKey);
      if (inFlight) {
        return (await inFlight) as T;
      }
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const fetchPromise = (async () => {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message = errorBody.message ?? 'Echec de la requete';
      console.error('[API ERROR]', {
        url: `${API_URL}${path}`,
        method,
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      });
      throw new Error(message);
    }

    const body = normalizePayloadStorageUrls(await response.json()) as T;

    if (cacheKey && shouldUseCache && cacheTtlMs > 0) {
      getResponseCache.set(cacheKey, {
        expiresAt: Date.now() + cacheTtlMs,
        payload: body
      });
    }

    if (!isGetRequest) {
      // Conservative invalidation: mutating requests can make many cached GET payloads stale.
      getResponseCache.clear();
    }

    return body;
  })();

  if (cacheKey && shouldUseCache && shouldDedupe) {
    inFlightGetRequests.set(cacheKey, fetchPromise as Promise<unknown>);
  }

  try {
    return await fetchPromise;
  } finally {
    if (cacheKey && shouldUseCache && shouldDedupe) {
      inFlightGetRequests.delete(cacheKey);
    }
  }
};

const requestFormData = async <T>(path: string, formData: FormData, token?: string): Promise<T> => {
  const headers: Record<string, string> = {
    Accept: 'application/json'
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.message ?? 'Echec de la requete';
    console.error('[API ERROR]', {
      url: `${API_URL}${path}`,
      method: 'POST',
      status: response.status,
      statusText: response.statusText,
      body: errorBody
    });
    throw new Error(message);
  }

  const body = await response.json();
  getResponseCache.clear();
  return normalizePayloadStorageUrls(body) as T;
};

export type ApiUser = {
  id: number;
  name: string;
  email: string;
  photo_url?: string | null;
  phone: string | null;
  ninu: string | null;
  date_of_birth: string | null;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  specialty: string | null;
  city: string | null;
  department: string | null;
  languages: string | null;
  teleconsultation_available: boolean;
  consultation_hours: string | null;
  license_number: string | null;
  license_verified: boolean;
  can_verify_accounts: boolean;
  license_verified_at: string | null;
  license_verified_by_doctor_id: number | null;
  license_verification_notes: string | null;
  years_experience: number | null;
  consultation_fee_range: string | null;
  whatsapp: string | null;
  recovery_whatsapp?: string | null;
  bio: string | null;
  profile_photo_url: string | null;
  profile_banner_url: string | null;
  id_document_url?: string | null;
  claim_token?: string | null;
  claim_token_expires_at?: string | null;
  claimed_at?: string | null;
  age: number | null;
  gender: 'male' | 'female' | null;
  allergies: string | null;
  chronic_diseases: string | null;
  blood_type: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null;
  emergency_notes: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  surgical_history: string | null;
  vaccination_up_to_date: boolean | null;
  role: 'doctor' | 'pharmacy' | 'patient' | 'admin' | 'hopital' | 'laboratoire' | 'secretaire';
  account_status?: 'active' | 'provisional' | 'blocked';
  blocked_by?: number | null;
  blocked_at?: string | null;
  blocked_by_name?: string | null;
  delegated_by?: number | null;
  delegated_at?: string | null;
  delegated_by_name?: string | null;
  created_by_doctor_id?: number | null;
  pharmacy_id: number | null;
  verification_status: 'pending' | 'approved' | 'rejected';
  verified_at: string | null;
  verified_by: number | null;
  verification_notes: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  license_verified_by_doctor_name?: string | null;
};

export type ApiAuthResponse = {
  token: string;
  user: ApiUser;
};

export type ApiClaimResolveResponse = {
  type: 'patient' | 'family_member';
  family_member_id?: number;
  patient_user_id?: number;
  name: string;
  date_of_birth: string | null;
};

export type ApiPasswordResetWhatsappResponse = {
  message: string;
  whatsapp_url: string | null;
  expires_in_minutes?: number;
  stage?: 'approval_requested' | 'approval_pending' | 'approved_send_reset' | 'missing_recovery_whatsapp' | string;
};

export type ApiRecoveryApprovalResolveResponse = {
  status: 'pending' | 'approved' | 'denied' | string;
  user_name?: string | null;
  target_whatsapp_masked?: string | null;
  expires_at?: string | null;
  message?: string;
};

export type ApiPasswordResetResolveResponse = {
  status: 'valid' | string;
  expires_at?: string | null;
  message?: string;
};

export type ApiDoctorSpecialty = {
  id: number;
  name: string;
};

export type ApiPharmacy = {
  id: number;
  name: string;
  pharmacy_mode: 'quick_manual' | 'pos_integrated';
  phone: string | null;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  open_now: boolean;
  opening_hours: string | null;
  opening_hours_json: Array<{
    day: string;
    open: boolean;
    from: string;
    to: string;
  }> | null;
  closes_at: string | null;
  temporary_closed: boolean;
  emergency_available: boolean;
  last_status_updated_at: string | null;
  services: string | null;
  payment_methods: string | null;
  price_range: 'low' | 'medium' | 'high' | null;
  average_wait_time: number | null;
  delivery_available: boolean;
  delivery_radius_km: string | null;
  night_service: boolean;
  license_number: string | null;
  license_verified: boolean;
  license_verified_at: string | null;
  license_verified_by_doctor_id: number | null;
  license_verification_notes: string | null;
  license_verified_by_doctor_name?: string | null;
  account_verification_status?: 'pending' | 'approved' | 'rejected' | null;
  account_status?: 'active' | 'provisional' | 'blocked' | null;
  account_can_verify_accounts?: boolean | null;
  pharmacy_user_id?: number | null;
  pharmacy_user_name?: string | null;
  pharmacy_user_email?: string | null;
  recovery_whatsapp?: string | null;
  account_verified_at?: string | null;
  account_verified_by?: number | null;
  account_verified_by_name?: string | null;
  account_verification_notes?: string | null;
  blocked_by?: number | null;
  blocked_at?: string | null;
  blocked_by_name?: string | null;
  delegated_by?: number | null;
  delegated_at?: string | null;
  delegated_by_name?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  logo_url: string | null;
  storefront_image_url: string | null;
  notes_for_patients: string | null;
  last_confirmed_stock_time: string | null;
  reliability_score: number;
};

export type ApiMedicine = {
  id: number;
  name: string;
  generic_name: string | null;
  strength: string | null;
  form: string | null;
  category: 'standard' | 'complementaire' | 'supplementaire';
  is_active: boolean;
  notes: string | null;
};

export type ApiMedicineRequest = {
  id: number;
  prescription_id: number;
  name: string;
  strength: string | null;
  form: string | null;
  quantity: number;
  expiry_date: string | null;
  duration_days: number | null;
  daily_dosage: number | null;
  notes: string | null;
  generic_allowed: boolean;
  conversion_allowed: boolean;
};

export type ApiPharmacyResponse = {
  id: number;
  pharmacy_id: number;
  prescription_id: number;
  medicine_request_id: number;
  status: 'out_of_stock' | 'very_low' | 'low' | 'available' | 'high' | 'equivalent' | 'not_available';
  responded_at: string;
  expires_at: string;
};

export type ApiPrescription = {
  id: number;
  doctor_user_id: number | null;
  patient_user_id: number | null;
  family_member_id: number | null;
  patient_name: string;
  patient_phone?: string | null;
  doctor_name: string;
  source?: 'app' | 'paper';
  status: string;
  requested_at: string;
  qr_token?: string | null;
  print_code?: string | null;
  prescription_code?: string | null;
  printed_at?: string | null;
  print_count?: number;
  doctor?: {
    id: number;
    name: string;
    phone: string | null;
    address: string | null;
    latitude: string | null;
    longitude: string | null;
    specialty: string | null;
    city: string | null;
    department: string | null;
    languages: string | null;
    teleconsultation_available: boolean;
    consultation_hours: string | null;
    license_number: string | null;
    license_verified: boolean;
    years_experience: number | null;
    consultation_fee_range: string | null;
    whatsapp: string | null;
    bio: string | null;
    profile_photo_url: string | null;
    profile_banner_url: string | null;
  } | null;
  patient?: {
    id: number;
    name: string;
    account_status: 'active' | 'provisional';
    created_by_doctor_id: number | null;
    ninu: string | null;
    date_of_birth: string | null;
    phone: string | null;
    profile_photo_url?: string | null;
  } | null;
  familyMember?: {
    id: number;
    name: string;
  } | null;
  family_member?: {
    id: number;
    name: string;
  } | null;
  medicine_requests: ApiMedicineRequest[];
  responses: ApiPharmacyResponse[];
};

export type ApiDoctorPatient = {
  id: number;
  doctor_user_id: number;
  name: string;
  phone: string | null;
  ninu: string | null;
  date_of_birth: string | null;
  address: string | null;
  age: number | null;
  gender: 'male' | 'female' | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiDoctorPatientAvailability = {
  available: boolean;
  count: number;
  matches: Array<{
    id: number;
    name: string;
    phone: string | null;
    ninu: string | null;
    date_of_birth: string | null;
    account_status: 'active' | 'provisional' | 'blocked';
    created_by_doctor_id: number | null;
  }>;
};

export type ApiDoctorPatientAccessStatus = {
  has_link: boolean;
  has_pending_request: boolean;
  is_blocked?: boolean;
};

export type ApiDoctorPatientAccessRequest = {
  id: number;
  doctor_id: number;
  doctor_name: string | null;
  status: 'pending' | 'approved' | 'denied';
  message: string | null;
  response_message: string | null;
  responded_at: string | null;
  created_at: string;
  is_blocked?: boolean;
  whatsapp_url?: string | null;
};

export type ApiSecretaryLookup = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  account_status: string | null;
  verification_status: string | null;
};

export type ApiDoctorSecretaryAccessStatus = {
  has_link: boolean;
  has_pending_request: boolean;
};

export type ApiDoctorSecretaryAccessRequest = {
  id: number;
  doctor_id: number;
  doctor_name: string | null;
  secretary_id: number;
  secretary_name: string | null;
  status: 'pending' | 'approved' | 'denied';
  message: string | null;
  response_message: string | null;
  responded_at: string | null;
  created_at: string;
  whatsapp_url?: string | null;
};

export type ApiPrescriptionPrintData = {
  prescription_id: number;
  print_code: string;
  qr_token: string;
  qr_payload: string;
  qr_value: string;
  printed_at: string | null;
  print_count: number;
  patient_name: string;
  patient_phone: string | null;
  doctor_name: string;
  requested_at: string | null;
  family_member_name: string | null;
  medicine_requests: Array<{
    id: number;
    name: string;
    strength: string | null;
    form: string | null;
    quantity: number;
    duration_days: number | null;
    daily_dosage: number | null;
    notes: string | null;
  }>;
};

export type ApiPatientMedicinePurchase = {
  id: number;
  patient_user_id: number;
  prescription_id: number;
  medicine_request_id: number;
  pharmacy_id: number;
  quantity: number;
};

export type ApiPatientMedicineCabinetItem = {
  id: number;
  patient_user_id: number;
  family_member_id: number | null;
  family_member_name: string | null;
  patient_medicine_purchase_id: number | null;
  prescription_id: number | null;
  medicine_request_id: number | null;
  pharmacy_id: number | null;
  pharmacy_name: string | null;
  medication_name: string;
  form: string | null;
  dosage_strength: string | null;
  daily_dosage: number | null;
  quantity: number;
  refill_reminder_days: number;
  reminder_times: string[];
  expiration_date: string | null;
  photo_url: string | null;
  manufacturer: string | null;
  requires_refrigeration: boolean;
  note: string | null;
  doctor_name?: string | null;
  patient_name?: string | null;
  prescription_code?: string | null;
  prescription_requested_at?: string | null;
  treatment_duration_days?: number | null;
  prescription_note?: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiEmergencyContact = {
  id: number;
  patient_user_id: number;
  name: string;
  phone: string;
  category: 'hospital' | 'clinic' | 'laboratory' | 'pharmacy' | 'doctor' | 'ambulance';
  source_type?: 'manual' | 'doctor_user' | 'pharmacy' | 'hospital' | 'laboratory' | null;
  source_id?: number | null;
  added_from_profile?: boolean;
  city: string | null;
  department: string | null;
  address: string | null;
  available_hours: string | null;
  is_24_7: boolean;
  is_favorite: boolean;
  priority: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiFamilyMember = {
  id: number;
  patient_user_id: number;
  linked_user_id?: number | null;
  name: string;
  photo_url?: string | null;
  id_document_url?: string | null;
  claim_token?: string | null;
  claim_token_expires_at?: string | null;
  claimed_at?: string | null;
  archived_at?: string | null;
  age: number | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | null;
  relationship: 'parent' | 'spouse' | 'child' | 'sibling' | 'grandparent' | 'other' | null;
  allergies: string | null;
  chronic_diseases: string | null;
  blood_type: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null;
  emergency_notes: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  surgical_history: string | null;
  vaccination_up_to_date: boolean | null;
  primary_caregiver: boolean;
  created_at: string;
  updated_at: string;
};

export type ApiDoctorPatientProfile = {
  id: number;
  name: string;
  profile_photo_url?: string | null;
  phone: string | null;
  ninu: string | null;
  date_of_birth: string | null;
  whatsapp: string | null;
  address: string | null;
  age: number | null;
  gender: 'male' | 'female' | null;
  allergies: string | null;
  chronic_diseases: string | null;
  surgical_history: string | null;
  blood_type: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null;
  emergency_notes: string | null;
  claim_token?: string | null;
  claim_token_expires_at?: string | null;
  claimed_at?: string | null;
};

export type ApiDoctorDirectory = {
  id: number;
  name: string;
  profile_photo_url?: string | null;
  profile_banner_url?: string | null;
  phone: string | null;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  specialty: string | null;
  city: string | null;
  department: string | null;
  languages: string | null;
  teleconsultation_available: boolean;
  consultation_hours: string | null;
  license_number: string | null;
  license_verified: boolean;
  can_verify_accounts: boolean;
  license_verified_at: string | null;
  license_verified_by_doctor_id: number | null;
  license_verification_notes: string | null;
  license_verified_by_doctor_name?: string | null;
  account_verification_status?: 'pending' | 'approved' | 'rejected' | null;
  account_verified_at?: string | null;
  account_verified_by?: number | null;
  account_verified_by_name?: string | null;
  account_verification_notes?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  years_experience: number | null;
  consultation_fee_range: string | null;
  whatsapp: string | null;
  bio: string | null;
};

export type ApiPatientLookup = {
  id: number;
  name: string;
  phone: string | null;
  ninu: string | null;
  date_of_birth: string | null;
  profile_photo_url?: string | null;
};

export type ApiMedicalHistoryEntry = {
  id: number;
  entry_code: string | null;
  history_code?: string | null;
  patient_user_id: number;
  family_member_id: number | null;
  doctor_user_id: number | null;
  prescription_id: number | null;
  type: 'condition' | 'allergy' | 'surgery' | 'hospitalization' | 'medication' | 'note';
  title: string;
  details: string | null;
  started_at: string | null;
  ended_at: string | null;
  status: 'active' | 'resolved';
  visibility: 'doctor_only' | 'patient_only' | 'shared';
  visit_id?: number | null;
  doctor_name?: string | null;
  family_member_name?: string | null;
  prescription_requested_at?: string | null;
  prescription_print_code?: string | null;
  linked_prescriptions?: Array<{
    id: number;
    print_code: string | null;
    status?: string | null;
    requested_at: string | null;
  }>;
  linked_rehab_entries?: Array<{
    id: number;
    reference: string;
    doctor_user_id: number;
    created_at: string | null;
    sessions_per_week: number | null;
    duration_weeks: number | null;
    goals: string | null;
    exercise_type: string | null;
    exercise_reps: string | null;
    exercise_frequency: string | null;
    exercise_notes: string | null;
    pain_score: number | null;
    mobility_score: string | null;
    progress_notes: string | null;
    follow_up_date: string | null;
  }>;
  can_edit_by_patient?: boolean;
  can_delete_by_patient?: boolean;
  created_at: string;
  updated_at: string;
};

export type ApiVisit = {
  id: number;
  visit_code?: string | null;
  patient_user_id: number;
  family_member_id: number | null;
  doctor_user_id: number;
  visit_date: string | null;
  visit_type: string | null;
  chief_complaint: string | null;
  diagnosis: string | null;
  clinical_notes: string | null;
  treatment_plan: string | null;
  status: string;
  patient_name?: string | null;
  doctor_name?: string | null;
  family_member_name?: string | null;
  linked_prescriptions_count?: number;
  linked_medical_history_count?: number;
  linked_rehab_entries_count?: number;
  created_at: string;
  updated_at: string;
};

export type ApiVisitDetail = ApiVisit & {
  prescriptions: Array<{
    id: number;
    print_code: string | null;
    status: string;
    requested_at: string | null;
    patient_user_id: number;
    doctor_user_id: number;
  }>;
  medical_history_entries: Array<{
    id: number;
    entry_code: string | null;
    title: string;
    type: ApiMedicalHistoryEntry['type'];
    status: ApiMedicalHistoryEntry['status'];
    details: string | null;
    started_at: string | null;
    ended_at: string | null;
    doctor_name: string | null;
    family_member_name: string | null;
  }>;
  rehab_entries: Array<{
    id: number;
    reference: string;
    sessions_per_week: number | null;
    duration_weeks: number | null;
    goals: string | null;
    exercise_type: string | null;
    exercise_reps: string | null;
    exercise_frequency: string | null;
    exercise_notes: string | null;
    pain_score: number | null;
    mobility_score: number | null;
    progress_notes: string | null;
    follow_up_date: string | null;
  }>;
};

export type ApiRehabEntry = {
  id: number;
  patient_user_id: number;
  doctor_user_id: number;
  medical_history_entry_id: number | null;
  prescription_id: number | null;
  visit_id: number | null;
  sessions_per_week: number | null;
  duration_weeks: number | null;
  goals: string | null;
  exercise_type: string | null;
  exercise_reps: string | null;
  exercise_frequency: string | null;
  exercise_notes: string | null;
  pain_score: number | null;
  mobility_score: string | null;
  progress_notes: string | null;
  follow_up_date: string | null;
  medical_history_entry_code?: string | null;
  medical_history_entry_title?: string | null;
  prescription_print_code?: string | null;
  prescription_requested_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiPasswordResetEvent = {
  id: number;
  user_id: number | null;
  action: 'request' | 'complete' | string;
  channel: string;
  identifier_masked: string | null;
  success: boolean;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  user_name?: string | null;
  user_role?: string | null;
  user_email?: string | null;
  created_at: string;
  updated_at: string;
};

export const api = {
  register: (payload: {
    name: string;
    email: string;
    phone?: string;
    ninu?: string;
    specialty?: string;
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
    password: string;
    password_confirmation: string;
    role: 'doctor' | 'pharmacy' | 'patient' | 'hopital' | 'laboratoire' | 'secretaire';
    pharmacy_name?: string;
  }) =>
    request<ApiAuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  login: (payload: { email: string; password: string }) =>
    request<ApiAuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  resolveClaimToken: (token: string) =>
    request<ApiClaimResolveResponse>('/auth/claim/resolve', {
      method: 'POST',
      body: JSON.stringify({ token })
    }),
  claimFamilyMemberAccount: (payload: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
    phone?: string | null;
    whatsapp?: string | null;
  }) =>
    request<ApiAuthResponse & { message?: string }>('/auth/claim/complete', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  requestPasswordResetWhatsappLink: (payload: {
    whatsapp: string;
    ninu: string;
    date_of_birth: string;
  }) =>
    request<ApiPasswordResetWhatsappResponse>('/auth/password-reset/request-whatsapp', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  resolvePasswordResetToken: (payload: { token: string }) =>
    request<ApiPasswordResetResolveResponse>('/auth/password-reset/resolve', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  resolveRecoveryApprovalToken: (payload: { token: string }) =>
    request<ApiRecoveryApprovalResolveResponse>('/auth/password-reset/recovery/resolve', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  decideRecoveryApproval: (payload: { token: string; decision: 'approve' | 'deny'; target_whatsapp?: string }) =>
    request<{ message: string; status: 'approved' | 'denied' | string; whatsapp_url?: string | null; expires_in_minutes?: number }>('/auth/password-reset/recovery/decision', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  completePasswordReset: (payload: {
    token: string;
    password: string;
    password_confirmation: string;
  }) =>
    request<{ message: string }>('/auth/password-reset/complete', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  me: (token: string) => request<ApiUser>('/auth/me', { token }),
  getDoctorSpecialties: () => request<ApiDoctorSpecialty[]>('/doctor-specialties'),
  getDoctorsDirectory: () => request<ApiDoctorDirectory[]>('/doctors'),
  getDoctorsDirectoryForDoctor: (token: string) => request<ApiDoctorDirectory[]>('/doctor/doctors-directory', { token }),
  getDoctorsDirectoryForPharmacy: (token: string) => request<ApiDoctorDirectory[]>('/pharmacy/doctors-directory', { token }),
  updateDoctorProfile: (
    token: string,
    payload: Partial<{
      phone: string | null;
      address: string | null;
      latitude: number | null;
      longitude: number | null;
      specialty: string | null;
      city: string | null;
      department: string | null;
      languages: string | null;
      teleconsultation_available: boolean;
      consultation_hours: string | null;
      license_number: string | null;
      license_verified: boolean;
      years_experience: number | null;
      consultation_fee_range: string | null;
      whatsapp: string | null;
      recovery_whatsapp: string | null;
      bio: string | null;
    }>
  ) =>
    request<ApiUser>('/doctor/me', {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload)
    }),
  updatePatientProfile: (
    token: string,
    payload: Partial<{
      name: string;
      phone: string | null;
      ninu: string | null;
      address: string | null;
      latitude: number | null;
      longitude: number | null;
      whatsapp: string | null;
      recovery_whatsapp: string | null;
      date_of_birth: string | null;
      age: number | null;
      gender: 'male' | 'female' | null;
      allergies: string | null;
      chronic_diseases: string | null;
      blood_type: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null;
      emergency_notes: string | null;
      weight_kg: number | null;
      height_cm: number | null;
      surgical_history: string | null;
      vaccination_up_to_date: boolean | null;
    }>
  ) =>
    request<ApiUser>('/patient/me', {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload)
    }),
  updateSecretaryProfile: (
    token: string,
    payload: Partial<{
      name: string;
      phone: string | null;
      whatsapp: string | null;
      recovery_whatsapp: string | null;
      address: string | null;
      city: string | null;
      department: string | null;
      bio: string | null;
    }>
  ) =>
    request<ApiUser>('/secretaire/me', {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload)
    }),
  logout: (token: string) => request<{ message: string }>('/auth/logout', { method: 'POST', token }),
  changePassword: (
    token: string,
    payload: {
      current_password: string;
      password: string;
      password_confirmation: string;
    }
  ) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload)
    }),
  updateRecoveryWhatsapp: (token: string, recovery_whatsapp: string | null) =>
    request<ApiUser>('/auth/recovery-whatsapp', {
      method: 'PATCH',
      token,
      body: JSON.stringify({ recovery_whatsapp })
    }),
  getPharmacies: () => request<ApiPharmacy[]>('/pharmacies'),
  getPharmaciesForDoctor: (token: string) => request<ApiPharmacy[]>('/doctor/pharmacies-directory', { token }),
  getPharmaciesForPharmacy: (token: string) => request<ApiPharmacy[]>('/pharmacy/pharmacies-directory', { token }),
  getHospitals: () => request<ApiPharmacy[]>('/hospitals'),
  getHospitalsForDoctor: (token: string) => request<ApiPharmacy[]>('/doctor/hospitals-directory', { token }),
  getHospitalsForPharmacy: (token: string) => request<ApiPharmacy[]>('/pharmacy/hospitals-directory', { token }),
  getLaboratories: () => request<ApiPharmacy[]>('/laboratories'),
  getLaboratoriesForDoctor: (token: string) => request<ApiPharmacy[]>('/doctor/laboratories-directory', { token }),
  getLaboratoriesForPharmacy: (token: string) => request<ApiPharmacy[]>('/pharmacy/laboratories-directory', { token }),
  getMyPharmacy: (token: string) => request<ApiPharmacy>('/pharmacy/me', { token }),
  updateMyPharmacy: (
    token: string,
    payload: Partial<{
      pharmacy_mode: ApiPharmacy['pharmacy_mode'];
      phone: string | null;
      address: string | null;
      latitude: string | null;
      longitude: string | null;
      open_now: boolean;
      opening_hours: string | null;
      opening_hours_json: Array<{
        day: string;
        open: boolean;
        from: string;
        to: string;
      }> | null;
      closes_at: string | null;
      temporary_closed: boolean;
      emergency_available: boolean;
      services: string | null;
      payment_methods: string | null;
      price_range: ApiPharmacy['price_range'];
      average_wait_time: number | null;
      delivery_available: boolean;
      delivery_radius_km: number | null;
      night_service: boolean;
      license_number: string | null;
      license_verified: boolean;
      logo_url: string | null;
      storefront_image_url: string | null;
      notes_for_patients: string | null;
      recovery_whatsapp: string | null;
    }>
  ) =>
    request<ApiPharmacy>('/pharmacy/me', {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload)
    }),
  uploadMyPharmacyLogo: (token: string, file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    return requestFormData<ApiPharmacy>('/pharmacy/me/logo', formData, token);
  },
  uploadMyPharmacyStorefrontImage: (token: string, file: File) => {
    const formData = new FormData();
    formData.append('storefront_image', file);
    return requestFormData<ApiPharmacy>('/pharmacy/me/storefront-image', formData, token);
  },
  uploadMyDoctorProfilePhoto: (token: string, file: File) => {
    const formData = new FormData();
    formData.append('profile_photo', file);
    return requestFormData<ApiUser>('/doctor/me/profile-photo', formData, token);
  },
  uploadMyDoctorBanner: (token: string, file: File) => {
    const formData = new FormData();
    formData.append('profile_banner', file);
    return requestFormData<ApiUser>('/doctor/me/profile-banner', formData, token);
  },
  uploadMyPatientProfilePhoto: (token: string, file: File) => {
    const formData = new FormData();
    formData.append('profile_photo', file);
    return requestFormData<ApiUser>('/patient/me/profile-photo', formData, token);
  },
  uploadMySecretaryProfilePhoto: (token: string, file: File) => {
    const formData = new FormData();
    formData.append('profile_photo', file);
    return requestFormData<ApiUser>('/secretaire/me/profile-photo', formData, token);
  },
  uploadMyPatientIdDocument: (token: string, file: File) => {
    const formData = new FormData();
    formData.append('id_document', file);
    return requestFormData<ApiUser>('/patient/me/id-document', formData, token);
  },
  removeMyPatientIdDocument: (token: string) =>
    request<ApiUser>('/patient/me/id-document', {
      method: 'DELETE',
      token
    }),
  verifyDoctorLicense: (
    token: string,
    doctorId: number,
    payload?: { verified?: boolean; notes?: string | null }
  ) =>
    request<ApiDoctorDirectory>(`/doctor/verifications/doctors/${doctorId}/license`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  approveDoctorAccount: (
    token: string,
    doctorUserId: number,
    payload?: { notes?: string | null }
  ) =>
    request<{
      id: number;
      verification_status: 'pending' | 'approved' | 'rejected';
      verified_at: string | null;
      verified_by: number | null;
      verified_by_name?: string | null;
    }>(`/doctor/verifications/doctor-accounts/${doctorUserId}/approve`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  unapproveDoctorAccount: (
    token: string,
    doctorUserId: number,
    payload?: { notes?: string | null }
  ) =>
    request<{
      id: number;
      verification_status: 'pending' | 'approved' | 'rejected';
      verified_at: string | null;
      verified_by: number | null;
      verified_by_name?: string | null;
    }>(`/doctor/verifications/doctor-accounts/${doctorUserId}/unapprove`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  verifyPharmacyLicense: (
    token: string,
    pharmacyId: number,
    payload?: { verified?: boolean; notes?: string | null }
  ) =>
    request<ApiPharmacy>(`/doctor/verifications/pharmacies/${pharmacyId}/license`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  approvePharmacyAccount: (
    token: string,
    pharmacyUserId: number,
    payload?: { notes?: string | null }
  ) =>
    request<{
      id: number;
      verification_status: 'pending' | 'approved' | 'rejected';
      verified_at: string | null;
      verified_by: number | null;
      verified_by_name?: string | null;
    }>(`/doctor/verifications/pharmacy-accounts/${pharmacyUserId}/approve`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  unapprovePharmacyAccount: (
    token: string,
    pharmacyUserId: number,
    payload?: { notes?: string | null }
  ) =>
    request<{
      id: number;
      verification_status: 'pending' | 'approved' | 'rejected';
      verified_at: string | null;
      verified_by: number | null;
      verified_by_name?: string | null;
    }>(`/doctor/verifications/pharmacy-accounts/${pharmacyUserId}/unapprove`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  pharmacyVerifyDoctorLicense: (
    token: string,
    doctorId: number,
    payload?: { verified?: boolean; notes?: string | null }
  ) =>
    request<ApiDoctorDirectory>(`/pharmacy/verifications/doctors/${doctorId}/license`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  pharmacyApproveDoctorAccount: (
    token: string,
    doctorUserId: number,
    payload?: { notes?: string | null }
  ) =>
    request<{
      id: number;
      verification_status: 'pending' | 'approved' | 'rejected';
      verified_at: string | null;
      verified_by: number | null;
      verified_by_name?: string | null;
    }>(`/pharmacy/verifications/doctor-accounts/${doctorUserId}/approve`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  pharmacyUnapproveDoctorAccount: (
    token: string,
    doctorUserId: number,
    payload?: { notes?: string | null }
  ) =>
    request<{
      id: number;
      verification_status: 'pending' | 'approved' | 'rejected';
      verified_at: string | null;
      verified_by: number | null;
      verified_by_name?: string | null;
    }>(`/pharmacy/verifications/doctor-accounts/${doctorUserId}/unapprove`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  pharmacyVerifyPharmacyLicense: (
    token: string,
    pharmacyId: number,
    payload?: { verified?: boolean; notes?: string | null }
  ) =>
    request<ApiPharmacy>(`/pharmacy/verifications/pharmacies/${pharmacyId}/license`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  pharmacyApprovePharmacyAccount: (
    token: string,
    pharmacyUserId: number,
    payload?: { notes?: string | null }
  ) =>
    request<{
      id: number;
      verification_status: 'pending' | 'approved' | 'rejected';
      verified_at: string | null;
      verified_by: number | null;
      verified_by_name?: string | null;
    }>(`/pharmacy/verifications/pharmacy-accounts/${pharmacyUserId}/approve`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  pharmacyUnapprovePharmacyAccount: (
    token: string,
    pharmacyUserId: number,
    payload?: { notes?: string | null }
  ) =>
    request<{
      id: number;
      verification_status: 'pending' | 'approved' | 'rejected';
      verified_at: string | null;
      verified_by: number | null;
      verified_by_name?: string | null;
    }>(`/pharmacy/verifications/pharmacy-accounts/${pharmacyUserId}/unapprove`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  getMedicines: (params?: { q?: string; category?: ApiMedicine['category']; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.category) search.set('category', params.category);
    if (params?.limit) search.set('limit', String(params.limit));
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return request<ApiMedicine[]>(`/medicines${suffix}`);
  },
  getPharmacyPrescriptions: (token: string) =>
    request<ApiPrescription[]>('/prescriptions', { token }),
  getDoctorPrescriptions: (token: string) =>
    request<ApiPrescription[]>('/doctor/prescriptions', { token }),
  searchDoctorPatients: (token: string, q: string, limit = 8) => {
    const search = new URLSearchParams();
    search.set('q', q);
    search.set('limit', String(limit));
    return request<ApiPatientLookup[]>(`/doctor/patients/search?${search.toString()}`, { token });
  },
  getDoctorPatients: (token: string) =>
    request<ApiDoctorPatient[]>('/doctor/patients', { token }),
  checkDoctorPatientAvailability: (
    token: string,
    payload: {
      name?: string;
      phone?: string;
      ninu?: string;
      date_of_birth?: string;
      limit?: number;
    }
  ) => {
    const search = new URLSearchParams();
    if (payload.name) search.set('name', payload.name);
    if (payload.phone) search.set('phone', payload.phone);
    if (payload.ninu) search.set('ninu', payload.ninu);
    if (payload.date_of_birth) search.set('date_of_birth', payload.date_of_birth);
    if (payload.limit) search.set('limit', String(payload.limit));
    return request<ApiDoctorPatientAvailability>(`/doctor/patients/availability?${search.toString()}`, { token });
  },
  createDoctorPatient: (
    token: string,
    payload: {
      name: string;
      phone?: string | null;
      ninu?: string | null;
      date_of_birth?: string | null;
      address?: string | null;
      age?: number | null;
      gender?: 'male' | 'female' | null;
      notes?: string | null;
    }
  ) =>
    request<ApiDoctorPatient>('/doctor/patients', {
      method: 'POST',
      token,
      body: JSON.stringify(payload)
    }),
  updateDoctorPatientBasic: (
    token: string,
    patientId: number,
    payload: Partial<{
      name: string;
      phone: string | null;
      ninu: string | null;
      date_of_birth: string | null;
      address: string | null;
      age: number | null;
      gender: 'male' | 'female' | null;
      notes: string | null;
    }>
  ) =>
    request<ApiDoctorPatient>(`/doctor/patients/${patientId}/basic`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload)
    }),
  getPatientPrescriptions: (token: string, params?: { family_member_id?: number | null }) => {
    const search = new URLSearchParams();
    if (typeof params?.family_member_id === 'number') {
      search.set('family_member_id', String(params.family_member_id));
    }
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return request<ApiPrescription[]>(`/patient/prescriptions${suffix}`, { token });
  },
  createPrescription: (token: string, payload: {
    patient_name: string;
    patient_phone?: string | null;
    patient_user_id?: number;
    patient_address?: string | null;
    patient_age?: number | null;
    patient_gender?: 'male' | 'female' | null;
    patient_notes?: string | null;
    family_member_id?: number;
    visit_id?: number | null;
    medicine_requests: Array<{
      name: string;
      strength?: string | null;
      form?: string | null;
      quantity?: number;
      expiry_date?: string | null;
      duration_days?: number | null;
      daily_dosage?: number | null;
      notes?: string | null;
      generic_allowed?: boolean;
      conversion_allowed?: boolean;
    }>;
  }) =>
    request<ApiPrescription>('/prescriptions', {
      method: 'POST',
      token,
      body: JSON.stringify(payload)
    }),
  getDoctorPrescriptionPrintData: (token: string, prescriptionId: number) =>
    request<ApiPrescriptionPrintData>(`/doctor/prescriptions/${prescriptionId}/print-data`, { token }),
  linkDoctorPrescriptionPatientByNinu: (
    token: string,
    prescriptionId: number,
    ninu: string
  ) =>
    request<ApiPrescription>(`/doctor/prescriptions/${prescriptionId}/link-patient-by-ninu`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ ninu })
    }),
  createAndLinkDoctorPrescriptionPatient: (
    token: string,
    prescriptionId: number,
    payload?: {
      ninu?: string;
      date_of_birth?: string;
    }
  ) =>
    request<ApiPrescription>(`/doctor/prescriptions/${prescriptionId}/create-and-link-patient`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  completePrescriptionAsPatient: (token: string, prescriptionId: number) =>
    request<ApiPrescription>(`/patient/prescriptions/${prescriptionId}/complete`, {
      method: 'PATCH',
      token
    }),
  reopenPrescriptionAsPatient: (token: string, prescriptionId: number) =>
    request<ApiPrescription>(`/patient/prescriptions/${prescriptionId}/reopen`, {
      method: 'PATCH',
      token
    }),
  assignFamilyMemberToPrescriptionAsPatient: (
    token: string,
    prescriptionId: number,
    family_member_id: number | null
  ) =>
    request<ApiPrescription>(`/patient/prescriptions/${prescriptionId}/family-member`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ family_member_id })
    }),
  createPharmacyResponse: (token: string, payload: {
    pharmacy_id: number;
    prescription_id: number;
    medicine_request_id: number;
    status: ApiPharmacyResponse['status'];
    expires_at_minutes: number;
  }) =>
    request<ApiPharmacyResponse>('/pharmacy-responses', {
      method: 'POST',
      token,
      body: JSON.stringify(payload)
    }),
  reactivatePharmacyPrescription: (token: string, prescriptionId: number) =>
    request<ApiPrescription>(`/pharmacy/prescriptions/${prescriptionId}/reactivate`, {
      method: 'PATCH',
      token
    }),
  getPatientMedicinePurchases: (token: string, prescriptionId: number) =>
    request<ApiPatientMedicinePurchase[]>(`/patient/prescriptions/${prescriptionId}/purchases`, { token }),
  setPatientMedicinePurchase: (
    token: string,
    payload: {
      prescription_id: number;
      medicine_request_id: number;
      pharmacy_id: number;
      purchased: boolean;
      quantity?: number;
    }
  ) =>
    request<ApiPatientMedicinePurchase | { message: string }>(
      `/patient/prescriptions/${payload.prescription_id}/purchases`,
      {
        method: 'POST',
        token,
        body: JSON.stringify({
          medicine_request_id: payload.medicine_request_id,
          pharmacy_id: payload.pharmacy_id,
          purchased: payload.purchased,
          quantity: payload.quantity
        })
      }
    )
  ,
  setPatientMedicinePurchasesBatch: (
    token: string,
    payload: {
      prescription_id: number;
      items: Array<{
        medicine_request_id: number;
        pharmacy_id: number;
        purchased: boolean;
        quantity?: number;
      }>;
    }
  ) =>
    request<{ message: string }>(
      `/patient/prescriptions/${payload.prescription_id}/purchases/batch`,
      {
        method: 'POST',
        token,
        body: JSON.stringify({ items: payload.items })
      }
    ),
  getPatientCabinetItems: (token: string) =>
    request<ApiPatientMedicineCabinetItem[]>('/patient/cabinet-items', { token }),
  createPatientCabinetItem: (
    token: string,
    payload: {
      family_member_id?: number | null;
      medication_name: string;
      form?: string | null;
      dosage_strength?: string | null;
      daily_dosage?: number | null;
      quantity: number;
      refill_reminder_days?: number;
      reminder_times?: string[];
      expiration_date?: string | null;
      manufacturer?: string | null;
      requires_refrigeration?: boolean;
      note?: string | null;
    }
  ) =>
    request<{ message: string; item: ApiPatientMedicineCabinetItem }>('/patient/cabinet-items', {
      method: 'POST',
      token,
      body: JSON.stringify(payload)
    }),
  updatePatientCabinetItem: (
    token: string,
    itemId: number,
    payload: Partial<{
      family_member_id: number | null;
      medication_name: string;
      form: string | null;
      dosage_strength: string | null;
      daily_dosage: number | null;
      quantity: number;
      expiration_date: string | null;
      manufacturer: string | null;
      requires_refrigeration: boolean;
      refill_reminder_days: number;
      reminder_times: string[];
      note: string | null;
    }>
  ) =>
    request<{ message: string; item: ApiPatientMedicineCabinetItem }>(`/patient/cabinet-items/${itemId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload)
    }),
  uploadPatientCabinetItemPhoto: (token: string, itemId: number, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return requestFormData<{ message: string; photo_url: string }>(`/patient/cabinet-items/${itemId}/photo`, formData, token);
  },
  deletePatientCabinetItem: (token: string, itemId: number) =>
    request<{ message: string }>(`/patient/cabinet-items/${itemId}`, {
      method: 'DELETE',
      token
    }),
  getPatientEmergencyContacts: (token: string) =>
    request<ApiEmergencyContact[]>('/patient/emergency-contacts', { token }),
  createPatientEmergencyContact: (
    token: string,
    payload: {
      name: string;
      phone: string;
      category: ApiEmergencyContact['category'];
      city?: string | null;
      department?: string | null;
      address?: string | null;
      available_hours?: string | null;
      is_24_7?: boolean;
      is_favorite?: boolean;
      priority?: number | null;
      notes?: string | null;
    }
  ) =>
    request<ApiEmergencyContact>('/patient/emergency-contacts', {
      method: 'POST',
      token,
      body: JSON.stringify(payload)
    }),
  createPatientEmergencyContactFromProfile: (
    token: string,
    payload: {
      source_type: 'doctor_user' | 'pharmacy' | 'hospital' | 'laboratory';
      source_id: number;
    }
  ) =>
    request<{ message: string; created: boolean; contact: ApiEmergencyContact }>(
      '/patient/emergency-contacts/from-profile',
      {
        method: 'POST',
        token,
        body: JSON.stringify(payload)
      }
    ),
  updatePatientEmergencyContact: (
    token: string,
    id: number,
    payload: Partial<{
      name: string;
      phone: string;
      category: ApiEmergencyContact['category'];
      city: string | null;
      department: string | null;
      address: string | null;
      available_hours: string | null;
      is_24_7: boolean;
      is_favorite: boolean;
      priority: number | null;
      notes: string | null;
    }>
  ) =>
    request<ApiEmergencyContact>(`/patient/emergency-contacts/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload)
    }),
  deletePatientEmergencyContact: (token: string, id: number) =>
    request<{ message: string }>(`/patient/emergency-contacts/${id}`, {
      method: 'DELETE',
      token
    }),
  getPatientFamilyMembers: (token: string, options?: { includeArchived?: boolean }) => {
    const search = new URLSearchParams();
    if (options?.includeArchived) {
      search.set('include_archived', '1');
    }
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return request<ApiFamilyMember[]>(`/patient/family-members${suffix}`, { token });
  },
  getDoctorPatientFamilyMembers: (token: string, patientUserId: number) =>
    request<ApiFamilyMember[]>(`/doctor/patients/${patientUserId}/family-members`, { token }),
  getDoctorPatientProfile: (token: string, patientUserId: number) =>
    request<ApiDoctorPatientProfile>(`/doctor/patients/${patientUserId}`, { token }),
  createPatientFamilyMember: (
    token: string,
    payload: {
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
    }
  ) =>
    request<ApiFamilyMember>('/patient/family-members', {
      method: 'POST',
      token,
      body: JSON.stringify(payload)
    }),
  updatePatientFamilyMember: (
    token: string,
    id: number,
    payload: Partial<{
      name: string;
      age: number | null;
      date_of_birth: string | null;
      gender: ApiFamilyMember['gender'];
      relationship: ApiFamilyMember['relationship'];
      allergies: string | null;
      chronic_diseases: string | null;
      blood_type: ApiFamilyMember['blood_type'];
      emergency_notes: string | null;
      weight_kg: number | null;
      height_cm: number | null;
      surgical_history: string | null;
      vaccination_up_to_date: boolean | null;
      primary_caregiver: boolean;
    }>
  ) =>
    request<ApiFamilyMember>(`/patient/family-members/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload)
    }),
  deletePatientFamilyMember: (token: string, id: number) =>
    request<{ message: string }>(`/patient/family-members/${id}`, {
      method: 'DELETE',
      token
    }),
  unarchivePatientFamilyMember: (token: string, id: number) =>
    request<ApiFamilyMember>(`/patient/family-members/${id}/unarchive`, {
      method: 'PATCH',
      token
    }),
  uploadPatientFamilyMemberPhoto: (token: string, id: number, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return requestFormData<ApiFamilyMember>(`/patient/family-members/${id}/photo`, formData, token);
  },
  removePatientFamilyMemberPhoto: (token: string, id: number) =>
    request<ApiFamilyMember>(`/patient/family-members/${id}/photo`, {
      method: 'DELETE',
      token
    }),
  uploadPatientFamilyMemberIdDocument: (token: string, id: number, file: File) => {
    const formData = new FormData();
    formData.append('id_document', file);
    return requestFormData<ApiFamilyMember>(`/patient/family-members/${id}/id-document`, formData, token);
  },
  removePatientFamilyMemberIdDocument: (token: string, id: number) =>
    request<ApiFamilyMember>(`/patient/family-members/${id}/id-document`, {
      method: 'DELETE',
      token
    }),
  getPatientMedicalHistory: (token: string, params?: { family_member_id?: number | null }) => {
    const search = new URLSearchParams();
    if (typeof params?.family_member_id === 'number') {
      search.set('family_member_id', String(params.family_member_id));
    }
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return request<ApiMedicalHistoryEntry[]>(`/patient/medical-history${suffix}`, { token });
  },
  createPatientMedicalHistory: (
    token: string,
    payload: {
      family_member_id?: number | null;
      prescription_id?: number | null;
      visit_id?: number | null;
      type: ApiMedicalHistoryEntry['type'];
      title: string;
      details?: string | null;
      started_at?: string | null;
      ended_at?: string | null;
      status: ApiMedicalHistoryEntry['status'];
      visibility: ApiMedicalHistoryEntry['visibility'];
    }
  ) =>
    request<ApiMedicalHistoryEntry>('/patient/medical-history', {
      method: 'POST',
      token,
      body: JSON.stringify(payload)
    }),
  updatePatientMedicalHistory: (
    token: string,
    id: number,
    payload: {
      family_member_id?: number | null;
      prescription_id?: number | null;
      visit_id?: number | null;
      type: ApiMedicalHistoryEntry['type'];
      title: string;
      details?: string | null;
      started_at?: string | null;
      ended_at?: string | null;
      status: ApiMedicalHistoryEntry['status'];
      visibility: ApiMedicalHistoryEntry['visibility'];
    }
  ) =>
    request<ApiMedicalHistoryEntry>(`/patient/medical-history/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload)
    }),
  deletePatientMedicalHistory: (token: string, id: number) =>
    request<{ message: string }>(`/patient/medical-history/${id}`, {
      method: 'DELETE',
      token
    }),
  getDoctorPatientMedicalHistory: (
    token: string,
    patientUserId: number,
    params?: { family_member_id?: number | null }
  ) => {
    const search = new URLSearchParams();
    if (typeof params?.family_member_id === 'number') {
      search.set('family_member_id', String(params.family_member_id));
    }
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return request<ApiMedicalHistoryEntry[]>(`/doctor/patients/${patientUserId}/medical-history${suffix}`, { token });
  },
  getDoctorPatientAccessStatus: (token: string, patientUserId: number) =>
    request<ApiDoctorPatientAccessStatus>(`/doctor/patients/${patientUserId}/access-status`, { token }),
  createDoctorPatientAccessRequest: (token: string, patientUserId: number, payload?: { message?: string | null }) =>
    request<ApiDoctorPatientAccessRequest>(`/doctor/patients/${patientUserId}/access-requests`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  getPatientAccessRequests: (token: string) =>
    request<ApiDoctorPatientAccessRequest[]>('/patient/access-requests', { token }),
  respondPatientAccessRequest: (
    token: string,
    accessRequestId: number,
    payload: { status: 'approved' | 'denied'; response_message?: string | null }
  ) =>
    request<ApiDoctorPatientAccessRequest>(`/patient/access-requests/${accessRequestId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload)
    }),
  blockPatientAccessDoctor: (token: string, doctorUserId: number) =>
    request<{ message: string; doctor_id: number; is_blocked: boolean }>(
      `/patient/access-requests/doctors/${doctorUserId}/block`,
      {
        method: 'POST',
        token
      }
    ),
  getPatientAccessDoctorBlockStatus: (token: string, doctorUserId: number) =>
    request<{ doctor_id: number; is_blocked: boolean }>(
      `/patient/access-requests/doctors/${doctorUserId}/block-status`,
      { token }
    ),
  unblockPatientAccessDoctor: (token: string, doctorUserId: number) =>
    request<{ message: string; doctor_id: number; is_blocked: boolean }>(
      `/patient/access-requests/doctors/${doctorUserId}/block`,
      {
        method: 'DELETE',
        token
      }
    ),
  searchDoctorSecretaries: (token: string, query?: string) => {
    const search = new URLSearchParams();
    if (query?.trim()) {
      search.set('query', query.trim());
    }
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return request<ApiSecretaryLookup[]>(`/doctor/secretaires/search${suffix}`, { token });
  },
  getDoctorSecretaryAccessStatus: (token: string, secretaryUserId: number) =>
    request<ApiDoctorSecretaryAccessStatus>(`/doctor/secretaires/${secretaryUserId}/access-status`, { token }),
  createDoctorSecretaryAccessRequest: (token: string, secretaryUserId: number, payload?: { message?: string | null }) =>
    request<ApiDoctorSecretaryAccessRequest>(`/doctor/secretaires/${secretaryUserId}/access-requests`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  getDoctorSecretaryAccessRequests: (token: string) =>
    request<ApiDoctorSecretaryAccessRequest[]>('/doctor/secretaires/access-requests', { token }),
  getSecretaryAccessRequests: (token: string) =>
    request<ApiDoctorSecretaryAccessRequest[]>('/secretaire/access-requests', { token }),
  respondSecretaryAccessRequest: (
    token: string,
    accessRequestId: number,
    payload: { status: 'approved' | 'denied'; response_message?: string | null }
  ) =>
    request<ApiDoctorSecretaryAccessRequest>(`/secretaire/access-requests/${accessRequestId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload)
    }),
  createDoctorPatientMedicalHistory: (
    token: string,
    patientUserId: number,
    payload: {
      family_member_id?: number | null;
      prescription_id?: number | null;
      visit_id?: number | null;
      type: ApiMedicalHistoryEntry['type'];
      title: string;
      details?: string | null;
      started_at?: string | null;
      ended_at?: string | null;
      status: ApiMedicalHistoryEntry['status'];
      visibility: ApiMedicalHistoryEntry['visibility'];
    }
  ) =>
    request<ApiMedicalHistoryEntry>(`/doctor/patients/${patientUserId}/medical-history`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload)
    }),
  updateDoctorPatientMedicalHistory: (
    token: string,
    patientUserId: number,
    id: number,
    payload: {
      family_member_id?: number | null;
      prescription_id?: number | null;
      visit_id?: number | null;
      type: ApiMedicalHistoryEntry['type'];
      title: string;
      details?: string | null;
      started_at?: string | null;
      ended_at?: string | null;
      status: ApiMedicalHistoryEntry['status'];
      visibility: ApiMedicalHistoryEntry['visibility'];
    }
  ) =>
    request<ApiMedicalHistoryEntry>(`/doctor/patients/${patientUserId}/medical-history/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload)
    }),
  linkDoctorPatientMedicalHistoryPrescription: (
    token: string,
    patientUserId: number,
    id: number,
    prescription_id: number
  ) =>
    request<ApiMedicalHistoryEntry>(`/doctor/patients/${patientUserId}/medical-history/${id}/link-prescription`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ prescription_id })
    }),
  getDoctorVisits: (
    token: string,
    patientUserId?: number | null,
    params?: { family_member_id?: number | null }
  ) => {
    const search = new URLSearchParams();
    if (typeof patientUserId === 'number') {
      search.set('patient_user_id', String(patientUserId));
    }
    if (typeof params?.family_member_id === 'number') {
      search.set('family_member_id', String(params.family_member_id));
    }
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return request<ApiVisit[]>(`/doctor/visits${suffix}`, { token });
  },
  getDoctorVisitById: (token: string, visitId: number) =>
    request<ApiVisitDetail>(`/doctor/visits/${visitId}`, {
      token
    }),
  getPatientVisits: (
    token: string,
    params?: { family_member_id?: number | null }
  ) => {
    const search = new URLSearchParams();
    if (typeof params?.family_member_id === 'number') {
      search.set('family_member_id', String(params.family_member_id));
    }
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return request<ApiVisit[]>(`/patient/visits${suffix}`, { token });
  },
  createDoctorVisit: (
    token: string,
    payload: {
      patient_user_id: number;
      family_member_id?: number | null;
      visit_date: string;
      visit_type?: string | null;
      chief_complaint?: string | null;
      diagnosis?: string | null;
      clinical_notes?: string | null;
      treatment_plan?: string | null;
      status?: string | null;
    }
  ) =>
    request<ApiVisit>('/doctor/visits', {
      method: 'POST',
      token,
      body: JSON.stringify(payload)
    }),
  updateDoctorVisit: (
    token: string,
    visitId: number,
    payload: {
      patient_user_id: number;
      family_member_id?: number | null;
      visit_date: string;
      visit_type?: string | null;
      chief_complaint?: string | null;
      diagnosis?: string | null;
      clinical_notes?: string | null;
      treatment_plan?: string | null;
      status?: string | null;
    }
  ) =>
    request<ApiVisitDetail>(`/doctor/visits/${visitId}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(payload)
    }),
  getDoctorPatientRehabEntries: (token: string, patientUserId: number) =>
    request<ApiRehabEntry[]>(`/doctor/patients/${patientUserId}/rehab-entries`, { token }),
  createDoctorPatientRehabEntry: (
    token: string,
    patientUserId: number,
    payload: {
      medical_history_entry_id?: number | null;
      prescription_id?: number | null;
      visit_id?: number | null;
      sessions_per_week?: number | null;
      duration_weeks?: number | null;
      goals?: string | null;
      exercise_type?: string | null;
      exercise_reps?: string | null;
      exercise_frequency?: string | null;
      exercise_notes?: string | null;
      pain_score?: number | null;
      mobility_score?: string | null;
      progress_notes?: string | null;
      follow_up_date?: string | null;
    }
  ) =>
    request<ApiRehabEntry>(`/doctor/patients/${patientUserId}/rehab-entries`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload)
    }),
  updateDoctorPatientRehabEntry: (
    token: string,
    patientUserId: number,
    entryId: number,
    payload: {
      medical_history_entry_id?: number | null;
      prescription_id?: number | null;
      visit_id?: number | null;
      sessions_per_week?: number | null;
      duration_weeks?: number | null;
      goals?: string | null;
      exercise_type?: string | null;
      exercise_reps?: string | null;
      exercise_frequency?: string | null;
      exercise_notes?: string | null;
      pain_score?: number | null;
      mobility_score?: string | null;
      progress_notes?: string | null;
      follow_up_date?: string | null;
    }
  ) =>
    request<ApiRehabEntry>(`/doctor/patients/${patientUserId}/rehab-entries/${entryId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload)
    }),
  getAdminUsers: (
    token: string,
    role?: 'doctor' | 'pharmacy' | 'patient' | 'hopital' | 'laboratoire' | 'secretaire'
  ) => {
    const search = new URLSearchParams();
    if (role) {
      search.set('role', role);
    }
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return request<ApiUser[]>(`/admin/accounts/users${suffix}`, { token });
  },
  getAdminPharmacies: (token: string) =>
    request<ApiPharmacy[]>('/admin/accounts/pharmacies', { token }),
  getAdminHospitals: (token: string) =>
    request<ApiPharmacy[]>('/admin/accounts/hospitals', { token }),
  getAdminLaboratories: (token: string) =>
    request<ApiPharmacy[]>('/admin/accounts/laboratories', { token }),
  getAdminPasswordResetEvents: (
    token: string,
    params?: { action?: 'request' | 'complete'; success?: '0' | '1'; q?: string; limit?: number }
  ) => {
    const search = new URLSearchParams();
    if (params?.action) search.set('action', params.action);
    if (params?.success) search.set('success', params.success);
    if (params?.q) search.set('q', params.q);
    if (params?.limit) search.set('limit', String(params.limit));
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return request<ApiPasswordResetEvent[]>(`/admin/accounts/password-reset-events${suffix}`, { token });
  },
  adminApproveUser: (token: string, userId: number, payload?: { notes?: string | null }) =>
    request<{
      id: number;
      role: 'doctor' | 'pharmacy' | 'patient' | 'hopital' | 'laboratoire' | 'secretaire';
      verification_status: 'pending' | 'approved' | 'rejected';
      verified_at: string | null;
      verified_by: number | null;
      verified_by_name?: string | null;
    }>(`/admin/accounts/users/${userId}/approve`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  adminUnapproveUser: (token: string, userId: number, payload?: { notes?: string | null }) =>
    request<{
      id: number;
      role: 'doctor' | 'pharmacy' | 'patient' | 'hopital' | 'laboratoire' | 'secretaire';
      verification_status: 'pending' | 'approved' | 'rejected';
      verified_at: string | null;
      verified_by: number | null;
    }>(`/admin/accounts/users/${userId}/unapprove`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  adminBlockUser: (token: string, userId: number, payload?: { notes?: string | null }) =>
    request<{
      id: number;
      role: 'doctor' | 'pharmacy' | 'patient' | 'hopital' | 'laboratoire' | 'secretaire';
      account_status: 'active' | 'provisional' | 'blocked';
      verification_status: 'pending' | 'approved' | 'rejected';
    }>(`/admin/accounts/users/${userId}/block`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  adminUnblockUser: (token: string, userId: number) =>
    request<{
      id: number;
      role: 'doctor' | 'pharmacy' | 'patient' | 'hopital' | 'laboratoire' | 'secretaire';
      account_status: 'active' | 'provisional' | 'blocked';
      verification_status: 'pending' | 'approved' | 'rejected';
      verified_at: string | null;
      verified_by: number | null;
    }>(`/admin/accounts/users/${userId}/unblock`, {
      method: 'POST',
      token
    }),
  adminVerifyDoctorLicense: (
    token: string,
    doctorId: number,
    payload?: { verified?: boolean; notes?: string | null }
  ) =>
    request<ApiUser>(`/admin/accounts/doctors/${doctorId}/verify-license`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  adminSetDoctorVerifierPermission: (
    token: string,
    doctorId: number,
    canVerifyAccounts: boolean
  ) =>
    request<{ id: number; can_verify_accounts: boolean; delegated_by: number | null; delegated_at: string | null }>(`/admin/accounts/doctors/${doctorId}/verifier-permission`, {
      method: 'POST',
      token,
      body: JSON.stringify({ can_verify_accounts: canVerifyAccounts })
    }),
  adminSetPharmacyVerifierPermission: (
    token: string,
    pharmacyUserId: number,
    canVerifyAccounts: boolean
  ) =>
    request<{ id: number; can_verify_accounts: boolean; delegated_by: number | null; delegated_at: string | null }>(
      `/admin/accounts/pharmacy-accounts/${pharmacyUserId}/verifier-permission`,
      {
        method: 'POST',
        token,
        body: JSON.stringify({ can_verify_accounts: canVerifyAccounts })
      }
    ),
  adminVerifyPharmacyLicense: (
    token: string,
    pharmacyId: number,
    payload?: { verified?: boolean; notes?: string | null }
  ) =>
    request<ApiPharmacy>(`/admin/accounts/pharmacies/${pharmacyId}/verify-license`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  adminApproveHospital: (token: string, hospitalId: number, payload?: { notes?: string | null }) =>
    request<ApiPharmacy>(`/admin/accounts/hospitals/${hospitalId}/approve`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  adminUnapproveHospital: (token: string, hospitalId: number, payload?: { notes?: string | null }) =>
    request<ApiPharmacy>(`/admin/accounts/hospitals/${hospitalId}/unapprove`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  adminBlockHospital: (token: string, hospitalId: number, payload?: { notes?: string | null }) =>
    request<ApiPharmacy>(`/admin/accounts/hospitals/${hospitalId}/block`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  adminUnblockHospital: (token: string, hospitalId: number) =>
    request<ApiPharmacy>(`/admin/accounts/hospitals/${hospitalId}/unblock`, {
      method: 'POST',
      token
    }),
  adminSetHospitalVerifierPermission: (token: string, hospitalId: number, canVerifyAccounts: boolean) =>
    request<ApiPharmacy>(`/admin/accounts/hospitals/${hospitalId}/verifier-permission`, {
      method: 'POST',
      token,
      body: JSON.stringify({ can_verify_accounts: canVerifyAccounts })
    }),
  adminVerifyHospitalLicense: (
    token: string,
    hospitalId: number,
    payload?: { verified?: boolean; notes?: string | null }
  ) =>
    request<ApiPharmacy>(`/admin/accounts/hospitals/${hospitalId}/verify-license`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  adminApproveLaboratory: (token: string, laboratoryId: number, payload?: { notes?: string | null }) =>
    request<ApiPharmacy>(`/admin/accounts/laboratories/${laboratoryId}/approve`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  adminUnapproveLaboratory: (token: string, laboratoryId: number, payload?: { notes?: string | null }) =>
    request<ApiPharmacy>(`/admin/accounts/laboratories/${laboratoryId}/unapprove`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  adminBlockLaboratory: (token: string, laboratoryId: number, payload?: { notes?: string | null }) =>
    request<ApiPharmacy>(`/admin/accounts/laboratories/${laboratoryId}/block`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    }),
  adminUnblockLaboratory: (token: string, laboratoryId: number) =>
    request<ApiPharmacy>(`/admin/accounts/laboratories/${laboratoryId}/unblock`, {
      method: 'POST',
      token
    }),
  adminSetLaboratoryVerifierPermission: (token: string, laboratoryId: number, canVerifyAccounts: boolean) =>
    request<ApiPharmacy>(`/admin/accounts/laboratories/${laboratoryId}/verifier-permission`, {
      method: 'POST',
      token,
      body: JSON.stringify({ can_verify_accounts: canVerifyAccounts })
    }),
  adminVerifyLaboratoryLicense: (
    token: string,
    laboratoryId: number,
    payload?: { verified?: boolean; notes?: string | null }
  ) =>
    request<ApiPharmacy>(`/admin/accounts/laboratories/${laboratoryId}/verify-license`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload ?? {})
    })
};

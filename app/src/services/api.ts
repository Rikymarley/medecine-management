const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api';

type RequestOptions = RequestInit & { token?: string };

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.message ?? 'Echec de la requete';
    console.error('[API ERROR]', {
      url: `${API_URL}${path}`,
      method: options.method ?? 'GET',
      status: response.status,
      statusText: response.statusText,
      body: errorBody
    });
    throw new Error(message);
  }

  return response.json() as Promise<T>;
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

  return response.json() as Promise<T>;
};

export type ApiUser = {
  id: number;
  name: string;
  email: string;
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
  years_experience: number | null;
  consultation_fee_range: string | null;
  whatsapp: string | null;
  bio: string | null;
  age: number | null;
  gender: 'male' | 'female' | null;
  allergies: string | null;
  chronic_diseases: string | null;
  blood_type: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null;
  emergency_notes: string | null;
  role: 'doctor' | 'pharmacy' | 'patient' | 'admin';
  account_status?: 'active' | 'provisional';
  created_by_doctor_id?: number | null;
  pharmacy_id: number | null;
  verification_status: 'pending' | 'approved' | 'rejected';
  verified_at: string | null;
  verified_by: number | null;
  verification_notes: string | null;
};

export type ApiAuthResponse = {
  token: string;
  user: ApiUser;
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
  guest_patient_id?: number | null;
  family_member_id: number | null;
  patient_name: string;
  patient_phone?: string | null;
  doctor_name: string;
  source?: 'app' | 'paper';
  status: string;
  requested_at: string;
  qr_token?: string | null;
  print_code?: string | null;
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
  } | null;
  patient?: {
    id: number;
    name: string;
    account_status: 'active' | 'provisional';
    created_by_doctor_id: number | null;
    ninu: string | null;
    date_of_birth: string | null;
    phone: string | null;
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
  guestPatient?: {
    id: number;
    doctor_user_id: number;
    name: string;
    phone: string | null;
    address: string | null;
    age: number | null;
    gender: 'male' | 'female' | null;
    notes: string | null;
  } | null;
};

export type ApiGuestPatient = {
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

export type ApiGuestPatientAvailability = {
  available: boolean;
  count: number;
  matches: Array<{
    id: number;
    name: string;
    phone: string | null;
    ninu: string | null;
    date_of_birth: string | null;
    account_status: 'active' | 'provisional';
    created_by_doctor_id: number | null;
  }>;
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

export type ApiEmergencyContact = {
  id: number;
  patient_user_id: number;
  name: string;
  phone: string;
  category: 'hospital' | 'clinic' | 'laboratory' | 'pharmacy' | 'doctor' | 'ambulance';
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
  name: string;
  age: number | null;
  gender: 'male' | 'female' | null;
  relationship: 'parent' | 'spouse' | 'child' | 'sibling' | 'grandparent' | 'other' | null;
  allergies: string | null;
  chronic_diseases: string | null;
  blood_type: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null;
  emergency_notes: string | null;
  primary_caregiver: boolean;
  created_at: string;
  updated_at: string;
};

export type ApiDoctorPatientProfile = {
  id: number;
  name: string;
  phone: string | null;
  ninu: string | null;
  date_of_birth: string | null;
  whatsapp: string | null;
  address: string | null;
  age: number | null;
  gender: 'male' | 'female' | null;
  allergies: string | null;
  chronic_diseases: string | null;
  blood_type: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null;
  emergency_notes: string | null;
};

export type ApiPatientLookup = {
  id: number;
  name: string;
  phone: string | null;
  ninu: string | null;
  date_of_birth: string | null;
};

export type ApiMedicalHistoryEntry = {
  id: number;
  entry_code: string | null;
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
  doctor_name?: string | null;
  family_member_name?: string | null;
  prescription_requested_at?: string | null;
  prescription_print_code?: string | null;
  can_edit_by_patient?: boolean;
  can_delete_by_patient?: boolean;
  created_at: string;
  updated_at: string;
};

export const api = {
  register: (payload: {
    name: string;
    email: string;
    phone?: string;
    ninu?: string;
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
    password: string;
    password_confirmation: string;
    role: 'doctor' | 'pharmacy' | 'patient';
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
  me: (token: string) => request<ApiUser>('/auth/me', { token }),
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
      age: number | null;
      gender: 'male' | 'female' | null;
      allergies: string | null;
      chronic_diseases: string | null;
      blood_type: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null;
      emergency_notes: string | null;
    }>
  ) =>
    request<ApiUser>('/patient/me', {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload)
    }),
  logout: (token: string) => request<{ message: string }>('/auth/logout', { method: 'POST', token }),
  getPharmacies: () => request<ApiPharmacy[]>('/pharmacies'),
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
  getMedicines: (params?: { q?: string; category?: ApiMedicine['category']; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.category) search.set('category', params.category);
    if (params?.limit) search.set('limit', String(params.limit));
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return request<ApiMedicine[]>(`/medicines${suffix}`);
  },
  getPrescriptions: () => request<ApiPrescription[]>('/prescriptions'),
  getDoctorPrescriptions: (token: string) =>
    request<ApiPrescription[]>('/doctor/prescriptions', { token }),
  searchDoctorPatients: (token: string, q: string, limit = 8) => {
    const search = new URLSearchParams();
    search.set('q', q);
    search.set('limit', String(limit));
    return request<ApiPatientLookup[]>(`/doctor/patients/search?${search.toString()}`, { token });
  },
  getDoctorGuestPatients: (token: string) =>
    request<ApiGuestPatient[]>('/doctor/guest-patients', { token }),
  checkDoctorGuestPatientAvailability: (
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
    return request<ApiGuestPatientAvailability>(`/doctor/guest-patients/availability?${search.toString()}`, { token });
  },
  createDoctorGuestPatient: (
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
    request<ApiGuestPatient>('/doctor/guest-patients', {
      method: 'POST',
      token,
      body: JSON.stringify(payload)
    }),
  updateDoctorGuestPatient: (
    token: string,
    guestPatientId: number,
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
    request<ApiGuestPatient>(`/doctor/guest-patients/${guestPatientId}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(payload)
    }),
  getPatientPrescriptions: (token: string) =>
    request<ApiPrescription[]>('/patient/prescriptions', { token }),
  createPrescription: (token: string, payload: {
    patient_name: string;
    patient_phone?: string | null;
    patient_user_id?: number;
    guest_patient_id?: number;
    patient_address?: string | null;
    patient_age?: number | null;
    patient_gender?: 'male' | 'female' | null;
    patient_notes?: string | null;
    family_member_id?: number;
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
  getPatientFamilyMembers: (token: string) =>
    request<ApiFamilyMember[]>('/patient/family-members', { token }),
  getDoctorPatientFamilyMembers: (token: string, patientUserId: number) =>
    request<ApiFamilyMember[]>(`/doctor/patients/${patientUserId}/family-members`, { token }),
  getDoctorPatientProfile: (token: string, patientUserId: number) =>
    request<ApiDoctorPatientProfile>(`/doctor/patients/${patientUserId}`, { token }),
  createPatientFamilyMember: (
    token: string,
    payload: {
      name: string;
      age?: number | null;
      gender?: ApiFamilyMember['gender'];
      relationship?: ApiFamilyMember['relationship'];
      allergies?: string | null;
      chronic_diseases?: string | null;
      blood_type?: ApiFamilyMember['blood_type'];
      emergency_notes?: string | null;
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
      gender: ApiFamilyMember['gender'];
      relationship: ApiFamilyMember['relationship'];
      allergies: string | null;
      chronic_diseases: string | null;
      blood_type: ApiFamilyMember['blood_type'];
      emergency_notes: string | null;
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
  createDoctorPatientMedicalHistory: (
    token: string,
    patientUserId: number,
    payload: {
      family_member_id?: number | null;
      prescription_id?: number | null;
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
    })
};

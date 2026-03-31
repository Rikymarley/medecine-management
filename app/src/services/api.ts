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

export type ApiUser = {
  id: number;
  name: string;
  email: string;
  role: 'doctor' | 'pharmacy' | 'patient' | 'admin';
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
  phone: string | null;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  open_now: boolean;
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
  patient_name: string;
  doctor_name: string;
  status: string;
  requested_at: string;
  medicine_requests: ApiMedicineRequest[];
  responses: ApiPharmacyResponse[];
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
  category: 'hospital' | 'clinic' | 'laboratory' | 'pharmacy';
  city: string | null;
  department: string | null;
  address: string | null;
  is_24_7: boolean;
  is_favorite: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiFamilyMember = {
  id: number;
  patient_user_id: number;
  name: string;
  age: number | null;
  gender: 'male' | 'female' | 'other' | null;
  relationship: 'parent' | 'spouse' | 'child' | 'sibling' | 'grandparent' | 'other' | null;
  created_at: string;
  updated_at: string;
};

export const api = {
  register: (payload: {
    name: string;
    email: string;
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
  logout: (token: string) => request<{ message: string }>('/auth/logout', { method: 'POST', token }),
  getPharmacies: () => request<ApiPharmacy[]>('/pharmacies'),
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
  getPatientPrescriptions: (token: string) =>
    request<ApiPrescription[]>('/patient/prescriptions', { token }),
  createPrescription: (token: string, payload: {
    patient_name: string;
    medicine_requests: Array<{
      name: string;
      strength?: string | null;
      form?: string | null;
      quantity?: number;
      generic_allowed?: boolean;
      conversion_allowed?: boolean;
    }>;
  }) =>
    request<ApiPrescription>('/prescriptions', {
      method: 'POST',
      token,
      body: JSON.stringify(payload)
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
      is_24_7?: boolean;
      is_favorite?: boolean;
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
      is_24_7: boolean;
      is_favorite: boolean;
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
  createPatientFamilyMember: (
    token: string,
    payload: {
      name: string;
      age?: number | null;
      gender?: ApiFamilyMember['gender'];
      relationship?: ApiFamilyMember['relationship'];
    }
  ) =>
    request<ApiFamilyMember>('/patient/family-members', {
      method: 'POST',
      token,
      body: JSON.stringify(payload)
    }),
  deletePatientFamilyMember: (token: string, id: number) =>
    request<{ message: string }>(`/patient/family-members/${id}`, {
      method: 'DELETE',
      token
    })
};

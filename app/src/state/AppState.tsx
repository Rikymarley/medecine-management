import React, { createContext, useContext, useMemo, useReducer } from 'react';
import type {
  AppState,
  AvailabilityStatus,
  CreatePrescriptionInput,
  PharmacyResponse,
  RespondToMedicineInput,
  Role
} from './types';

const ROLE_KEY = 'med-app-role';

const nowIso = () => new Date().toISOString();

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const defaultState: AppState = {
  role: (localStorage.getItem(ROLE_KEY) as Role | null) ?? null,
  prescriptions: [
    {
      id: 'rx-1001',
      patientName: 'Marie Jean',
      doctorName: 'Dr. Joseph',
      createdAt: nowIso(),
      medicineRequests: [
        {
          id: 'med-1',
          name: 'Amoxicillin',
          strength: '500mg',
          form: 'Capsule',
          genericAllowed: true,
          conversionAllowed: false
        },
        {
          id: 'med-2',
          name: 'Paracetamol',
          strength: '500mg',
          form: 'Tablet',
          genericAllowed: true,
          conversionAllowed: true
        },
        {
          id: 'med-3',
          name: 'Omeprazole',
          strength: '20mg',
          form: 'Capsule',
          genericAllowed: true,
          conversionAllowed: false
        }
      ]
    }
  ],
  pharmacies: [
    {
      id: 'pharm-1',
      name: 'Pharmacie Centrale',
      distanceKm: 1.2,
      reliabilityScore: 92,
      openNow: true
    },
    {
      id: 'pharm-2',
      name: 'Pharmacie Soleil',
      distanceKm: 2.8,
      reliabilityScore: 85,
      openNow: true
    }
  ],
  responses: []
};

type Action =
  | { type: 'set-role'; role: Role }
  | { type: 'logout' }
  | { type: 'create-prescription'; payload: CreatePrescriptionInput }
  | { type: 'respond-to-medicine'; payload: RespondToMedicineInput };

const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'set-role': {
      localStorage.setItem(ROLE_KEY, action.role);
      return { ...state, role: action.role };
    }
    case 'logout': {
      localStorage.removeItem(ROLE_KEY);
      return { ...state, role: null };
    }
    case 'create-prescription': {
      const newPrescription = {
        id: generateId('rx'),
        createdAt: nowIso(),
        ...action.payload
      };
      return { ...state, prescriptions: [newPrescription, ...state.prescriptions] };
    }
    case 'respond-to-medicine': {
      const payload = action.payload;
      const timestamp = nowIso();
      const expiresAt = new Date(Date.now() + payload.expiresAtMinutes * 60 * 1000).toISOString();

      const response: PharmacyResponse = {
        id: generateId('resp'),
        prescriptionId: payload.prescriptionId,
        medicineRequestId: payload.medicineRequestId,
        pharmacyId: payload.pharmacyId,
        status: payload.status,
        timestamp,
        expiresAt
      };

      return { ...state, responses: [response, ...state.responses] };
    }
    default:
      return state;
  }
};

type AppStateContextValue = {
  state: AppState;
  setRole: (role: Role) => void;
  logout: () => void;
  createPrescription: (input: CreatePrescriptionInput) => void;
  respondToMedicine: (input: RespondToMedicineInput) => void;
};

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, defaultState);

  const value = useMemo(
    () => ({
      state,
      setRole: (role: Role) => dispatch({ type: 'set-role', role }),
      logout: () => dispatch({ type: 'logout' }),
      createPrescription: (payload: CreatePrescriptionInput) =>
        dispatch({ type: 'create-prescription', payload }),
      respondToMedicine: (payload: RespondToMedicineInput) =>
        dispatch({ type: 'respond-to-medicine', payload })
    }),
    [state]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = (): AppStateContextValue => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
};

export const statusLabel = (status: AvailabilityStatus) => {
  switch (status) {
    case 'available':
      return 'Available';
    case 'low':
      return 'Low stock';
    case 'equivalent':
      return 'Equivalent available';
    case 'not_available':
      return 'Not available';
    default:
      return 'Unknown';
  }
};

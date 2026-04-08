import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
  useIonRouter,
  useIonViewWillEnter
} from '@ionic/react';
import {
  closeOutline,
  chevronDownOutline,
  chevronUpOutline,
  createOutline,
  documentTextOutline,
  medicalOutline,
  pulseOutline,
  personOutline
} from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useHistory } from 'react-router';
import { useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import {
  api,
  ApiDoctorPatientAccessStatus,
  ApiDoctorPatientProfile,
  ApiFamilyMember,
  ApiMedicalHistoryEntry,
  ApiPrescription,
  ApiRehabEntry,
  ApiVisit
} from '../services/api';
import { useAuth } from '../state/AuthState';
import { getPrescriptionCode } from '../utils/prescriptionCode';
import { getPrescriptionStatusClassName, getPrescriptionStatusLabel } from '../utils/prescriptionStatus';
import { formatDateHaiti, formatDateTime } from '../utils/time';

const historyTypeLabel: Record<ApiMedicalHistoryEntry['type'], string> = {
  condition: 'Condition',
  allergy: 'Allergie',
  surgery: 'Chirurgie',
  hospitalization: 'Hospitalisation',
  medication: 'Traitement',
  note: 'Note'
};

const historyStatusLabel: Record<ApiMedicalHistoryEntry['status'], string> = {
  active: 'Actif',
  resolved: 'Resolue'
};

const historyStatusColor: Record<ApiMedicalHistoryEntry['status'], string> = {
  active: 'warning',
  resolved: 'success'
};

const visibilityLabel: Record<ApiMedicalHistoryEntry['visibility'], string> = {
  shared: 'Partage',
  patient_only: 'Patient seulement',
  doctor_only: 'Docteur seulement'
};

const visibilityColor: Record<ApiMedicalHistoryEntry['visibility'], string> = {
  shared: 'primary',
  patient_only: 'medium',
  doctor_only: 'dark'
};

const DoctorPatientPrescriptionsPage: React.FC = () => {
  const ionRouter = useIonRouter();
  const { token, user } = useAuth();
  const { patientName } = useParams<{ patientName: string }>();
  const location = useLocation();
  const [prescriptions, setPrescriptions] = useState<ApiPrescription[]>([]);
  const [visits, setVisits] = useState<ApiVisit[]>([]);
  const [familyMembers, setFamilyMembers] = useState<ApiFamilyMember[]>([]);
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<number | null>(null);
  const [medicalHistory, setMedicalHistory] = useState<ApiMedicalHistoryEntry[]>([]);
  const [rehabEntries, setRehabEntries] = useState<ApiRehabEntry[]>([]);
  const [patientProfile, setPatientProfile] = useState<ApiDoctorPatientProfile | null>(null);
  const [principalPatientProfile, setPrincipalPatientProfile] = useState<ApiDoctorPatientProfile | null>(null);
  const [isProfileCollapsed, setIsProfileCollapsed] = useState(false);
  const [isFamilyCollapsed, setIsFamilyCollapsed] = useState(true);
  const [isPrincipalCollapsed, setIsPrincipalCollapsed] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(true);
  const [isPrescriptionsCollapsed, setIsPrescriptionsCollapsed] = useState(true);
  const [isIdentityCollapsed, setIsIdentityCollapsed] = useState(true);
  const [isHealthCollapsed, setIsHealthCollapsed] = useState(true);
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(true);
  const [isHistoryModalContextCollapsed, setIsHistoryModalContextCollapsed] = useState(false);
  const [isHistoryModalDetailsCollapsed, setIsHistoryModalDetailsCollapsed] = useState(false);
  const [isHistoryModalDatesCollapsed, setIsHistoryModalDatesCollapsed] = useState(false);
  const [isHistoryModalLinkCollapsed, setIsHistoryModalLinkCollapsed] = useState(false);
  const [expandedLinkedPrescriptions, setExpandedLinkedPrescriptions] = useState<Record<number, boolean>>({});
  const [expandedLinkedRehab, setExpandedLinkedRehab] = useState<Record<number, boolean>>({});
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showRehabModal, setShowRehabModal] = useState(false);
  const [editingRehabId, setEditingRehabId] = useState<number | null>(null);
  const [savingRehab, setSavingRehab] = useState(false);
  const [rehabError, setRehabError] = useState<string | null>(null);
  const [isRehabCollapsed, setIsRehabCollapsed] = useState(true);
  const [editingHistoryId, setEditingHistoryId] = useState<number | null>(null);
  const [savingHistory, setSavingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyPrefillApplied, setHistoryPrefillApplied] = useState(false);
  const [isVisitsCollapsed, setIsVisitsCollapsed] = useState(true);
  const [accessStatus, setAccessStatus] = useState<ApiDoctorPatientAccessStatus | null>(null);
  const [accessRequestLoading, setAccessRequestLoading] = useState(false);
  const [accessRequestWhatsApp, setAccessRequestWhatsApp] = useState<string | null>(null);
  const [accessRequestError, setAccessRequestError] = useState<string | null>(null);

  const [historyForm, setHistoryForm] = useState<{
    family_member_id: string;
    prescription_id: string;
    type: ApiMedicalHistoryEntry['type'];
    title: string;
    details: string;
    started_at: string;
    ended_at: string;
    status: ApiMedicalHistoryEntry['status'];
    visibility: Extract<ApiMedicalHistoryEntry['visibility'], 'shared' | 'doctor_only'>;
  }>({
    family_member_id: '',
    prescription_id: '',
    type: 'condition',
    title: '',
    details: '',
    started_at: '',
    ended_at: '',
    status: 'active',
    visibility: 'shared'
  });
  const [rehabForm, setRehabForm] = useState<{
    medical_history_entry_id: string;
    prescription_id: string;
    sessions_per_week: string;
    duration_weeks: string;
    goals: string;
    exercise_type: string;
    exercise_reps: string;
    exercise_frequency: string;
    exercise_notes: string;
    pain_score: string;
    mobility_score: string;
    progress_notes: string;
    follow_up_date: string;
  }>({
    medical_history_entry_id: '',
    prescription_id: '',
    sessions_per_week: '',
    duration_weeks: '',
    goals: '',
    exercise_type: '',
    exercise_reps: '',
    exercise_frequency: '',
    exercise_notes: '',
    pain_score: '',
    mobility_score: '',
    progress_notes: '',
    follow_up_date: ''
  });

  const cacheKey = user ? `doctor-prescriptions-${user.id}` : null;
  const decodedPatientName = decodeURIComponent(patientName);
  const search = new URLSearchParams(location.search);
  const familyMemberId = search.get('familyMemberId') ? Number(search.get('familyMemberId')) : null;
  const patientUserIdFromQuery = search.get('patientUserId') ? Number(search.get('patientUserId')) : null;
  const prefillPrescriptionId = search.get('prescriptionId') ? Number(search.get('prescriptionId')) : null;
  const familyMemberName = search.get('familyMemberName')
    ? decodeURIComponent(search.get('familyMemberName') as string)
    : null;
  const historyIdFromQuery = search.get('historyId') ? Number(search.get('historyId')) : null;
  const routerHistory = useHistory();
  const effectiveFamilyMemberId = useMemo(() => {
    if (!familyMemberId) {
      return null;
    }
    return familyMembers.some((member) => member.id === familyMemberId) ? familyMemberId : null;
  }, [familyMemberId, familyMembers]);

  const derivedPatientUserId =
    prescriptions.find(
      (p) => p.patient_name.trim().toLowerCase() === decodedPatientName.trim().toLowerCase() && p.patient_user_id
    )?.patient_user_id ?? null;
  const patientUserId = patientUserIdFromQuery ?? derivedPatientUserId;
  const visitCacheKey = useMemo(() => {
    if (!user || !patientUserId) {
      return null;
    }
    return `doctor-visits-${user.id}-${patientUserId}-${effectiveFamilyMemberId ?? 'principal'}`;
  }, [user, patientUserId, effectiveFamilyMemberId]);

  const loadPrescriptions = useCallback(async () => {
    if (!cacheKey) {
      return;
    }

    const cachedRaw = localStorage.getItem(cacheKey);
    if (cachedRaw) {
      try {
        const cachedData = JSON.parse(cachedRaw) as ApiPrescription[];
        if (Array.isArray(cachedData)) {
          setPrescriptions(cachedData);
        }
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    if (!token) {
      return;
    }
    const data = await api.getDoctorPrescriptions(token);
    setPrescriptions(data);
    localStorage.setItem(cacheKey, JSON.stringify(data));
  }, [cacheKey, token]);

  const loadVisits = useCallback(async () => {
    if (!token || !patientUserId) {
      setVisits([]);
      return;
    }

    if (visitCacheKey) {
      const cachedRaw = localStorage.getItem(visitCacheKey);
      if (cachedRaw) {
        try {
          const cachedData = JSON.parse(cachedRaw) as ApiVisit[];
          if (Array.isArray(cachedData)) {
            setVisits(cachedData);
          }
        } catch {
          localStorage.removeItem(visitCacheKey);
        }
      }
    }

    const params: { family_member_id?: number | null } = {};
    if (typeof effectiveFamilyMemberId === 'number') {
      params.family_member_id = effectiveFamilyMemberId;
    }

    const data = await api.getDoctorVisits(token, patientUserId, params);
    setVisits(data);
    if (visitCacheKey) {
      localStorage.setItem(visitCacheKey, JSON.stringify(data));
    }
  }, [effectiveFamilyMemberId, patientUserId, token, visitCacheKey]);

  useEffect(() => {
    loadPrescriptions().catch(() => undefined);
  }, [loadPrescriptions]);

  useIonViewWillEnter(() => {
    loadPrescriptions().catch(() => undefined);
    loadVisits().catch(() => undefined);
  });

  useEffect(() => {
    loadVisits().catch(() => undefined);
  }, [loadVisits]);


  useEffect(() => {
    if (!token || !patientUserId) {
      setFamilyMembers([]);
      return;
    }
    api.getDoctorPatientFamilyMembers(token, patientUserId).then(setFamilyMembers).catch(() => setFamilyMembers([]));
  }, [patientUserId, token]);

  useEffect(() => {
    if (!token || !patientUserId) {
      setPatientProfile(null);
      return;
    }
    api.getDoctorPatientProfile(token, patientUserId).then(setPatientProfile).catch(() => setPatientProfile(null));
  }, [patientUserId, token]);

  useEffect(() => {
    if (!token || !patientUserId) {
      setAccessStatus(null);
      return;
    }
    api.getDoctorPatientAccessStatus(token, patientUserId)
      .then(setAccessStatus)
      .catch(() => setAccessStatus(null));
  }, [patientUserId, token]);

  const principalPatientUserId = useMemo(() => {
    if (familyMembers.length === 0) {
      return null;
    }
    const candidate = familyMembers[0]?.patient_user_id ?? null;
    return candidate && Number.isFinite(candidate) ? Number(candidate) : null;
  }, [familyMembers]);

  useEffect(() => {
    if (!token || !principalPatientUserId || !patientUserId || principalPatientUserId === patientUserId) {
      setPrincipalPatientProfile(null);
      return;
    }
    api
      .getDoctorPatientProfile(token, principalPatientUserId)
      .then(setPrincipalPatientProfile)
      .catch(() => setPrincipalPatientProfile(null));
  }, [principalPatientUserId, patientUserId, token]);

  useEffect(() => {
    if (!token || !patientUserId) {
      setMedicalHistory([]);
      return;
    }

    api
      .getDoctorPatientMedicalHistory(token, patientUserId, {
        family_member_id: effectiveFamilyMemberId ?? undefined
      })
      .then((rows) => {
        const sorted = [...rows].sort((a, b) => {
          const aDate = a.started_at ?? a.created_at;
          const bDate = b.started_at ?? b.created_at;
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });
        setMedicalHistory(sorted);
      })
      .catch(() => setMedicalHistory([]));
  }, [effectiveFamilyMemberId, patientUserId, token]);

  useEffect(() => {
    if (!token || !patientUserId) {
      setRehabEntries([]);
      return;
    }

    api
      .getDoctorPatientRehabEntries(token, patientUserId)
      .then((rows) => {
        const sorted = [...rows].sort((a, b) => {
          const aDate = a.follow_up_date ?? a.created_at;
          const bDate = b.follow_up_date ?? b.created_at;
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });
        setRehabEntries(sorted);
      })
      .catch(() => setRehabEntries([]));
  }, [patientUserId, token]);

  const patientPrescriptions = useMemo(() => {
    const byUserOrName = prescriptions.filter((p) => {
      if (patientUserId) {
        return p.patient_user_id === patientUserId;
      }
      return p.patient_name.trim().toLowerCase() === decodedPatientName.trim().toLowerCase();
    });

    const hasOwnFamilyMembers = familyMembers.length > 0;

    return byUserOrName
      .filter((p) => {
        if (effectiveFamilyMemberId) {
          return p.family_member_id === effectiveFamilyMemberId;
        }
        return hasOwnFamilyMembers ? !p.family_member_id : true;
      })
      .sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
  }, [decodedPatientName, effectiveFamilyMemberId, familyMembers.length, patientUserId, prescriptions]);

  const patientVisits = useMemo(() => {
    return [...visits].sort((a, b) => {
      const aDate = a.visit_date ? new Date(a.visit_date) : new Date(a.created_at);
      const bDate = b.visit_date ? new Date(b.visit_date) : new Date(b.created_at);
      return bDate.getTime() - aDate.getTime();
    });
  }, [visits]);


  const totalMedicinesRequested = useMemo(
    () =>
      patientPrescriptions.reduce(
        (sum, prescription) =>
          sum +
          prescription.medicine_requests.reduce((inner, med) => inner + (med.quantity ?? 1), 0),
        0
      ),
    [patientPrescriptions]
  );

  // const selectedFamilyMember = useMemo(
  //   () => familyMembers.find((member) => member.id === selectedFamilyMemberId) ?? null,
  //   [familyMembers, selectedFamilyMemberId]
  // );
  const selectedFamilyMember = useMemo(() => {
    if (selectedFamilyMemberId === null) return null;

    // Check if it's a normal family member
    const member = familyMembers.find((member) => member.id === selectedFamilyMemberId);
    if (member) return member;

    // If not found, check if it's the principal patient
    if (principalPatientProfile && principalPatientProfile.id === selectedFamilyMemberId) {
      return {
        id: principalPatientProfile.id,
        name: principalPatientProfile.name,
        age: principalPatientProfile.age,
        gender: principalPatientProfile.gender,
        relationship: 'patient principal',
        allergies: principalPatientProfile.allergies,
        chronic_diseases: principalPatientProfile.chronic_diseases,
        blood_type: principalPatientProfile.blood_type,
        emergency_notes: principalPatientProfile.emergency_notes
      } as any;
    }

    return null;
  }, [familyMembers, selectedFamilyMemberId, principalPatientProfile]);




  const displayedFamilyMembers = useMemo(
    () => familyMembers.filter((member) => (member.linked_user_id ?? null) !== (patientUserId ?? null)),
    [familyMembers, patientUserId]
  );


  // useEffect(() => {
  //   if (!selectedFamilyMemberId) {
  //     return;
  //   }
  //   if (!displayedFamilyMembers.some((member) => member.id === selectedFamilyMemberId)) {
  //     setSelectedFamilyMemberId(null);
  //   }
  // }, [displayedFamilyMembers, selectedFamilyMemberId]);
useEffect(() => {
  if (!selectedFamilyMemberId) {
    return;
  }

  const isDisplayedFamilyMember = displayedFamilyMembers.some(
    (member) => member.id === selectedFamilyMemberId
  );

  const isPrincipalPatient = principalPatientProfile?.id === selectedFamilyMemberId;

  if (!isDisplayedFamilyMember && !isPrincipalPatient) {
    setSelectedFamilyMemberId(null);
  }
}, [displayedFamilyMembers, principalPatientProfile, selectedFamilyMemberId]);



  const validFamilyMemberIds = useMemo(() => new Set(familyMembers.map((member) => member.id)), [familyMembers]);
  const profileFamilyMember = useMemo(
    () => familyMembers.find((member) => member.id === (effectiveFamilyMemberId ?? selectedFamilyMemberId)) ?? null,
    [effectiveFamilyMemberId, familyMembers, selectedFamilyMemberId]
  );
  const scopedMedicalHistory = useMemo(
    () => {
      if (effectiveFamilyMemberId) {
        return medicalHistory.filter((entry) => entry.family_member_id === effectiveFamilyMemberId);
      }
      const hasOwnFamilyMembers = familyMembers.length > 0;
      return hasOwnFamilyMembers ? medicalHistory.filter((entry) => !entry.family_member_id) : medicalHistory;
    },
    [effectiveFamilyMemberId, familyMembers.length, medicalHistory]
  );
  const historyCodesByPrescriptionId = useMemo(() => {
    const map: Record<number, string[]> = {};
    scopedMedicalHistory.forEach((entry) => {
      const code = entry.entry_code ?? `MH-${entry.id}`;
      const linkedPrescriptionIds = (entry.linked_prescriptions ?? []).map((rx) => rx.id);
      if (linkedPrescriptionIds.length === 0 && entry.prescription_id) {
        linkedPrescriptionIds.push(entry.prescription_id);
      }
      linkedPrescriptionIds.forEach((prescriptionId) => {
        if (!map[prescriptionId]) {
          map[prescriptionId] = [];
        }
        if (!map[prescriptionId].includes(code)) {
          map[prescriptionId].push(code);
        }
      });
    });
    return map;
  }, [scopedMedicalHistory]);

  const patientVisitTimeline = useMemo(() => {
    return patientVisits.map((visit) => {
      const linkedHistoryCodes = historyCodesByPrescriptionId[visit.id] ?? [];
      const linkedHistoryEntries = scopedMedicalHistory.filter((entry) => {
        if (entry.prescription_id === visit.id) {
          return true;
        }
        return (entry.linked_prescriptions ?? []).some((rx) => rx.id === visit.id);
      });

      const visitContextLabel = effectiveFamilyMemberId && profileFamilyMember
        ? `${profileFamilyMember.name}${profileFamilyMember.relationship ? ` (${profileFamilyMember.relationship})` : ''}`
        : familyMemberName ?? decodedPatientName;

      const firstHistoryEntry = linkedHistoryEntries[0];
      const visitTypeLabel = visit.visit_type?.trim()
        ? visit.visit_type
        : firstHistoryEntry
          ? historyTypeLabel[firstHistoryEntry.type] ?? 'Consultation'
          : 'Consultation';

      return {
        visit,
        linkedHistoryCodes,
        linkedHistoryEntries,
        visitContextLabel,
        visitTypeLabel,
        prescriptionsCount: visit.linked_prescriptions_count ?? 0,
        historyCount: visit.linked_medical_history_count ?? 0,
        rehabCount: visit.linked_rehab_entries_count ?? 0
      };
    });
  }, [
    patientVisits,
    historyCodesByPrescriptionId,
    scopedMedicalHistory,
    effectiveFamilyMemberId,
    profileFamilyMember,
    decodedPatientName,
    familyMemberName
  ]);

  const contextQuerySuffix = useMemo(() => {
    const params = new URLSearchParams();
    if (patientUserId) {
      params.set('patientUserId', String(patientUserId));
    }
    if (effectiveFamilyMemberId) {
      params.set('familyMemberId', String(effectiveFamilyMemberId));
    }
    if (familyMemberName) {
      params.set('familyMemberName', familyMemberName);
    }
    if (decodedPatientName) {
      params.set('patient', decodedPatientName);
    }
    return params.toString() ? `?${params.toString()}` : '';
  }, [patientUserId, effectiveFamilyMemberId, familyMemberName, decodedPatientName]);
  const navigateToHistoryDetail = useCallback(
    (entryId: number | null | undefined) => {
      if (!entryId || entryId <= 0) {
        return;
      }
      ionRouter.push(`/doctor/medical-history/${entryId}${contextQuerySuffix}`, 'forward', 'push');
    },
    [contextQuerySuffix, ionRouter]
  );
  const navigateToVisitDetail = useCallback(
    (visitId: number | null | undefined) => {
      if (!visitId || visitId <= 0) {
        return;
      }
      ionRouter.push(`/doctor/visits/${visitId}${contextQuerySuffix}`, 'forward', 'push');
    },
    [contextQuerySuffix, ionRouter]
  );
  const selectedPrescriptionForHistory = useMemo(() => {
    const id = Number(historyForm.prescription_id);
    if (!Number.isFinite(id) || id <= 0) {
      return null;
    }
    return patientPrescriptions.find((prescription) => prescription.id === id) ?? null;
  }, [historyForm.prescription_id, patientPrescriptions]);
  const activePatientName = profileFamilyMember?.name ?? familyMemberName ?? decodedPatientName;
  const activeProfilePhotoUrl = profileFamilyMember?.photo_url ?? patientProfile?.profile_photo_url ?? null;
  const activeDateOfBirth = profileFamilyMember?.date_of_birth ?? patientProfile?.date_of_birth ?? null;
  const computedActiveAge = useMemo(() => {
    const dob = (activeDateOfBirth || '').trim();
    if (!dob) return null;
    const date = new Date(`${dob.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - date.getFullYear();
    const monthDiff = now.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) {
      age -= 1;
    }
    return age >= 0 ? age : null;
  }, [activeDateOfBirth]);
  const activeAge = profileFamilyMember?.age ?? patientProfile?.age ?? computedActiveAge;
  const patientClaimLink = useMemo(() => {
    if (profileFamilyMember) return '';
    if (!patientProfile?.claim_token) return '';
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/claim-account?token=${encodeURIComponent(patientProfile.claim_token)}`;
  }, [patientProfile?.claim_token, profileFamilyMember]);
  const patientClaimQrUrl = useMemo(() => {
    if (!patientClaimLink) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(patientClaimLink)}`;
  }, [patientClaimLink]);
  const toggleLinkedPrescriptionDetails = (historyEntryId: number) => {
    setExpandedLinkedPrescriptions((prev) => ({
      ...prev,
      [historyEntryId]: !prev[historyEntryId]
    }));
  };

  const toggleLinkedRehabDetails = (historyEntryId: number) => {
    setExpandedLinkedRehab((prev) => ({
      ...prev,
      [historyEntryId]: !prev[historyEntryId]
    }));
  };

  const isRequestPending = Boolean(accessStatus?.has_pending_request);
  const showClinicalCards = accessStatus?.has_link === true;

  const handleRequestAccess = useCallback(async () => {
    if (!token || !patientUserId) {
      setAccessRequestError('Patient introuvable.');
      return;
    }
    setAccessRequestLoading(true);
    setAccessRequestError(null);
    setAccessRequestWhatsApp(null);
    try {
      const result = await api.createDoctorPatientAccessRequest(token, patientUserId);
      if (result.whatsapp_url) {
        setAccessRequestWhatsApp(result.whatsapp_url);
        window.open(result.whatsapp_url, '_blank');
      } else {
        setAccessRequestError('Le patient n’a pas de numero WhatsApp valide.');
      }
      setAccessStatus((prev) => (prev ? { ...prev, has_pending_request: true } : prev));
    } catch (err) {
      setAccessRequestError(err instanceof Error ? err.message : "Impossible d'envoyer la demande.");
    } finally {
      setAccessRequestLoading(false);
    }
  }, [patientUserId, token]);

  const resetHistoryForm = () => {
    setHistoryForm({
      family_member_id: effectiveFamilyMemberId ? String(effectiveFamilyMemberId) : '',
      prescription_id: prefillPrescriptionId ? String(prefillPrescriptionId) : '',
      type: 'condition',
      title: '',
      details: '',
      started_at: '',
      ended_at: '',
      status: 'active',
      visibility: 'shared'
    });
    setEditingHistoryId(null);
  };

  const resetRehabForm = () => {
    setRehabForm({
      medical_history_entry_id: '',
      prescription_id: '',
      sessions_per_week: '',
      duration_weeks: '',
      goals: '',
      exercise_type: '',
      exercise_reps: '',
      exercise_frequency: '',
      exercise_notes: '',
      pain_score: '',
      mobility_score: '',
      progress_notes: '',
      follow_up_date: ''
    });
    setEditingRehabId(null);
  };

  useEffect(() => {
    resetHistoryForm();
    setHistoryPrefillApplied(false);
  }, [effectiveFamilyMemberId, prefillPrescriptionId]);

  useEffect(() => {
    if (historyPrefillApplied || !prefillPrescriptionId || patientPrescriptions.length === 0) {
      return;
    }

    const selectedPrescription = patientPrescriptions.find((p) => p.id === prefillPrescriptionId);
    if (!selectedPrescription) {
      return;
    }

    setHistoryForm((prev) => ({
      ...prev,
      prescription_id: String(selectedPrescription.id),
      type: 'medication',
      title: prev.title.trim() ? prev.title : `Suivi ordonnance #${selectedPrescription.id}`,
      details: prev.details.trim()
        ? prev.details
        : `Entree liee a l'ordonnance du ${formatDateHaiti(selectedPrescription.requested_at)}.`
    }));
    setShowHistoryModal(true);
    setHistoryPrefillApplied(true);
  }, [historyPrefillApplied, patientPrescriptions, prefillPrescriptionId]);

  const startHistoryEdit = useCallback(
    (entry: ApiMedicalHistoryEntry) => {
      setEditingHistoryId(entry.id);
      const editableFamilyMemberId =
        entry.family_member_id && validFamilyMemberIds.has(entry.family_member_id)
          ? String(entry.family_member_id)
          : '';
      setHistoryForm({
        family_member_id: editableFamilyMemberId,
      prescription_id: entry.prescription_id ? String(entry.prescription_id) : '',
      type: entry.type,
      title: entry.title,
      details: entry.details ?? '',
      started_at: entry.started_at ?? '',
      ended_at: entry.ended_at ?? '',
      status: entry.status,
        visibility: entry.visibility === 'patient_only' ? 'shared' : entry.visibility
      });
      setShowHistoryModal(true);
      setIsHistoryModalContextCollapsed(false);
      setIsHistoryModalDetailsCollapsed(false);
      setIsHistoryModalDatesCollapsed(false);
      setIsHistoryModalLinkCollapsed(false);
    },
    [validFamilyMemberIds]
  );

  const startRehabEdit = (entry: ApiRehabEntry) => {
    setEditingRehabId(entry.id);
    setRehabForm({
      medical_history_entry_id: entry.medical_history_entry_id ? String(entry.medical_history_entry_id) : '',
      prescription_id: entry.prescription_id ? String(entry.prescription_id) : '',
      sessions_per_week: entry.sessions_per_week === null || entry.sessions_per_week === undefined ? '' : String(entry.sessions_per_week),
      duration_weeks: entry.duration_weeks === null || entry.duration_weeks === undefined ? '' : String(entry.duration_weeks),
      goals: entry.goals ?? '',
      exercise_type: entry.exercise_type ?? '',
      exercise_reps: entry.exercise_reps ?? '',
      exercise_frequency: entry.exercise_frequency ?? '',
      exercise_notes: entry.exercise_notes ?? '',
      pain_score: entry.pain_score === null || entry.pain_score === undefined ? '' : String(entry.pain_score),
      mobility_score: entry.mobility_score ?? '',
      progress_notes: entry.progress_notes ?? '',
      follow_up_date: entry.follow_up_date ?? ''
    });
    setShowRehabModal(true);
    setRehabError(null);
  };

  useEffect(() => {
    if (!historyIdFromQuery || historyIdFromQuery <= 0) {
      return;
    }
    const targetEntry = scopedMedicalHistory.find((entry) => entry.id === historyIdFromQuery);
    if (!targetEntry) {
      return;
    }
    startHistoryEdit(targetEntry);
    const params = new URLSearchParams(location.search);
    if (params.has('historyId')) {
      params.delete('historyId');
      routerHistory.replace({
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : ''
      });
    }
  }, [
    historyIdFromQuery,
    scopedMedicalHistory,
    startHistoryEdit,
    location.pathname,
    location.search,
    routerHistory
  ]);

  const saveHistory = async () => {
    if (!token || !historyForm.title.trim()) {
      return;
    }

    if (!patientUserId) {
      setHistoryError("Impossible d'ajouter un historique: patient introuvable.");
      return;
    }

    setSavingHistory(true);
    setHistoryError(null);
    try {
      const parsedFamilyMemberId = historyForm.family_member_id ? Number(historyForm.family_member_id) : null;
      const safeFamilyMemberId =
        parsedFamilyMemberId && validFamilyMemberIds.has(parsedFamilyMemberId) ? parsedFamilyMemberId : null;
      const payload = {
        family_member_id: safeFamilyMemberId,
        prescription_id: historyForm.prescription_id ? Number(historyForm.prescription_id) : null,
        type: historyForm.type,
        title: historyForm.title.trim(),
        details: historyForm.details.trim() || null,
        started_at: historyForm.started_at || null,
        ended_at: historyForm.ended_at || null,
        status: historyForm.status,
        visibility: historyForm.visibility
      };

      let updatedRows: ApiMedicalHistoryEntry[] = [];
      if (editingHistoryId === null) {
        await api.createDoctorPatientMedicalHistory(token, patientUserId, payload);
      } else {
        await api.updateDoctorPatientMedicalHistory(token, patientUserId, editingHistoryId, payload);
      }

      updatedRows = await api.getDoctorPatientMedicalHistory(token, patientUserId, {
        family_member_id: effectiveFamilyMemberId ?? undefined
      });

      setMedicalHistory(
        [...updatedRows].sort((a, b) => {
          const aDate = a.started_at ?? a.created_at;
          const bDate = b.started_at ?? b.created_at;
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        })
      );

      setShowHistoryModal(false);
      resetHistoryForm();
      if (editingHistoryId) {
        navigateToHistoryDetail(editingHistoryId);
      }
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Echec d'enregistrement de l'historique.");
    } finally {
      setSavingHistory(false);
    }
  };

  const saveRehab = async () => {
    if (!token || !patientUserId) {
      return;
    }

    setSavingRehab(true);
    setRehabError(null);

    const payload = {
      medical_history_entry_id: rehabForm.medical_history_entry_id ? Number(rehabForm.medical_history_entry_id) : null,
      prescription_id: rehabForm.prescription_id ? Number(rehabForm.prescription_id) : null,
      sessions_per_week: rehabForm.sessions_per_week.trim() ? Number(rehabForm.sessions_per_week) : null,
      duration_weeks: rehabForm.duration_weeks.trim() ? Number(rehabForm.duration_weeks) : null,
      goals: rehabForm.goals.trim() || null,
      exercise_type: rehabForm.exercise_type.trim() || null,
      exercise_reps: rehabForm.exercise_reps.trim() || null,
      exercise_frequency: rehabForm.exercise_frequency.trim() || null,
      exercise_notes: rehabForm.exercise_notes.trim() || null,
      pain_score: rehabForm.pain_score.trim() ? Number(rehabForm.pain_score) : null,
      mobility_score: rehabForm.mobility_score.trim() || null,
      progress_notes: rehabForm.progress_notes.trim() || null,
      follow_up_date: rehabForm.follow_up_date || null
    };

    try {
      if (editingRehabId === null) {
        await api.createDoctorPatientRehabEntry(token, patientUserId, payload);
      } else {
        await api.updateDoctorPatientRehabEntry(token, patientUserId, editingRehabId, payload);
      }

      const rows = await api.getDoctorPatientRehabEntries(token, patientUserId);
      const sorted = [...rows].sort((a, b) => {
        const aDate = a.follow_up_date ?? a.created_at;
        const bDate = b.follow_up_date ?? b.created_at;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
      setRehabEntries(sorted);
      setShowRehabModal(false);
      resetRehabForm();
    } catch (err) {
      setRehabError(err instanceof Error ? err.message : "Echec d'enregistrement du suivi de reeducation.");
    } finally {
      setSavingRehab(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/doctor/patients" />
          </IonButtons>
          <IonTitle>{familyMemberName ?? decodedPatientName}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={personOutline} /> Profil patient
              </IonCardTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {!showClinicalCards ? (
                  <IonButton
                    size="small"
                    fill="outline"
                    disabled={accessRequestLoading || isRequestPending}
                    onClick={() => handleRequestAccess().catch(() => undefined)}
                  >
                    {accessRequestLoading
                      ? 'Envoi...'
                      : isRequestPending
                      ? 'Demande en attente'
                      : "Demande d'acces"}
                  </IonButton>
                ) : null}
                <IonButton fill="clear" size="small" onClick={() => setIsProfileCollapsed((prev) => !prev)}>
                  <IonIcon icon={isProfileCollapsed ? chevronDownOutline : chevronUpOutline} />
                </IonButton>
              </div>
            </div>
          </IonCardHeader>
          {!isProfileCollapsed ? (
            <IonCardContent>
              {!showClinicalCards && accessRequestError ? (
                <IonText color="danger">
                  <p>{accessRequestError}</p>
                </IonText>
              ) : null}
              {!showClinicalCards && accessRequestWhatsApp ? (
                <IonText color="success">
                  <p>
                    Lien WhatsApp genere.{' '}
                    <a href={accessRequestWhatsApp} target="_blank" rel="noreferrer">
                      Ouvrir WhatsApp
                    </a>
                  </p>
                </IonText>
              ) : null}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    border: '1px solid var(--ion-color-light-shade)',
                    borderRadius: '12px',
                    padding: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      {activeProfilePhotoUrl ? (
                        <img
                          src={activeProfilePhotoUrl}
                          alt={activePatientName}
                          style={{
                            width: '42px',
                            height: '42px',
                            objectFit: 'cover',
                            borderRadius: '50%',
                            border: '1px solid #dbe7ef'
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            display: 'grid',
                            placeItems: 'center',
                            background: '#dbeafe',
                            color: '#1e40af'
                          }}
                        >
                          <IonIcon icon={personOutline} />
                        </div>
                      )}
                      <div>
                        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{activePatientName}</h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '1rem' }}>
                          {patientProfile?.phone ?? 'Telephone: N/D'}
                        </p>
                        <p style={{ margin: '2px 0 0 0', fontSize: '1rem' }}>
                          {patientProfile?.whatsapp ?? 'WhatsApp: N/D'}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '6px' }}>
                      <IonBadge color="light">
                        {activeAge ?? 'Age ?'} {activeAge !== null ? 'ans' : ''}
                      </IonBadge>
                      {!profileFamilyMember ? (
                        <IonBadge color="light">{patientProfile?.ninu ? 'NINU renseigne' : 'NINU manquant'}</IonBadge>
                      ) : null}
                      {profileFamilyMember ? <IonBadge color="medium">Membre de famille</IonBadge> : null}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <IonButton
                    size="small"
                    onClick={() => {
                      const params = new URLSearchParams();
                      params.set('patient', decodedPatientName);
                      if (effectiveFamilyMemberId) {
                        params.set('familyMemberId', String(effectiveFamilyMemberId));
                      }
                      if (familyMemberName) {
                        params.set('familyMemberName', familyMemberName);
                      }
                      ionRouter.push(`/doctor/create-prescription?${params.toString()}`, 'forward', 'push');
                    }}
                  >
                    ORDONNANCE +
                  </IonButton>
                  <IonButton
                    size="small"
                    fill="outline"
                    onClick={() => {
                      resetHistoryForm();
                      setShowHistoryModal(true);
                    }}
                    disabled={!patientUserId}
                  >
                    HISTORIQUE +
                  </IonButton>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                  <div style={{ border: '1px solid var(--ion-color-light-shade)', borderRadius: '12px', padding: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>Identite</p>
                      <IonButton fill="clear" size="small" onClick={() => setIsIdentityCollapsed((prev) => !prev)}>
                        <IonIcon icon={isIdentityCollapsed ? chevronDownOutline : chevronUpOutline} />
                      </IonButton>
                    </div>
                    {!isIdentityCollapsed ? (
                      <>
                        <p>
                          <strong>Date de naissance:</strong>{' '}
                          {profileFamilyMember?.date_of_birth
                            ? formatDateHaiti(profileFamilyMember.date_of_birth)
                            : patientProfile?.date_of_birth
                            ? formatDateHaiti(patientProfile.date_of_birth)
                            : 'N/D'}
                        </p>
                        <p>
                          <strong>Genre:</strong>{' '}
                          {profileFamilyMember
                            ? profileFamilyMember.gender === 'male'
                              ? 'M'
                              : profileFamilyMember.gender === 'female'
                              ? 'F'
                              : 'Non precise'
                            : patientProfile?.gender === 'male'
                            ? 'M'
                            : patientProfile?.gender === 'female'
                            ? 'F'
                            : 'Non precise'}
                        </p>
                        <p><strong>Adresse:</strong> {profileFamilyMember ? 'N/D' : patientProfile?.address ?? 'N/D'}</p>
                        {!profileFamilyMember ? <p><strong>NINU:</strong> {patientProfile?.ninu ?? 'N/D'}</p> : null}
                        {!profileFamilyMember ? (
                          <div style={{ marginTop: '10px', border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '8px' }}>
                            <p style={{ margin: '0 0 4px 0' }}>
                              <strong>Token reclamation:</strong> {patientProfile?.claim_token ?? 'N/D'}
                            </p>
                            {patientProfile?.claimed_at ? (
                              <p style={{ margin: 0, color: '#16a34a', fontSize: '0.9rem' }}>
                                Compte deja reclame le {formatDateTime(patientProfile.claimed_at)}
                              </p>
                            ) : patientClaimLink ? (
                              <>
                                <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#64748b', wordBreak: 'break-all' }}>
                                  {patientClaimLink}
                                </p>
                                <img
                                  src={patientClaimQrUrl}
                                  alt="QR reclamation compte patient"
                                  style={{ width: '160px', height: '160px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #dbe7ef' }}
                                />
                              </>
                            ) : (
                              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                                Aucun token actif.
                              </p>
                            )}
                          </div>
                        ) : null}
                        {profileFamilyMember ? (
                          <p><strong>Relation:</strong> {profileFamilyMember.relationship ?? 'Non precisee'}</p>
                        ) : null}
                        {profileFamilyMember ? (
                          <p><strong>Patient principal:</strong> {decodedPatientName}</p>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                  <div style={{ border: '1px solid var(--ion-color-light-shade)', borderRadius: '12px', padding: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>Sante</p>
                      <IonButton fill="clear" size="small" onClick={() => setIsHealthCollapsed((prev) => !prev)}>
                        <IonIcon icon={isHealthCollapsed ? chevronDownOutline : chevronUpOutline} />
                      </IonButton>
                    </div>
                    {!isHealthCollapsed ? (
                      <>
                        <p><strong>Groupe sanguin:</strong> {profileFamilyMember?.blood_type ?? patientProfile?.blood_type ?? 'Non precise'}</p>
                        <p><strong>Allergies:</strong> {profileFamilyMember?.allergies ?? patientProfile?.allergies ?? 'Aucune'}</p>
                        <p><strong>Antecedents medicaux:</strong> {profileFamilyMember?.chronic_diseases ?? patientProfile?.chronic_diseases ?? 'Aucun'}</p>
                        <p><strong>Antecedents chirurgicaux:</strong> {profileFamilyMember?.surgical_history ?? patientProfile?.surgical_history ?? 'Aucun'}</p>
                        <p><strong>Notes urgence:</strong> {profileFamilyMember?.emergency_notes ?? patientProfile?.emergency_notes ?? 'Aucune'}</p>
                      </>
                    ) : null}
                  </div>
                </div>

                <div style={{ border: '1px solid var(--ion-color-light-shade)', borderRadius: '12px', padding: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>Statistiques</p>
                    <IonButton fill="clear" size="small" onClick={() => setIsStatsCollapsed((prev) => !prev)}>
                      <IonIcon icon={isStatsCollapsed ? chevronDownOutline : chevronUpOutline} />
                    </IonButton>
                  </div>
                  {!isStatsCollapsed ? (
                    <>
                      <p><strong>Total ordonnances:</strong> {patientPrescriptions.length}</p>
                      <p><strong>Total medicaments demandes:</strong> {totalMedicinesRequested}</p>
                      <p>
                        <strong>Derniere ordonnance:</strong>{' '}
                        {patientPrescriptions[0] ? formatDateTime(patientPrescriptions[0].requested_at) : 'Aucune'}
                      </p>
                    </>
                  ) : null}
                </div>
              </div>
            </IonCardContent>
          ) : null}
        </IonCard>

        {!effectiveFamilyMemberId ? (
          <IonCard className="surface-card">
            <IonCardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <IonCardTitle>Membres de famille</IonCardTitle>
                <IonButton fill="clear" size="small" onClick={() => setIsFamilyCollapsed((prev) => !prev)}>
                  <IonIcon icon={isFamilyCollapsed ? chevronDownOutline : chevronUpOutline} />
                </IonButton>
              </div>
            </IonCardHeader>
            {!isFamilyCollapsed ? (
              <IonCardContent>
                {displayedFamilyMembers.length === 0 && (!principalPatientProfile || principalPatientProfile.id === patientUserId) ? (
                  <IonText color="medium">
                    <p>Aucun membre de famille.</p>
                  </IonText>
                ) : (
                  <>
                    <IonList>
                      {principalPatientProfile && principalPatientProfile.id !== patientUserId ? (
                        <IonCard className="surface-card" style={{ marginBottom: '8px' }}>
                          <IonCardHeader>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              <p style={{ margin: 0, fontWeight: 600 }}>
                                Patient principal · {principalPatientProfile.name}
                              </p>
                              <IonButton
                                fill="clear"
                                size="small"
                                onClick={() => setIsPrincipalCollapsed((prev) => !prev)}
                              >
                                <IonIcon icon={isPrincipalCollapsed ? chevronDownOutline : chevronUpOutline} />
                              </IonButton>
                            </div>
                          </IonCardHeader>
                          {!isPrincipalCollapsed ? (
                            <IonCardContent>
                              <p><strong>Nom:</strong> {principalPatientProfile.name}</p>
                              <p><strong>Age:</strong> {principalPatientProfile.age ?? 'Non précisé'}</p>
                              <p><strong>Genre:</strong> {principalPatientProfile.gender ?? 'Non précisé'}</p>
                              <p><strong>Adresse:</strong> {principalPatientProfile.address ?? 'Non renseignée'}</p>
                              <p><strong>WhatsApp:</strong> {principalPatientProfile.whatsapp ?? 'Non renseigné'}</p>
                              <p><strong>NINU:</strong> {principalPatientProfile.ninu ?? 'N/D'}</p>
                              <p><strong>Créé par:</strong> {principalPatientProfile.whatsapp ? 'Appelé via WhatsApp' : 'Médecin'}</p>
                            </IonCardContent>
                          ) : null}
                        </IonCard>
                      ) : null}
                      {displayedFamilyMembers.map((member) => (
                        <IonItem
                          key={member.id}
                          button
                          detail
                          lines="full"
                          onClick={() =>
                            setSelectedFamilyMemberId((prev) => (prev === member.id ? null : member.id))
                          }
                        >
                          <IonLabel>
                            {member.name}
                            {member.relationship ? ` (${member.relationship})` : ''}
                          </IonLabel>
                        </IonItem>
                      ))}
                    </IonList>
                    {selectedFamilyMember ? (
                      <IonCard className="surface-card" style={{ marginTop: '8px' }}>
                        <IonCardContent>
                          <p><strong>Nom:</strong> {selectedFamilyMember.name}</p>
                          <p><strong>Age:</strong> {selectedFamilyMember.age ?? 'Non precise'}</p>
                          <p><strong>Genre:</strong> {selectedFamilyMember.gender ?? 'Non precise'}</p>
                          <p><strong>Relation:</strong> {selectedFamilyMember.relationship ?? 'Non precisee'}</p>
                          <p><strong>Allergies:</strong> {selectedFamilyMember.allergies ?? 'Aucune'}</p>
                          <p><strong>Maladies chroniques:</strong> {selectedFamilyMember.chronic_diseases ?? 'Aucune'}</p>
                          <p><strong>Groupe sanguin:</strong> {selectedFamilyMember.blood_type ?? 'Non precise'}</p>
                          <p><strong>Notes urgence:</strong> {selectedFamilyMember.emergency_notes ?? 'Aucune'}</p>
                        </IonCardContent>
                      </IonCard>
                    ) : null}
                  </>
                )}
              </IonCardContent>
            ) : null}
          </IonCard>
        ) : null}

        {showClinicalCards ? (
        <IonCard className="surface-card">
          <IonCardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={documentTextOutline} /> Visites
              </IonCardTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonButton
                  size="small"
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (patientUserId) {
                      params.set('patientUserId', String(patientUserId));
                    }
                    if (effectiveFamilyMemberId) {
                      params.set('familyMemberId', String(effectiveFamilyMemberId));
                    }
                    if (familyMemberName) {
                      params.set('familyMemberName', familyMemberName);
                    }
                    if (decodedPatientName) {
                      params.set('patient', decodedPatientName);
                    }
                    const suffix = params.toString() ? `?${params.toString()}` : '';
                    ionRouter.push(`/doctor/visits/new${suffix}`, 'forward', 'push');
                  }}
                >
                  Ajouter
                </IonButton>
                <IonButton fill="clear" size="small" onClick={() => setIsVisitsCollapsed((prev) => !prev)}>
                  <IonIcon icon={isVisitsCollapsed ? chevronDownOutline : chevronUpOutline} />
                </IonButton>
              </div>
            </div>
          </IonCardHeader>
          {!isVisitsCollapsed ? (
            <IonCardContent>
              {patientVisits.length === 0 ? (
                <IonText color="medium">
                  <p>Aucune visite enregistree pour ce patient.</p>
                </IonText>
              ) : (
                <IonList>
                  {patientVisitTimeline.map((item) => {
                    const { visit, linkedHistoryCodes, linkedHistoryEntries, visitTypeLabel } = item;
                    return (
                      <IonItem
                        key={`visit-${visit.id}`}
                        lines="full"
                        button
                        detail
                        onClick={() => navigateToVisitDetail(visit.id)}
                      >
                        <IonLabel>
                          <div style={{ display: 'grid', gap: '4px' }}>
                            <h3 style={{ marginBottom: '2px', fontSize: '1.2rem', fontWeight: 700 }}>
                              Visite du {formatDateTime(visit.visit_date ?? visit.created_at)}
                            </h3>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <IonBadge color="primary">{visitTypeLabel}</IonBadge>
                              {linkedHistoryCodes.map((code) => (
                                <IonBadge key={code} color="medium">
                                  {code}
                                </IonBadge>
                              ))}
                            </div>
                            {linkedHistoryEntries.length > 0 ? (
                              <div>
                                {linkedHistoryEntries.slice(0, 2).map((entry) => (
                                  <p
                                    key={`timeline-history-${visit.id}-${entry.id}`}
                                    style={{
                                      margin: '0 0 2px 0',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      gap: '8px',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <span>
                                      <strong>Historique lie:</strong> {entry.title}
                                    </span>
                                    <IonButton
                                      fill="clear"
                                      size="small"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        ionRouter.push(`/doctor/medical-history/${entry.id}${contextQuerySuffix}`, 'forward', 'push');
                                      }}
                                    >
                                      Voir
                                    </IonButton>
                                  </p>
                                ))}
                              </div>
                            ) : null}
                            <p style={{ margin: 0 }}>
                              <strong>Reference:</strong> VIS-{visit.id}
                            </p>
                          </div>
                        </IonLabel>
                      </IonItem>
                    );
                  })}
                </IonList>
              )}
            </IonCardContent>
          ) : null}
        </IonCard>
        ) : null}

        {showClinicalCards ? (
        <IonCard className="surface-card">
          <IonCardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={medicalOutline} /> Historique medical
              </IonCardTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonButton
                  size="small"
                  onClick={() => {
                    resetHistoryForm();
                    setShowHistoryModal(true);
                  }}
                >
                  Ajouter
                </IonButton>
                <IonButton fill="clear" size="small" onClick={() => setIsHistoryCollapsed((prev) => !prev)}>
                  <IonIcon icon={isHistoryCollapsed ? chevronDownOutline : chevronUpOutline} />
                </IonButton>
              </div>
            </div>
          </IonCardHeader>
          {!isHistoryCollapsed ? (
            <IonCardContent>
            {scopedMedicalHistory.length === 0 ? (
              <IonText color="medium">
                <p>Aucun historique medical enregistre.</p>
              </IonText>
            ) : (
              <IonList>
                {scopedMedicalHistory.map((entry) => (
                  <IonItem
                    key={entry.id}
                    lines="full"
                    style={{
                      border: '1px solid #d1e1ec',
                      borderLeft: '4px solid #8fb3c9',
                      borderRadius: '12px',
                      marginBottom: '10px',
                      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)',
                      background: '#ffffff'
                    }}
                  >
                    <IonLabel>
                      <p style={{ marginBottom: 2, fontSize: '1.08rem', fontWeight: 800, color: '#0f172a' }}>
                        Reference medicale: {entry.entry_code ?? `MH-${entry.id}`}
                      </p>
                      <p>Cree le: {formatDateTime(entry.created_at)}</p>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <h3 style={{ marginBottom: 2 }}>{entry.title}</h3>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <IonBadge color={historyStatusColor[entry.status]}>{historyStatusLabel[entry.status]}</IonBadge>
                          <IonBadge color={visibilityColor[entry.visibility]}>{visibilityLabel[entry.visibility]}</IonBadge>
                          <IonButton
                            fill="clear"
                            size="small"
                            onClick={(event) => {
                              event.stopPropagation();
                              startHistoryEdit(entry);
                            }}
                          >
                            <IonIcon icon={createOutline} />
                          </IonButton>
                        </div>
                      </div>
                      <p>{historyTypeLabel[entry.type]}</p>
                      <p>
                        Debut: {entry.started_at ? formatDateHaiti(entry.started_at) : 'Non precise'} · Fin:{' '}
                        {entry.ended_at ? formatDateHaiti(entry.ended_at) : 'Non precise'}
                      </p>
                      {entry.details ? <p>{entry.details}</p> : null}
                      {((entry.linked_prescriptions && entry.linked_prescriptions.length > 0) || entry.prescription_id) ? (
                        <div
                          style={{
                            marginTop: '8px',
                            border: '1px solid var(--ion-color-light-shade)',
                            borderRadius: '10px',
                            padding: '8px 10px',
                            background: 'var(--ion-color-light)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <strong>Ordonnance(s) liee(s):</strong>
                            <IonButton
                              size="small"
                              fill="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleLinkedPrescriptionDetails(entry.id);
                              }}
                            >
                              {expandedLinkedPrescriptions[entry.id] ? 'Masquer details' : 'Afficher details'}
                            </IonButton>
                          </div>
                          <div style={{ marginTop: '6px' }}>
                            {(entry.linked_prescriptions && entry.linked_prescriptions.length > 0)
                              ? entry.linked_prescriptions.map((rx) => (
                                  <p key={`history-rx-${entry.id}-${rx.id}`} style={{ margin: '4px 0 0 0' }}>
                                    {rx.print_code ?? `#${rx.id}`}
                                    {rx.requested_at ? ` · ${formatDateTime(rx.requested_at)}` : ''}
                                  </p>
                                ))
                              : (
                                  <p style={{ margin: '4px 0 0 0' }}>
                                    {entry.prescription_print_code ?? 'Code indisponible'}
                                    {entry.prescription_requested_at ? ` · ${formatDateTime(entry.prescription_requested_at)}` : ''}
                                  </p>
                                )}
                          </div>
                          {expandedLinkedPrescriptions[entry.id] ? (
                            <div
                              style={{
                                marginTop: '8px',
                                borderTop: '1px solid var(--ion-color-light-shade)',
                                paddingTop: '8px'
                              }}
                            >
                              {(() => {
                                const linkedIds = (entry.linked_prescriptions ?? []).map((rx) => rx.id);
                                if (linkedIds.length === 0 && entry.prescription_id) {
                                  linkedIds.push(entry.prescription_id);
                                }
                                const linkedRows = prescriptions.filter((p) => linkedIds.includes(p.id));
                                if (linkedRows.length === 0) {
                                  return <p style={{ margin: 0 }}>Details indisponibles.</p>;
                                }
                                return (
                                  <>
                                    {linkedRows.map((linked) => (
                                      <div key={`history-linked-rx-${entry.id}-${linked.id}`} style={{ marginBottom: '8px' }}>
                                        <p style={{ margin: '0 0 4px 0' }}>
                                          <strong>{getPrescriptionCode(linked)}</strong>
                                        </p>
                                        {linked.medicine_requests.map((med) => (
                                          <p key={`${entry.id}-${linked.id}-${med.id}`} style={{ margin: '0 0 4px 0' }}>
                                            - {med.name} · {med.form || 'Forme N/A'} · {med.strength || 'Dosage N/A'} · Qt: {med.quantity ?? 1} · Dose journaliere:{' '}
                                            {med.daily_dosage ?? 'N/D'} · Note: {(med.notes ?? '').trim() || 'Sans note'}
                                          </p>
                                        ))}
                                      </div>
                                    ))}
                                  </>
                                );
                              })()}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      {entry.linked_rehab_entries && entry.linked_rehab_entries.length > 0 ? (
                        <div
                          style={{
                            marginTop: '8px',
                            border: '1px solid var(--ion-color-light-shade)',
                            borderRadius: '10px',
                            padding: '8px 10px',
                            background: 'var(--ion-color-light)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <strong>Reeducation liee:</strong>
                            <IonButton
                              size="small"
                              fill="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleLinkedRehabDetails(entry.id);
                              }}
                            >
                              {expandedLinkedRehab[entry.id] ? 'Masquer details' : 'Afficher details'}
                            </IonButton>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                            {entry.linked_rehab_entries.map((rehab) => (
                              <IonBadge key={`doctor-history-rehab-${entry.id}-${rehab.id}`} color="tertiary">
                                {rehab.reference}
                              </IonBadge>
                            ))}
                          </div>
                          {expandedLinkedRehab[entry.id] ? (
                            <div
                              style={{
                                marginTop: '8px',
                                borderTop: '1px solid var(--ion-color-light-shade)',
                                paddingTop: '8px',
                                display: 'grid',
                                gap: '8px'
                              }}
                            >
                              {entry.linked_rehab_entries.map((rehab) => (
                                <div key={`doctor-history-rehab-details-${entry.id}-${rehab.id}`} style={{ marginBottom: '8px' }}>
                                  <p style={{ margin: '0 0 4px 0' }}>
                                    <strong>{rehab.reference}</strong>
                                    {' · '}
                                    {rehab.follow_up_date
                                      ? formatDateHaiti(rehab.follow_up_date)
                                      : (rehab.created_at ? formatDateTime(rehab.created_at) : 'N/D')}
                                  </p>
                                  <p style={{ margin: '2px 0' }}>
                                    Sessions/semaine: {rehab.sessions_per_week ?? 'N/D'} · Duree (sem): {rehab.duration_weeks ?? 'N/D'}
                                  </p>
                                  <p style={{ margin: '2px 0' }}>
                                    Douleur: {rehab.pain_score ?? 'N/D'} · Mobilite: {rehab.mobility_score || 'N/D'}
                                  </p>
                                  <p style={{ margin: '2px 0' }}>
                                    Exercice: {rehab.exercise_type || 'N/D'} · Frequence: {rehab.exercise_frequency || 'N/D'} · Reps: {rehab.exercise_reps || 'N/D'}
                                  </p>
                                  <p style={{ margin: '2px 0' }}>
                                    Suivi: {rehab.follow_up_date ? formatDateHaiti(rehab.follow_up_date) : 'N/D'}
                                  </p>
                                  {rehab.goals ? <p style={{ margin: '2px 0' }}><strong>Objectifs:</strong> {rehab.goals}</p> : null}
                                  {rehab.progress_notes ? <p style={{ margin: '2px 0' }}><strong>Progression:</strong> {rehab.progress_notes}</p> : null}
                                  {rehab.exercise_notes ? <p style={{ margin: '2px 0' }}><strong>Notes:</strong> {rehab.exercise_notes}</p> : null}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      <p>Mise a jour: {formatDateTime(entry.updated_at)}</p>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
                )}
              </IonCardContent>
            ) : null}
        </IonCard>
        ) : null}

        {showClinicalCards ? (
          <IonCard className="surface-card">
            <IonCardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={pulseOutline} /> Reeducation
              </IonCardTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonButton
                  size="small"
                  onClick={() => {
                    resetRehabForm();
                    setShowRehabModal(true);
                  }}
                >
                  Ajouter
                </IonButton>
                <IonButton fill="clear" size="small" onClick={() => setIsRehabCollapsed((prev) => !prev)}>
                  <IonIcon icon={isRehabCollapsed ? chevronDownOutline : chevronUpOutline} />
                </IonButton>
              </div>
            </div>
          </IonCardHeader>
          {!isRehabCollapsed ? (
            <IonCardContent>
              {rehabEntries.length === 0 ? (
                <IonText color="medium">
                  <p>Aucun suivi de reeducation enregistre.</p>
                </IonText>
              ) : (
                <IonList>
                  {rehabEntries.map((entry) => (
                    <IonItem key={entry.id} lines="full">
                      <IonLabel>
                        <h3 style={{ marginBottom: '4px' }}>
                          Suivi {formatDateHaiti(entry.follow_up_date || entry.created_at)}
                        </h3>
                        {entry.prescription_print_code ? (
                          <p>
                            <strong>Ordonnance:</strong> {entry.prescription_print_code}
                          </p>
                        ) : null}
                        {entry.medical_history_entry_code ? (
                          <p>
                            <strong>Historique:</strong> {entry.medical_history_entry_code}
                            {entry.medical_history_entry_title ? ` · ${entry.medical_history_entry_title}` : ''}
                          </p>
                        ) : null}
                        <p>
                          <strong>Plan:</strong> {entry.sessions_per_week ?? 'N/D'} seance(s)/semaine · {entry.duration_weeks ?? 'N/D'} semaine(s)
                        </p>
                        <p>
                          <strong>Douleur:</strong> {entry.pain_score ?? 'N/D'}/10 · <strong>Mobilite:</strong> {entry.mobility_score || 'N/D'}
                        </p>
                        {entry.goals ? <p><strong>Objectifs:</strong> {entry.goals}</p> : null}
                        {entry.exercise_type || entry.exercise_reps || entry.exercise_frequency ? (
                          <p>
                            <strong>Exercice:</strong> {[entry.exercise_type, entry.exercise_reps, entry.exercise_frequency].filter(Boolean).join(' · ')}
                          </p>
                        ) : null}
                        {entry.progress_notes ? <p><strong>Progression:</strong> {entry.progress_notes}</p> : null}
                      </IonLabel>
                      <IonButton fill="clear" size="small" onClick={() => startRehabEdit(entry)}>
                        <IonIcon icon={createOutline} />
                      </IonButton>
                    </IonItem>
                  ))}
                </IonList>
              )}
            </IonCardContent>
          ) : null}
        </IonCard>
        ) : null}

        {showClinicalCards ? (
        <IonCard className="surface-card">
          <IonCardHeader>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={documentTextOutline} /> Ordonnances
              </IonCardTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonButton
                  size="small"
                  onClick={() => {
                    const params = new URLSearchParams();
                    params.set('patient', decodedPatientName);
                    if (effectiveFamilyMemberId) {
                      params.set('familyMemberId', String(effectiveFamilyMemberId));
                    }
                    if (familyMemberName) {
                      params.set('familyMemberName', familyMemberName);
                    }
                    ionRouter.push(`/doctor/create-prescription?${params.toString()}`, 'forward', 'push');
                  }}
                >
                  Ajouter
                </IonButton>
                <IonButton fill="clear" size="small" onClick={() => setIsPrescriptionsCollapsed((prev) => !prev)}>
                  <IonIcon icon={isPrescriptionsCollapsed ? chevronDownOutline : chevronUpOutline} />
                </IonButton>
              </div>
            </div>
          </IonCardHeader>
          {!isPrescriptionsCollapsed ? (
            <IonCardContent>
            {patientPrescriptions.length === 0 ? (
              <IonText color="medium">
                <p>Aucune ordonnance pour ce patient.</p>
              </IonText>
            ) : (
              <IonList>
                {patientPrescriptions.map((prescription) => (
                  <IonItem
                    key={prescription.id}
                    lines="full"
                    button
                    detail
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (effectiveFamilyMemberId) {
                        params.set('familyMemberId', String(effectiveFamilyMemberId));
                      }
                      if (familyMemberName) {
                        params.set('familyMemberName', familyMemberName);
                      }
                      const suffix = params.toString() ? `?${params.toString()}` : '';
                      ionRouter.push(`/doctor/prescriptions/${prescription.id}${suffix}`, 'forward', 'push');
                    }}
                  >
                    <IonLabel>
                      <h3 style={{ marginBottom: '4px' }}>
                        Reference: {getPrescriptionCode(prescription)}
                      </h3>
                      {historyCodesByPrescriptionId[prescription.id]?.length ? (
                        <p>
                          Historique lie: {historyCodesByPrescriptionId[prescription.id].join(', ')}
                        </p>
                      ) : null}
                      <div className="status-row">
                        <span>Statut:</span>
                        <IonBadge className={getPrescriptionStatusClassName(prescription.status)}>
                          {getPrescriptionStatusLabel(prescription.status)}
                        </IonBadge>
                      </div>
                      <p>Demandee le {formatDateTime(prescription.requested_at)}</p>
                      <div style={{ marginTop: '6px' }}>
                        <p style={{ margin: '0 0 4px 0' }}><strong>Notes par medicament:</strong></p>
                        {prescription.medicine_requests.map((med) => (
                          <p key={`note-${prescription.id}-${med.id}`} style={{ margin: '0 0 4px 0' }}>
                            - {med.name} · Dose journaliere: {med.daily_dosage ?? 'N/D'} · Note: {(med.notes ?? '').trim() || 'Sans note'}
                          </p>
                        ))}
                      </div>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            )}
            </IonCardContent>
          ) : null}
        </IonCard>
        ) : null}

        <IonModal
          isOpen={showHistoryModal}
          onDidDismiss={() => {
            const targetId = editingHistoryId ?? historyIdFromQuery ?? null;
            setShowHistoryModal(false);
            resetHistoryForm();
            if (targetId) {
              navigateToHistoryDetail(targetId);
            }
          }}
        >
          <IonContent className="ion-padding app-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div>
                <h1 style={{ marginTop: 0 }}>{editingHistoryId === null ? 'Ajouter un historique' : 'Modifier un historique'}</h1>
                <IonText color="medium">Le docteur peut creer et modifier l'historique lie au patient.</IonText>
              </div>
              <IonButton
                fill="clear"
                color="medium"
                onClick={() => {
                  setShowHistoryModal(false);
                  resetHistoryForm();
                }}
              >
                <IonIcon icon={closeOutline} />
              </IonButton>
            </div>

            <IonCard className="surface-card" style={{ marginTop: '12px' }}>
              <IonCardHeader>
                <IonCardTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span>Visibilite</span>
                  <IonButton fill="clear" size="small" onClick={() => setIsHistoryModalContextCollapsed((prev) => !prev)}>
                    <IonIcon icon={isHistoryModalContextCollapsed ? chevronDownOutline : chevronUpOutline} />
                  </IonButton>
                </IonCardTitle>
              </IonCardHeader>
              {!isHistoryModalContextCollapsed ? (
                <IonCardContent>
                  <IonItem lines="none" style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                      <IonButton
                        size="small"
                        fill={historyForm.visibility === 'shared' ? 'solid' : 'outline'}
                        onClick={() => setHistoryForm((prev) => ({ ...prev, visibility: 'shared' }))}
                      >
                        Partage
                      </IonButton>
                      <IonButton
                        size="small"
                        fill={historyForm.visibility === 'doctor_only' ? 'solid' : 'outline'}
                        onClick={() => setHistoryForm((prev) => ({ ...prev, visibility: 'doctor_only' }))}
                      >
                        Docteur seulement
                      </IonButton>
                    </div>
                  </IonItem>
                </IonCardContent>
              ) : null}
            </IonCard>

            <IonCard className="surface-card">
              <IonCardHeader>
                <IonCardTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span>Details cliniques</span>
                  <IonButton fill="clear" size="small" onClick={() => setIsHistoryModalDetailsCollapsed((prev) => !prev)}>
                    <IonIcon icon={isHistoryModalDetailsCollapsed ? chevronDownOutline : chevronUpOutline} />
                  </IonButton>
                </IonCardTitle>
              </IonCardHeader>
              {!isHistoryModalDetailsCollapsed ? (
                <IonCardContent>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Type</IonLabel>
                    <IonSelect
                      value={historyForm.type}
                      onIonChange={(e) =>
                        setHistoryForm((prev) => ({ ...prev, type: e.detail.value as ApiMedicalHistoryEntry['type'] }))
                      }
                    >
                      <IonSelectOption value="condition">Condition</IonSelectOption>
                      <IonSelectOption value="allergy">Allergie</IonSelectOption>
                      <IonSelectOption value="surgery">Chirurgie</IonSelectOption>
                      <IonSelectOption value="hospitalization">Hospitalisation</IonSelectOption>
                      <IonSelectOption value="medication">Traitement</IonSelectOption>
                      <IonSelectOption value="note">Note</IonSelectOption>
                    </IonSelect>
                  </IonItem>
                  <IonItem lines="none" style={{ marginTop: '8px' }}>
                    <IonLabel position="stacked">Titre *</IonLabel>
                    <IonInput
                      value={historyForm.title}
                      onIonInput={(e) => setHistoryForm((prev) => ({ ...prev, title: e.detail.value ?? '' }))}
                    />
                  </IonItem>
                  <IonItem lines="none" style={{ marginTop: '8px' }}>
                    <IonLabel position="stacked">Details</IonLabel>
                    <IonTextarea
                      autoGrow
                      value={historyForm.details}
                      onIonInput={(e) => setHistoryForm((prev) => ({ ...prev, details: e.detail.value ?? '' }))}
                    />
                  </IonItem>
                </IonCardContent>
              ) : null}
            </IonCard>

            <IonCard className="surface-card">
              <IonCardHeader>
                <IonCardTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span>Dates et statut</span>
                  <IonButton fill="clear" size="small" onClick={() => setIsHistoryModalDatesCollapsed((prev) => !prev)}>
                    <IonIcon icon={isHistoryModalDatesCollapsed ? chevronDownOutline : chevronUpOutline} />
                  </IonButton>
                </IonCardTitle>
              </IonCardHeader>
              {!isHistoryModalDatesCollapsed ? (
                <IonCardContent>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <IonItem lines="none">
                      <IonLabel position="stacked">Debut</IonLabel>
                      <IonInput
                        type="date"
                        value={historyForm.started_at}
                        onIonInput={(e) => setHistoryForm((prev) => ({ ...prev, started_at: e.detail.value ?? '' }))}
                      />
                    </IonItem>
                    <IonItem lines="none">
                      <IonLabel position="stacked">Fin</IonLabel>
                      <IonInput
                        type="date"
                        value={historyForm.ended_at}
                        onIonInput={(e) => setHistoryForm((prev) => ({ ...prev, ended_at: e.detail.value ?? '' }))}
                      />
                    </IonItem>
                  </div>
                  <IonItem lines="none" style={{ marginTop: '8px' }}>
                    <IonLabel position="stacked">Statut</IonLabel>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                      <IonButton
                        size="small"
                        fill={historyForm.status === 'active' ? 'solid' : 'outline'}
                        onClick={() => setHistoryForm((prev) => ({ ...prev, status: 'active' }))}
                      >
                        Actif
                      </IonButton>
                      <IonButton
                        size="small"
                        fill={historyForm.status === 'resolved' ? 'solid' : 'outline'}
                        onClick={() => setHistoryForm((prev) => ({ ...prev, status: 'resolved' }))}
                      >
                        Resolue
                      </IonButton>
                    </div>
                  </IonItem>
                </IonCardContent>
              ) : null}
            </IonCard>

            <IonCard className="surface-card">
              <IonCardHeader>
                <IonCardTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span>Liaison ordonnances</span>
                  <IonButton fill="clear" size="small" onClick={() => setIsHistoryModalLinkCollapsed((prev) => !prev)}>
                    <IonIcon icon={isHistoryModalLinkCollapsed ? chevronDownOutline : chevronUpOutline} />
                  </IonButton>
                </IonCardTitle>
              </IonCardHeader>
              {!isHistoryModalLinkCollapsed ? (
                <IonCardContent>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Ordonnance(s) liee(s) (optionnel)</IonLabel>
                    <IonSelect
                      value={historyForm.prescription_id}
                      placeholder="Aucune"
                      onIonChange={(e) => setHistoryForm((prev) => ({ ...prev, prescription_id: e.detail.value ?? '' }))}
                    >
                      <IonSelectOption value="">Aucune</IonSelectOption>
                      {patientPrescriptions.map((prescription) => (
                        <IonSelectOption key={prescription.id} value={String(prescription.id)}>
                          {getPrescriptionCode(prescription)} · {formatDateHaiti(prescription.requested_at)}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </IonItem>
                  {selectedPrescriptionForHistory ? (
                    <IonCard className="surface-card" style={{ margin: '8px 0 0 0' }}>
                      <IonCardHeader>
                        <IonCardTitle style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <IonIcon icon={documentTextOutline} />
                            Contexte ordonnance
                          </span>
                          <IonBadge className={getPrescriptionStatusClassName(selectedPrescriptionForHistory.status)}>
                            {getPrescriptionStatusLabel(selectedPrescriptionForHistory.status)}
                          </IonBadge>
                        </IonCardTitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <p style={{ margin: 0 }}>
                          <strong>{getPrescriptionCode(selectedPrescriptionForHistory)}</strong> ·{' '}
                          {formatDateTime(selectedPrescriptionForHistory.requested_at)}
                        </p>
                        <p style={{ margin: '4px 0 0 0' }}>
                          {selectedPrescriptionForHistory.medicine_requests.length} medicament(s)
                        </p>
                        <div style={{ marginTop: '6px', display: 'grid', gap: '4px' }}>
                          {selectedPrescriptionForHistory.medicine_requests.map((med) => (
                            <p key={`history-modal-rx-${selectedPrescriptionForHistory.id}-${med.id}`} style={{ margin: 0 }}>
                              <strong>{med.name}</strong> · {med.form || 'N/D'} · {med.strength || 'N/D'} · Qt: {med.quantity ?? 1}
                              {' · '}Dose/jour: {med.daily_dosage ?? 'N/D'} · Note: {(med.notes ?? '').trim() || 'Sans note'}
                            </p>
                          ))}
                        </div>
                      </IonCardContent>
                    </IonCard>
                  ) : null}
                </IonCardContent>
              ) : null}
            </IonCard>

            <div
              style={{
                position: 'sticky',
                bottom: '-16px',
                background: '#f0f6fa',
                borderTop: '1px solid #dbe7ef',
                padding: '8px',
                boxShadow: '0 -4px 12px rgba(15, 23, 42, 0.06)',
                zIndex: 1
              }}
            >
              <IonButton expand="block" style={{ marginTop: '8px' }} onClick={() => saveHistory().catch(() => undefined)} disabled={savingHistory || !historyForm.title.trim()}>
                {editingHistoryId === null ? 'Ajouter' : 'Mettre a jour'}
              </IonButton>
              <IonButton
                expand="block"
                color="dark"
                onClick={() => {
                  setShowHistoryModal(false);
                  resetHistoryForm();
                }}
              >
                Annuler
              </IonButton>
            </div>
            {historyError ? (
              <IonText color="danger">
                <p>{historyError}</p>
              </IonText>
            ) : null}
          </IonContent>
        </IonModal>

        <IonModal
          isOpen={showRehabModal}
          onDidDismiss={() => {
            setShowRehabModal(false);
            resetRehabForm();
          }}
        >
          <IonContent className="ion-padding app-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div>
                <h1 style={{ marginTop: 0 }}>{editingRehabId === null ? 'Ajouter suivi reeducation' : 'Modifier suivi reeducation'}</h1>
                <IonText color="medium">Module de suivi fonctionnel (disponible pour tous les medecins).</IonText>
              </div>
              <IonButton
                fill="clear"
                color="medium"
                onClick={() => {
                  setShowRehabModal(false);
                  resetRehabForm();
                }}
              >
                <IonIcon icon={closeOutline} />
              </IonButton>
            </div>

            <IonCard className="surface-card">
              <IonCardContent>
                <IonItem lines="none">
                  <IonLabel position="stacked">Historique medical lie (optionnel)</IonLabel>
                  <IonSelect
                    value={rehabForm.medical_history_entry_id}
                    placeholder="Aucun"
                    onIonChange={(e) => setRehabForm((prev) => ({ ...prev, medical_history_entry_id: e.detail.value ?? '' }))}
                  >
                    <IonSelectOption value="">Aucun</IonSelectOption>
                    {scopedMedicalHistory.map((entry) => (
                      <IonSelectOption key={entry.id} value={String(entry.id)}>
                        {(entry.entry_code ?? `MH-${entry.id}`)} · {entry.title}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">Ordonnance(s) liee(s) (optionnel)</IonLabel>
                  <IonSelect
                    value={rehabForm.prescription_id}
                    placeholder="Aucune"
                    onIonChange={(e) => setRehabForm((prev) => ({ ...prev, prescription_id: e.detail.value ?? '' }))}
                  >
                    <IonSelectOption value="">Aucune</IonSelectOption>
                    {patientPrescriptions.map((prescription) => (
                      <IonSelectOption key={prescription.id} value={String(prescription.id)}>
                        {getPrescriptionCode(prescription)} · {formatDateHaiti(prescription.requested_at)}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Seances / semaine</IonLabel>
                    <IonInput
                      type="number"
                      min={1}
                      max={14}
                      value={rehabForm.sessions_per_week}
                      onIonInput={(e) => setRehabForm((prev) => ({ ...prev, sessions_per_week: e.detail.value ?? '' }))}
                    />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Duree (semaines)</IonLabel>
                    <IonInput
                      type="number"
                      min={1}
                      max={104}
                      value={rehabForm.duration_weeks}
                      onIonInput={(e) => setRehabForm((prev) => ({ ...prev, duration_weeks: e.detail.value ?? '' }))}
                    />
                  </IonItem>
                </div>
                <IonItem lines="none">
                  <IonLabel position="stacked">Objectifs</IonLabel>
                  <IonTextarea
                    autoGrow
                    value={rehabForm.goals}
                    onIonInput={(e) => setRehabForm((prev) => ({ ...prev, goals: e.detail.value ?? '' }))}
                  />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">Type d'exercice</IonLabel>
                  <IonInput
                    value={rehabForm.exercise_type}
                    onIonInput={(e) => setRehabForm((prev) => ({ ...prev, exercise_type: e.detail.value ?? '' }))}
                  />
                </IonItem>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Repetitions</IonLabel>
                    <IonInput
                      value={rehabForm.exercise_reps}
                      onIonInput={(e) => setRehabForm((prev) => ({ ...prev, exercise_reps: e.detail.value ?? '' }))}
                    />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Frequence</IonLabel>
                    <IonInput
                      value={rehabForm.exercise_frequency}
                      onIonInput={(e) => setRehabForm((prev) => ({ ...prev, exercise_frequency: e.detail.value ?? '' }))}
                    />
                  </IonItem>
                </div>
                <IonItem lines="none">
                  <IonLabel position="stacked">Notes exercice</IonLabel>
                  <IonTextarea
                    autoGrow
                    value={rehabForm.exercise_notes}
                    onIonInput={(e) => setRehabForm((prev) => ({ ...prev, exercise_notes: e.detail.value ?? '' }))}
                  />
                </IonItem>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Score douleur (0-10)</IonLabel>
                    <IonInput
                      type="number"
                      min={0}
                      max={10}
                      value={rehabForm.pain_score}
                      onIonInput={(e) => setRehabForm((prev) => ({ ...prev, pain_score: e.detail.value ?? '' }))}
                    />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Score mobilite</IonLabel>
                    <IonInput
                      value={rehabForm.mobility_score}
                      onIonInput={(e) => setRehabForm((prev) => ({ ...prev, mobility_score: e.detail.value ?? '' }))}
                    />
                  </IonItem>
                </div>
                <IonItem lines="none">
                  <IonLabel position="stacked">Notes de progression</IonLabel>
                  <IonTextarea
                    autoGrow
                    value={rehabForm.progress_notes}
                    onIonInput={(e) => setRehabForm((prev) => ({ ...prev, progress_notes: e.detail.value ?? '' }))}
                  />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">Date de suivi</IonLabel>
                  <IonInput
                    type="date"
                    value={rehabForm.follow_up_date}
                    onIonInput={(e) => setRehabForm((prev) => ({ ...prev, follow_up_date: e.detail.value ?? '' }))}
                  />
                </IonItem>
              </IonCardContent>
            </IonCard>

            <div
              style={{
                position: 'sticky',
                bottom: '-16px',
                background: '#f0f6fa',
                borderTop: '1px solid #dbe7ef',
                padding: '8px',
                boxShadow: '0 -4px 12px rgba(15, 23, 42, 0.06)',
                zIndex: 1
              }}
            >
              <IonButton expand="block" onClick={() => saveRehab().catch(() => undefined)} disabled={savingRehab}>
                {editingRehabId === null ? 'Ajouter' : 'Mettre a jour'}
              </IonButton>
              <IonButton
                expand="block"
                color="dark"
                onClick={() => {
                  setShowRehabModal(false);
                  resetRehabForm();
                }}
              >
                Annuler
              </IonButton>
            </div>

            {rehabError ? (
              <IonText color="danger">
                <p>{rehabError}</p>
              </IonText>
            ) : null}
          </IonContent>
        </IonModal>

      </IonContent>
    </IonPage>
  );
};

export default DoctorPatientPrescriptionsPage;

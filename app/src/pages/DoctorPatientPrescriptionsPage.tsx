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
  chevronDownOutline,
  chevronUpOutline,
  createOutline,
  documentTextOutline,
  medicalOutline,
  personOutline
} from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import {
  api,
  ApiDoctorPatientProfile,
  ApiFamilyMember,
  ApiMedicalHistoryEntry,
  ApiPrescription
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
  const [familyMembers, setFamilyMembers] = useState<ApiFamilyMember[]>([]);
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<number | null>(null);
  const [medicalHistory, setMedicalHistory] = useState<ApiMedicalHistoryEntry[]>([]);
  const [patientProfile, setPatientProfile] = useState<ApiDoctorPatientProfile | null>(null);
  const [isProfileCollapsed, setIsProfileCollapsed] = useState(false);
  const [isFamilyCollapsed, setIsFamilyCollapsed] = useState(true);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(true);
  const [isPrescriptionsCollapsed, setIsPrescriptionsCollapsed] = useState(true);
  const [isIdentityCollapsed, setIsIdentityCollapsed] = useState(true);
  const [isHealthCollapsed, setIsHealthCollapsed] = useState(true);
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(true);
  const [expandedLinkedPrescriptions, setExpandedLinkedPrescriptions] = useState<Record<number, boolean>>({});
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingHistoryId, setEditingHistoryId] = useState<number | null>(null);
  const [savingHistory, setSavingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyPrefillApplied, setHistoryPrefillApplied] = useState(false);

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

  const cacheKey = user ? `doctor-prescriptions-${user.id}` : null;
  const decodedPatientName = decodeURIComponent(patientName);
  const search = new URLSearchParams(location.search);
  const familyMemberId = search.get('familyMemberId') ? Number(search.get('familyMemberId')) : null;
  const prefillPrescriptionId = search.get('prescriptionId') ? Number(search.get('prescriptionId')) : null;
  const familyMemberName = search.get('familyMemberName')
    ? decodeURIComponent(search.get('familyMemberName') as string)
    : null;

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

  useEffect(() => {
    loadPrescriptions().catch(() => undefined);
  }, [loadPrescriptions]);

  useIonViewWillEnter(() => {
    loadPrescriptions().catch(() => undefined);
  });

  const patientPrescriptions = useMemo(() => {
    return prescriptions
      .filter((p) => p.patient_name.trim().toLowerCase() === decodedPatientName.trim().toLowerCase())
      .filter((p) => (familyMemberId ? p.family_member_id === familyMemberId : !p.family_member_id))
      .sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
  }, [decodedPatientName, familyMemberId, prescriptions]);

  const patientUserId =
    prescriptions.find(
      (p) => p.patient_name.trim().toLowerCase() === decodedPatientName.trim().toLowerCase() && p.patient_user_id
    )?.patient_user_id ?? null;

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
      setMedicalHistory([]);
      return;
    }

    api
      .getDoctorPatientMedicalHistory(token, patientUserId, {
        family_member_id: familyMemberId ?? undefined
      })
      .then((rows) => {
        const scopedRows = familyMemberId
          ? rows
          : rows.filter((entry) => !entry.family_member_id);

        const sorted = [...scopedRows].sort((a, b) => {
          const aDate = a.started_at ?? a.created_at;
          const bDate = b.started_at ?? b.created_at;
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });
        setMedicalHistory(sorted);
      })
      .catch(() => setMedicalHistory([]));
  }, [familyMemberId, patientUserId, token]);

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

  const selectedFamilyMember = useMemo(
    () => familyMembers.find((member) => member.id === selectedFamilyMemberId) ?? null,
    [familyMembers, selectedFamilyMemberId]
  );
  const profileFamilyMember = useMemo(
    () => familyMembers.find((member) => member.id === (familyMemberId ?? selectedFamilyMemberId)) ?? null,
    [familyMemberId, familyMembers, selectedFamilyMemberId]
  );
  const scopedMedicalHistory = useMemo(
    () =>
      familyMemberId
        ? medicalHistory.filter((entry) => entry.family_member_id === familyMemberId)
        : medicalHistory.filter((entry) => !entry.family_member_id),
    [familyMemberId, medicalHistory]
  );
  const historyCodesByPrescriptionId = useMemo(() => {
    const map: Record<number, string[]> = {};
    scopedMedicalHistory.forEach((entry) => {
      if (!entry.prescription_id) {
        return;
      }
      const code = entry.entry_code ?? `MH-${entry.id}`;
      if (!map[entry.prescription_id]) {
        map[entry.prescription_id] = [];
      }
      if (!map[entry.prescription_id].includes(code)) {
        map[entry.prescription_id].push(code);
      }
    });
    return map;
  }, [scopedMedicalHistory]);
  const activePatientName = profileFamilyMember?.name ?? familyMemberName ?? decodedPatientName;
  const toggleLinkedPrescriptionDetails = (historyEntryId: number) => {
    setExpandedLinkedPrescriptions((prev) => ({
      ...prev,
      [historyEntryId]: !prev[historyEntryId]
    }));
  };

  const resetHistoryForm = () => {
    setHistoryForm({
      family_member_id: familyMemberId ? String(familyMemberId) : '',
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

  useEffect(() => {
    resetHistoryForm();
    setHistoryPrefillApplied(false);
  }, [familyMemberId, prefillPrescriptionId]);

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

  const startHistoryEdit = (entry: ApiMedicalHistoryEntry) => {
    setEditingHistoryId(entry.id);
    setHistoryForm({
      family_member_id: entry.family_member_id ? String(entry.family_member_id) : '',
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
  };

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
      const payload = {
        family_member_id: historyForm.family_member_id ? Number(historyForm.family_member_id) : null,
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
        family_member_id: familyMemberId ?? undefined
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
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Echec d'enregistrement de l'historique.");
    } finally {
      setSavingHistory(false);
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
              <IonButton fill="clear" size="small" onClick={() => setIsProfileCollapsed((prev) => !prev)}>
                <IonIcon icon={isProfileCollapsed ? chevronDownOutline : chevronUpOutline} />
              </IonButton>
            </div>
          </IonCardHeader>
          {!isProfileCollapsed ? (
            <IonCardContent>
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
                      {patientProfile?.profile_photo_url ? (
                        <img
                          src={patientProfile.profile_photo_url}
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
                        {profileFamilyMember?.age ?? patientProfile?.age ?? 'Age ?'} {(profileFamilyMember?.age ?? patientProfile?.age) ? 'ans' : ''}
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
                      if (familyMemberId) {
                        params.set('familyMemberId', String(familyMemberId));
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

        {!familyMemberId ? (
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
                {familyMembers.length === 0 ? (
                  <IonText color="medium">
                    <p>Aucun membre de famille.</p>
                  </IonText>
                ) : (
                  <>
                    <IonList>
                      {familyMembers.map((member) => (
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
                  <IonItem key={entry.id} lines="full">
                    <IonLabel>
                      <p style={{ marginBottom: 2 }}>
                        <strong>Reference:</strong> {entry.entry_code ?? `MH-${entry.id}`}
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
                          <IonButton fill="clear" size="small" onClick={() => startHistoryEdit(entry)}>
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
                      {entry.prescription_id ? (
                        <div
                          style={{
                            marginTop: '8px',
                            border: '1px solid var(--ion-color-light-shade)',
                            borderRadius: '10px',
                            padding: '8px 10px',
                            background: 'var(--ion-color-light)'
                          }}
                        >
                          <p style={{ margin: 0 }}>
                            <strong>Ordonnance liee:</strong> {entry.prescription_print_code ?? 'Code indisponible'}
                          </p>
                          {entry.prescription_requested_at ? (
                            <p style={{ margin: '4px 0 0 0' }}>
                              <strong>Date:</strong> {formatDateTime(entry.prescription_requested_at)}
                            </p>
                          ) : null}
                          <IonButton
                            size="small"
                            fill="outline"
                            style={{ marginTop: '6px' }}
                            onClick={() => toggleLinkedPrescriptionDetails(entry.id)}
                          >
                            {expandedLinkedPrescriptions[entry.id] ? 'Masquer details' : 'Afficher details'}
                          </IonButton>
                          {expandedLinkedPrescriptions[entry.id] ? (
                            <div
                              style={{
                                marginTop: '8px',
                                borderTop: '1px solid var(--ion-color-light-shade)',
                                paddingTop: '8px'
                              }}
                            >
                              {(() => {
                                const linked = prescriptions.find((p) => p.id === entry.prescription_id);
                                if (!linked) {
                                  return <p style={{ margin: 0 }}>Details indisponibles.</p>;
                                }
                                return (
                                  <>
                                    <p style={{ margin: '0 0 4px 0' }}>
                                      <strong>Medicaments:</strong>
                                    </p>
                                    {linked.medicine_requests.map((med) => (
                                      <p key={`${entry.id}-${med.id}`} style={{ margin: '0 0 4px 0' }}>
                                        - {med.name} · {med.form || 'Forme N/A'} · {med.strength || 'Dosage N/A'} · Qt: {med.quantity ?? 1} · Dose journaliere:{' '}
                                        {med.daily_dosage ?? 'N/D'} · Note: {(med.notes ?? '').trim() || 'Sans note'}
                                      </p>
                                    ))}
                                  </>
                                );
                              })()}
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
                    if (familyMemberId) {
                      params.set('familyMemberId', String(familyMemberId));
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
                      if (familyMemberId) {
                        params.set('familyMemberId', String(familyMemberId));
                        params.set('scope', 'family');
                      } else {
                        params.set('scope', 'principal');
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

        <IonModal
          isOpen={showHistoryModal}
          onDidDismiss={() => {
            setShowHistoryModal(false);
            window.location.reload();
          }}
        >
          <IonContent className="ion-padding app-content">
            <h1 style={{ marginTop: 0 }}>{editingHistoryId === null ? 'Ajouter un historique' : 'Modifier un historique'}</h1>
            <IonText color="medium">Le docteur peut creer et modifier l'historique lie au patient.</IonText>

            <IonItem lines="none" style={{ marginTop: '12px' }}>
              <IonLabel position="stacked">Membre de famille</IonLabel>
              <IonSelect
                value={historyForm.family_member_id}
                placeholder="Patient principal"
                onIonChange={(e) => setHistoryForm((prev) => ({ ...prev, family_member_id: e.detail.value ?? '' }))}
              >
                <IonSelectOption value="">Patient principal</IonSelectOption>
                {familyMembers.map((member) => (
                  <IonSelectOption key={member.id} value={String(member.id)}>
                    {member.name}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            <IonItem lines="none" style={{ marginTop: '8px' }}>
              <IonLabel position="stacked">Ordonnance liee (optionnel)</IonLabel>
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

            <IonItem lines="none" style={{ marginTop: '8px' }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
              <IonItem lines="none">
                <IonLabel position="stacked">Statut</IonLabel>
                <IonSelect
                  value={historyForm.status}
                  onIonChange={(e) =>
                    setHistoryForm((prev) => ({ ...prev, status: e.detail.value as ApiMedicalHistoryEntry['status'] }))
                  }
                >
                  <IonSelectOption value="active">Actif</IonSelectOption>
                  <IonSelectOption value="resolved">Resolue</IonSelectOption>
                </IonSelect>
              </IonItem>
              <IonItem lines="none">
                <IonLabel position="stacked">Visibilite</IonLabel>
                <IonSelect
                  value={historyForm.visibility}
                  onIonChange={(e) =>
                    setHistoryForm((prev) => ({
                      ...prev,
                      visibility: e.detail.value as Extract<ApiMedicalHistoryEntry['visibility'], 'shared' | 'doctor_only'>
                    }))
                  }
                >
                  <IonSelectOption value="shared">Partage</IonSelectOption>
                  <IonSelectOption value="doctor_only">Docteur seulement</IonSelectOption>
                </IonSelect>
              </IonItem>
            </div>

            <IonButton expand="block" style={{ marginTop: '16px' }} onClick={() => saveHistory().catch(() => undefined)} disabled={savingHistory}>
              {editingHistoryId === null ? 'Ajouter' : 'Mettre a jour'}
            </IonButton>
            {historyError ? (
              <IonText color="danger">
                <p>{historyError}</p>
              </IonText>
            ) : null}
            <IonButton
              expand="block"
              fill="outline"
              color="medium"
              onClick={() => {
                setShowHistoryModal(false);
                resetHistoryForm();
              }}
            >
              Annuler
            </IonButton>
          </IonContent>
        </IonModal>

      </IonContent>
    </IonPage>
  );
};

export default DoctorPatientPrescriptionsPage;

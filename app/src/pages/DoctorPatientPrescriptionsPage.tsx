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
  IonFab,
  IonFabButton,
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
  useIonRouter
} from '@ionic/react';
import { addOutline, createOutline, medicalOutline } from 'ionicons/icons';
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
          if (cachedData.length > 0) {
            return;
          }
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

  const patientPrescriptions = useMemo(() => {
    return prescriptions
      .filter((p) => p.patient_name.trim().toLowerCase() === decodedPatientName.trim().toLowerCase())
      .filter((p) => (familyMemberId ? p.family_member_id === familyMemberId : true))
      .sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
  }, [decodedPatientName, familyMemberId, prescriptions]);

  const patientUserId = patientPrescriptions.find((p) => p.patient_user_id)?.patient_user_id ?? null;

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
        const sorted = [...rows].sort((a, b) => {
          const aDate = a.started_at ?? a.created_at;
          const bDate = b.started_at ?? b.created_at;
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });
        setMedicalHistory(sorted);
      })
      .catch(() => setMedicalHistory([]));
  }, [familyMemberId, patientUserId, token]);

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    patientPrescriptions.forEach((p) => {
      map[p.status] = (map[p.status] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [patientPrescriptions]);

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
      setHistoryError("Impossible d'ajouter un historique: patient non inscrit.");
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
            <IonCardTitle>Profil patient</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p>
              <strong>Nom:</strong> {familyMemberName ?? decodedPatientName}
            </p>
            <p>
              <strong>Telephone:</strong> {patientProfile?.phone ?? 'Non renseigne'}
            </p>
            <p>
              <strong>NINU:</strong> {patientProfile?.ninu ?? 'Non renseigne'}
            </p>
            <p>
              <strong>Date de naissance:</strong>{' '}
              {patientProfile?.date_of_birth ? formatDateHaiti(patientProfile.date_of_birth) : 'Non renseignee'}
            </p>
            <p>
              <strong>WhatsApp:</strong> {patientProfile?.whatsapp ?? 'Non renseigne'}
            </p>
            <p>
              <strong>Adresse:</strong> {patientProfile?.address ?? 'Non renseignee'}
            </p>
            <p>
              <strong>Age:</strong>{' '}
              {patientProfile?.age === null || patientProfile?.age === undefined
                ? 'Non precise'
                : `${patientProfile.age} ans`}
            </p>
            <p>
              <strong>Genre:</strong>{' '}
              {patientProfile?.gender === 'male'
                ? 'M'
                : patientProfile?.gender === 'female'
                ? 'F'
                : 'Non precise'}
            </p>
            <p>
              <strong>Allergies:</strong> {patientProfile?.allergies ?? 'Aucune'}
            </p>
            <p>
              <strong>Maladies chroniques:</strong> {patientProfile?.chronic_diseases ?? 'Aucune'}
            </p>
            <p>
              <strong>Groupe sanguin:</strong> {patientProfile?.blood_type ?? 'Non precise'}
            </p>
            <p>
              <strong>Notes urgence:</strong> {patientProfile?.emergency_notes ?? 'Aucune'}
            </p>
            {familyMemberName ? (
              <p>
                <strong>Patient principal:</strong> {decodedPatientName}
              </p>
            ) : null}
            <p>
              <strong>Total ordonnances:</strong> {patientPrescriptions.length}
            </p>
            <p>
              <strong>Total medicaments demandes:</strong> {totalMedicinesRequested}
            </p>
            <p>
              <strong>Derniere ordonnance:</strong>{' '}
              {patientPrescriptions[0] ? formatDateTime(patientPrescriptions[0].requested_at) : 'Aucune'}
            </p>
            {statusCounts.length > 0 ? (
              <div>
                <strong>Statuts:</strong>
                {statusCounts.map(([status, count]) => (
                  <p key={status}>
                    {getPrescriptionStatusLabel(status)}: {count}
                  </p>
                ))}
              </div>
            ) : null}
            {!familyMemberId ? (
              <div>
                <strong>Membres de famille:</strong>
                {familyMembers.length === 0 ? (
                  <p>Aucun</p>
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
                          <p>
                            <strong>Nom:</strong> {selectedFamilyMember.name}
                          </p>
                          <p>
                            <strong>Age:</strong> {selectedFamilyMember.age ?? 'Non precise'}
                          </p>
                          <p>
                            <strong>Genre:</strong> {selectedFamilyMember.gender ?? 'Non precise'}
                          </p>
                          <p>
                            <strong>Relation:</strong> {selectedFamilyMember.relationship ?? 'Non precisee'}
                          </p>
                          <p>
                            <strong>Allergies:</strong> {selectedFamilyMember.allergies ?? 'Aucune'}
                          </p>
                          <p>
                            <strong>Maladies chroniques:</strong> {selectedFamilyMember.chronic_diseases ?? 'Aucune'}
                          </p>
                          <p>
                            <strong>Groupe sanguin:</strong> {selectedFamilyMember.blood_type ?? 'Non precise'}
                          </p>
                          <p>
                            <strong>Notes urgence:</strong> {selectedFamilyMember.emergency_notes ?? 'Aucune'}
                          </p>
                        </IonCardContent>
                      </IonCard>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </IonCardContent>
        </IonCard>

        <IonCard className="surface-card">
          <IonCardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={medicalOutline} /> Historique medical
              </IonCardTitle>
              <IonButton
                size="small"
                onClick={() => {
                  resetHistoryForm();
                  setShowHistoryModal(true);
                }}
              >
                Ajouter
              </IonButton>
            </div>
          </IonCardHeader>
          <IonCardContent>
            {medicalHistory.length === 0 ? (
              <IonText color="medium">
                <p>Aucun historique medical enregistre.</p>
              </IonText>
            ) : (
              <IonList>
                {medicalHistory.map((entry) => (
                  <IonItem key={entry.id} lines="full">
                    <IonLabel>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <h3 style={{ marginBottom: 2 }}>{entry.title}</h3>
                        <IonBadge color={historyStatusColor[entry.status]}>{historyStatusLabel[entry.status]}</IonBadge>
                      </div>
                      <p>
                        {historyTypeLabel[entry.type]} · {visibilityLabel[entry.visibility]}
                      </p>
                      <p>{entry.family_member_name ? `Membre: ${entry.family_member_name}` : 'Patient principal'}</p>
                      <p>
                        Debut: {entry.started_at ? formatDateHaiti(entry.started_at) : 'Non precise'} · Fin:{' '}
                        {entry.ended_at ? formatDateHaiti(entry.ended_at) : 'Non precise'}
                      </p>
                      {entry.prescription_id ? (
                        <p>
                          Ordonnance liee: {entry.prescription_print_code ?? entry.prescription_id}{' '}
                          <IonButton
                            size="small"
                            fill="clear"
                            onClick={() => ionRouter.push(`/doctor/prescriptions/${entry.prescription_id}`, 'forward', 'push')}
                          >
                            Ouvrir
                          </IonButton>
                        </p>
                      ) : null}
                      {entry.details ? <p>{entry.details}</p> : null}
                      <p>Maj: {formatDateTime(entry.updated_at)}</p>
                    </IonLabel>
                    <IonButton slot="end" fill="clear" onClick={() => startHistoryEdit(entry)}>
                      <IonIcon icon={createOutline} />
                    </IonButton>
                  </IonItem>
                ))}
              </IonList>
            )}
          </IonCardContent>
        </IonCard>

        <IonCard className="surface-card">
          <IonCardHeader>
            <IonCardTitle>Ordonnances</IonCardTitle>
          </IonCardHeader>
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
                    onClick={() => ionRouter.push(`/doctor/prescriptions/${prescription.id}`, 'forward', 'push')}
                  >
                    <IonLabel>
                      <div className="status-row">
                        <span>Statut:</span>
                        <IonBadge className={getPrescriptionStatusClassName(prescription.status)}>
                          {getPrescriptionStatusLabel(prescription.status)}
                        </IonBadge>
                      </div>
                      <p>Demandee le {formatDateTime(prescription.requested_at)}</p>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            )}
          </IonCardContent>
        </IonCard>

        <IonModal isOpen={showHistoryModal} onDidDismiss={() => setShowHistoryModal(false)}>
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

        <IonFab vertical="bottom" horizontal="center" slot="fixed">
          <IonFabButton
            color="success"
            onClick={() =>
              ionRouter.push(
                `/doctor/create-prescription?patient=${encodeURIComponent(decodedPatientName)}`,
                'forward',
                'push'
              )
            }
          >
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default DoctorPatientPrescriptionsPage;

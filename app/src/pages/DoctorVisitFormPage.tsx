import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonText,
  IonTitle,
  IonToolbar,
  useIonRouter
} from '@ionic/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router';
import { api, ApiDoctorPatientProfile } from '../services/api';
import { useAuth } from '../state/AuthState';

const visitTypeOptions = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'follow_up', label: 'Suivi' },
  { value: 'emergency', label: 'Urgence' },
  { value: 'teleconsultation', label: 'Téléconsultation' },
  { value: 'rehab_follow_up', label: 'Suivi de rééducation' }
];

const visitStatusOptions = [
  { value: 'open', label: 'Ouverte' },
  { value: 'completed', label: 'Complétée' },
  { value: 'cancelled', label: 'Annulée' }
];

const DoctorVisitFormPage: React.FC = () => {
  const { token } = useAuth();
  const location = useLocation();
  const history = useHistory();
  const ionRouter = useIonRouter();
  const search = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const patientUserIdFromQuery = search.get('patientUserId') ? Number(search.get('patientUserId')) : null;
  const familyMemberIdFromQuery = search.get('familyMemberId') ? Number(search.get('familyMemberId')) : null;
  const familyMemberNameParam = search.get('familyMemberName');
  const familyMemberName = familyMemberNameParam ? decodeURIComponent(familyMemberNameParam) : null;
  const patientNameParam = search.get('patient');
  const patientName = patientNameParam ? decodeURIComponent(patientNameParam) : 'Patient';

  const [patientProfile, setPatientProfile] = useState<ApiDoctorPatientProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    visit_date: new Date().toISOString().slice(0, 16),
    visit_type: 'consultation',
    chief_complaint: '',
    diagnosis: '',
    clinical_notes: '',
    treatment_plan: '',
    status: 'open'
  });

  useEffect(() => {
    if (!token || !patientUserIdFromQuery) {
      return;
    }
    api
      .getDoctorPatientProfile(token, patientUserIdFromQuery)
      .then(setPatientProfile)
      .catch(() => setPatientProfile(null));
  }, [token, patientUserIdFromQuery]);

  const canSubmit = useMemo(() => {
    return Boolean(token && patientUserIdFromQuery && form.visit_date.trim());
  }, [token, patientUserIdFromQuery, form.visit_date]);

  const handleChange = useCallback((field: keyof typeof form, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const contextBack = useMemo(() => {
    const params = new URLSearchParams();
    if (patientUserIdFromQuery) {
      params.set('patientUserId', String(patientUserIdFromQuery));
    }
    if (familyMemberIdFromQuery) {
      params.set('familyMemberId', String(familyMemberIdFromQuery));
    }
    if (familyMemberName) {
      params.set('familyMemberName', familyMemberName);
    }
    if (patientName) {
      params.set('patient', patientName);
    }
    return params.toString() ? `?${params.toString()}` : '';
  }, [patientUserIdFromQuery, familyMemberIdFromQuery, familyMemberName, patientName]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !token || !patientUserIdFromQuery) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const normalizedVisitDate = form.visit_date.trim().replace('T', ' ');

      await api.createDoctorVisit(token, {
        patient_user_id: patientUserIdFromQuery,
        family_member_id: familyMemberIdFromQuery ?? null,
        visit_date: normalizedVisitDate,
        visit_type: form.visit_type || null,
        chief_complaint: form.chief_complaint.trim() || null,
        diagnosis: form.diagnosis.trim() || null,
        clinical_notes: form.clinical_notes.trim() || null,
        treatment_plan: form.treatment_plan.trim() || null,
        status: form.status || null
      });
      ionRouter.push(`/doctor/patients/${encodeURIComponent(patientName)}${contextBack}`, 'forward', 'push');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [
    canSubmit,
    token,
    patientUserIdFromQuery,
    familyMemberIdFromQuery,
    patientName,
    contextBack,
    form,
    ionRouter
  ]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={`/doctor/patients/${encodeURIComponent(patientName)}${contextBack}`} />
          </IonButtons>
          <IonTitle>Nouvelle visite</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Patient</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p>
              <strong>Nom:</strong> {patientName}
            </p>
            {patientProfile ? (
              <>
                <p>
                  <strong>Âge:</strong> {patientProfile.age ?? 'N/D'}
                </p>
                <p>
                  <strong>WhatsApp:</strong> {patientProfile.whatsapp ?? 'N/D'}
                </p>
              </>
            ) : null}
            {familyMemberName ? (
              <p>
                <strong>Membre:</strong> {familyMemberName}
              </p>
            ) : null}
          </IonCardContent>
        </IonCard>
        <IonCard className="surface-card">
          <IonCardHeader>
            <IonCardTitle>Détails de la visite</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList>
              <IonItem>
                <IonLabel position="stacked">Date et heure</IonLabel>
                <IonInput
                  type="datetime-local"
                  value={form.visit_date}
                  onIonChange={(event) => handleChange('visit_date', event.detail.value ?? '')}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Type de visite</IonLabel>
                <IonSelect value={form.visit_type} onIonChange={(event) => handleChange('visit_type', event.detail.value ?? '')}>
                  {visitTypeOptions.map((option) => (
                    <IonSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Motif principal</IonLabel>
                <IonInput value={form.chief_complaint} onIonChange={(event) => handleChange('chief_complaint', event.detail.value ?? '')} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Diagnostic</IonLabel>
                <IonInput value={form.diagnosis} onIonChange={(event) => handleChange('diagnosis', event.detail.value ?? '')} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Notes cliniques</IonLabel>
                <IonTextarea
                  rows={4}
                  value={form.clinical_notes}
                  onIonChange={(event) => handleChange('clinical_notes', event.detail.value ?? '')}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Plan de traitement</IonLabel>
                <IonTextarea
                  rows={4}
                  value={form.treatment_plan}
                  onIonChange={(event) => handleChange('treatment_plan', event.detail.value ?? '')}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Statut</IonLabel>
                <IonSelect value={form.status} onIonChange={(event) => handleChange('status', event.detail.value ?? '')}>
                  {visitStatusOptions.map((option) => (
                    <IonSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
            </IonList>
            {error ? <IonText color="danger">{error}</IonText> : null}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <IonButton fill="outline" onClick={() => history.goBack()}>
                Annuler
              </IonButton>
              <IonButton disabled={!canSubmit || saving} onClick={handleSubmit}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </IonButton>
            </div>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default DoctorVisitFormPage;

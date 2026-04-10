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
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
  useIonRouter,
  useIonViewWillEnter
} from '@ionic/react';
import { documentTextOutline, listOutline, medicalOutline, newspaperOutline, personCircleOutline, pulseOutline } from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router';
import { api, ApiVisitDetail } from '../services/api';
import { getPrescriptionCode } from '../utils/prescriptionCode';
import { getMedicalHistoryCode } from '../utils/medicalHistoryCode';
import { formatDateTime } from '../utils/time';
import { useAuth } from '../state/AuthState';

const DoctorVisitDetailPage: React.FC = () => {
  const { token } = useAuth();
  const { visitId } = useParams<{ visitId: string }>();
  const location = useLocation();
  const ionRouter = useIonRouter();
  const [visit, setVisit] = useState<ApiVisitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const search = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const patientParam = search.get('patient');
  const patientName = patientParam ? decodeURIComponent(patientParam) : null;

  const contextParams = useMemo(() => {
    const params = new URLSearchParams();
    if (search.get('patientUserId')) {
      params.set('patientUserId', search.get('patientUserId') as string);
    }
    if (search.get('familyMemberId')) {
      params.set('familyMemberId', search.get('familyMemberId') as string);
    }
    if (patientName) {
      params.set('patient', patientName);
    }
    return params.toString() ? `?${params.toString()}` : '';
  }, [search, patientName]);

  const loadVisit = useCallback(async () => {
    if (!token || !visitId) {
      setVisit(null);
      setLoading(false);
      return;
    }
    const parsedVisitId = Number(visitId);
    if (!Number.isFinite(parsedVisitId) || parsedVisitId <= 0) {
      setVisit(null);
      setError('Identifiant de visite invalide.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDoctorVisitById(token, parsedVisitId);
      setVisit({
        ...data,
        prescriptions: Array.isArray(data.prescriptions) ? data.prescriptions : [],
        medical_history_entries: Array.isArray(data.medical_history_entries) ? data.medical_history_entries : [],
        rehab_entries: Array.isArray(data.rehab_entries) ? data.rehab_entries : [],
      });
    } catch (err) {
      setVisit(null);
      setError(err instanceof Error ? err.message : 'Impossible de charger la visite.');
    } finally {
      setLoading(false);
    }
  }, [token, visitId]);

  useIonViewWillEnter(() => {
    loadVisit();
  });

  useEffect(() => {
    if (token && visitId) {
      loadVisit();
    }
  }, [token, visitId, loadVisit]);

  const navigateToPrescription = (prescriptionId: number | null) => {
    if (!prescriptionId) {
      return;
    }
    ionRouter.push(`/doctor/prescriptions/${prescriptionId}${contextParams}`, 'forward', 'push');
  };

  const navigateToHistory = (historyId: number | null) => {
    if (!historyId) {
      return;
    }
    ionRouter.push(`/doctor/medical-history/${historyId}${contextParams}`, 'forward', 'push');
  };

  const goToCreatePrescriptionFromVisit = () => {
    if (!visit) {
      return;
    }
    const params = new URLSearchParams();
    params.set('patient', visit.patient_name ?? patientName ?? 'Patient');
    params.set('patientUserId', String(visit.patient_user_id));
    params.set('visitId', String(visit.id));
    if (visit.family_member_id) {
      params.set('familyMemberId', String(visit.family_member_id));
    }
    if (visit.family_member_name) {
      params.set('familyMemberName', visit.family_member_name);
    }
    ionRouter.push(`/doctor/create-prescription?${params.toString()}`, 'forward', 'push');
  };

  const goToCreateHistoryFromVisit = () => {
    if (!visit) {
      return;
    }
    const patientRouteName = encodeURIComponent(visit.patient_name ?? patientName ?? 'Patient');
    const params = new URLSearchParams();
    params.set('patientUserId', String(visit.patient_user_id));
    params.set('visitId', String(visit.id));
    params.set('openHistoryModal', '1');
    if (visit.family_member_id) {
      params.set('familyMemberId', String(visit.family_member_id));
    }
    if (visit.family_member_name) {
      params.set('familyMemberName', visit.family_member_name);
    }
    ionRouter.push(`/doctor/patients/${patientRouteName}?${params.toString()}`, 'forward', 'push');
  };

  const goToCreateRehabFromVisit = () => {
    if (!visit) {
      return;
    }
    const patientRouteName = encodeURIComponent(visit.patient_name ?? patientName ?? 'Patient');
    const params = new URLSearchParams();
    params.set('patientUserId', String(visit.patient_user_id));
    params.set('visitId', String(visit.id));
    params.set('openRehabModal', '1');
    if (visit.family_member_id) {
      params.set('familyMemberId', String(visit.family_member_id));
    }
    if (visit.family_member_name) {
      params.set('familyMemberName', visit.family_member_name);
    }
    ionRouter.push(`/doctor/patients/${patientRouteName}?${params.toString()}`, 'forward', 'push');
  };

  const prescriptions = visit?.prescriptions ?? [];
  const historyEntries = visit?.medical_history_entries ?? [];
  const rehabEntries = visit?.rehab_entries ?? [];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={`/doctor/patients${contextParams}`} />
          </IonButtons>
          <IonTitle>Visite {visit ? `${visit.visit_code ?? `VIS-${visit.id}`}` : ''}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {loading ? (
          <IonText style={{ display: 'block', padding: '16px' }}>Chargement...</IonText>
        ) : error ? (
          <IonText color="danger" style={{ display: 'block', padding: '16px' }}>
            {error}
          </IonText>
        ) : visit ? (
          <>
            <IonCard className="surface-card">
              <IonCardHeader>
                <IonCardTitle>
                  <IonIcon icon={documentTextOutline} /> Synthèse
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <p>
                  <strong>Reference:</strong> {visit.visit_code ?? `VIS-${visit.id}`}
                </p>
                <p>
                  <strong>Date:</strong> {visit.visit_date ? formatDateTime(visit.visit_date) : 'N/D'}
                </p>
                <p>
                  <strong>Type:</strong> {visit.visit_type ?? 'Consultation'}
                </p>
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <IonBadge color={visit.status === 'open' ? 'warning' : visit.status === 'completed' ? 'success' : 'medium'}>
                    {visit.status}
                  </IonBadge>
                </div>
                <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--ion-color-medium)' }}>
                  Créée le {formatDateTime(visit.created_at)} · Mise à jour le {formatDateTime(visit.updated_at)}
                </p>
              </IonCardContent>
            </IonCard>

            <IonCard className="surface-card">
              <IonCardHeader>
                <IonCardTitle>
                  <IonIcon icon={personCircleOutline} /> Patient
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <p>
                  <strong>Nom:</strong> {visit.patient_name ?? patientName ?? 'Non renseigné'}
                </p>
                {visit.family_member_name ? (
                  <p>
                    <strong>Membre:</strong> {visit.family_member_name}
                  </p>
                ) : null}
              </IonCardContent>
            </IonCard>

            <IonCard className="surface-card">
              <IonCardHeader>
                <IonCardTitle>
                  <IonIcon icon={newspaperOutline} /> Détails cliniques
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {visit.chief_complaint ? (
                  <p>
                    <strong>Motif:</strong> {visit.chief_complaint}
                  </p>
                ) : null}
                {visit.diagnosis ? (
                  <p>
                    <strong>Diagnostic:</strong> {visit.diagnosis}
                  </p>
                ) : null}
                {visit.clinical_notes ? (
                  <p>
                    <strong>Notes:</strong> {visit.clinical_notes}
                  </p>
                ) : null}
                {visit.treatment_plan ? (
                  <p>
                    <strong>Plan:</strong> {visit.treatment_plan}
                  </p>
                ) : null}
              </IonCardContent>
            </IonCard>

            <IonCard className="surface-card">
              <IonCardHeader>
                <IonCardTitle>
                  <IonIcon icon={listOutline} /> Ordonnances liées
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {prescriptions.length === 0 ? (
                  <IonText color="medium">Aucune ordonnance liée.</IonText>
                ) : (
                  <IonList>
                    {prescriptions.map((prescription) => (
                      <IonItem
                        key={prescription.id}
                        button
                        lines="full"
                        detail
                        onClick={() => navigateToPrescription(prescription.id)}
                      >
                        <IonLabel>
                          <h3 style={{ margin: 0 }}>{getPrescriptionCode(prescription)}</h3>
                          <p style={{ margin: '4px 0 0 0' }}>
                            {prescription.requested_at || visit.visit_date
                              ? formatDateTime(prescription.requested_at ?? visit.visit_date ?? '')
                              : 'N/D'}
                          </p>
                        </IonLabel>
                      </IonItem>
                    ))}
                  </IonList>
                )}
              </IonCardContent>
            </IonCard>

            <IonCard className="surface-card">
              <IonCardHeader>
                <IonCardTitle>
                  <IonIcon icon={medicalOutline} /> Historiques liés
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {historyEntries.length === 0 ? (
                  <IonText color="medium">Aucun historique lié.</IonText>
                ) : (
                  <IonList>
                    {historyEntries.map((entry) => (
                      <IonItem
                        key={entry.id}
                        button
                        lines="full"
                        detail
                        onClick={() => navigateToHistory(entry.id)}
                      >
                        <IonLabel>
                          <h3 style={{ margin: 0 }}>{getMedicalHistoryCode(entry)}</h3>
                          <p style={{ margin: '4px 0 0 0' }}>{entry.title}</p>
                        </IonLabel>
                      </IonItem>
                    ))}
                  </IonList>
                )}
              </IonCardContent>
            </IonCard>

            <IonCard className="surface-card">
              <IonCardHeader>
                <IonCardTitle>
                  <IonIcon icon={pulseOutline} /> Rééducations liées
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {rehabEntries.length === 0 ? (
                  <IonText color="medium">Aucune rééducation liée.</IonText>
                ) : (
                  <IonList>
                    {rehabEntries.map((rehab) => (
                      <IonItem key={rehab.id} lines="full">
                        <IonLabel>
                          <h3 style={{ margin: 0 }}>{rehab.reference}</h3>
                          <p style={{ margin: '4px 0 0 0' }}>
                            {rehab.sessions_per_week ?? 'N/D'} séance(s)/semaine · {rehab.duration_weeks ?? 'N/D'} semaine(s)
                          </p>
                        </IonLabel>
                      </IonItem>
                    ))}
                  </IonList>
                )}
              </IonCardContent>
            </IonCard>

            <IonCard className="surface-card">
              <IonCardHeader>
                <IonCardTitle>Actions</IonCardTitle>
              </IonCardHeader>
              <IonCardContent style={{ display: 'grid', gap: '8px' }}>
                <IonButton expand="block" color="primary" onClick={goToCreatePrescriptionFromVisit}>
                  Ordonnance +
                </IonButton>
                <IonButton expand="block" color="primary" onClick={goToCreateHistoryFromVisit}>
                  Historique +
                </IonButton>
                <IonButton expand="block" color="primary" onClick={goToCreateRehabFromVisit}>
                  Reeducation +
                </IonButton>
              </IonCardContent>
            </IonCard>
          </>
        ) : (
          <IonText style={{ display: 'block', padding: '16px' }}>Visite introuvable.</IonText>
        )}
      </IonContent>
    </IonPage>
  );
};

export default DoctorVisitDetailPage;

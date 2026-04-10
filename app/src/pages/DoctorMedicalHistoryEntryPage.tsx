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
  useIonRouter
} from '@ionic/react';
import { createOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router';
import { api, ApiMedicalHistoryEntry } from '../services/api';
import { useAuth } from '../state/AuthState';
import { formatDateHaiti, formatDateTime } from '../utils/time';
import { getPrescriptionCode } from '../utils/prescriptionCode';
import { getMedicalHistoryCode } from '../utils/medicalHistoryCode';
import { getPrescriptionStatusClassName, getPrescriptionStatusLabel } from '../utils/prescriptionStatus';

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

const DoctorMedicalHistoryEntryPage: React.FC = () => {
  const { token } = useAuth();
  const ionRouter = useIonRouter();
  const { id } = useParams<{ id: string }>();
  const entryId = Number(id);
  const location = useLocation();
  const search = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const patientUserId = search.get('patientUserId') ? Number(search.get('patientUserId')) : null;
  const familyMemberId = search.get('familyMemberId') ? Number(search.get('familyMemberId')) : null;
  const familyMemberName = search.get('familyMemberName') ? decodeURIComponent(search.get('familyMemberName') as string) : null;
  const patientNameParam = search.get('patient') ? decodeURIComponent(search.get('patient') as string) : 'patient';

  const [entry, setEntry] = useState<ApiMedicalHistoryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const contextParams = useMemo(() => {
    const params = new URLSearchParams();
    if (patientUserId) {
      params.set('patientUserId', String(patientUserId));
    }
    if (familyMemberId) {
      params.set('familyMemberId', String(familyMemberId));
    }
    if (familyMemberName) {
      params.set('familyMemberName', familyMemberName);
    }
    if (patientNameParam) {
      params.set('patient', patientNameParam);
    }
    return params;
  }, [patientUserId, familyMemberId, familyMemberName, patientNameParam]);

  useEffect(() => {
    if (!token) {
      setError('Authentification requise.');
      setLoading(false);
      return;
    }
    if (!patientUserId) {
      setError('Patient introuvable.');
      setLoading(false);
      return;
    }
    if (!Number.isFinite(entryId) || entryId <= 0) {
      setError('Historique invalide.');
      setLoading(false);
      return;
    }

    setLoading(true);
    api
      .getDoctorPatientMedicalHistory(token, patientUserId, { family_member_id: familyMemberId ?? undefined })
      .then((rows) => {
        const found = rows.find((row) => row.id === entryId);
        if (!found) {
          setError('Historique medical introuvable.');
          setEntry(null);
        } else {
          setEntry(found);
          setError(null);
        }
      })
      .catch(() => {
        setError('Impossible de charger l\'historique.');
        setEntry(null);
      })
      .finally(() => setLoading(false));
  }, [token, patientUserId, familyMemberId, entryId]);

  const contextParamsWith = (extra?: Record<string, string>) => {
    const params = new URLSearchParams(contextParams.toString());
    Object.entries(extra ?? {}).forEach(([key, value]) => {
      params.set(key, value);
    });
    return params.toString() ? `?${params.toString()}` : '';
  };

  const handleEdit = () => {
    const routeName = patientNameParam || 'patient';
    ionRouter.push(`/doctor/patients/${encodeURIComponent(routeName)}${contextParamsWith({ historyId: String(entry?.id ?? entryId) })}`, 'forward', 'push');
  };

  const handlePrescriptionNavigation = (prescriptionId: number | null | undefined) => {
    if (!prescriptionId || prescriptionId <= 0) {
      return;
    }
    ionRouter.push(`/doctor/prescriptions/${prescriptionId}${contextParamsWith({})}`, 'forward', 'push');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/doctor/patients" />
          </IonButtons>
          <IonTitle>Historique medical</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div style={{ padding: '16px' }}>
          {loading ? (
            <IonText>Chargement...</IonText>
          ) : error ? (
            <IonText color="danger">{error}</IonText>
          ) : entry ? (
            <>
              <IonCard className="surface-card">
                <IonCardHeader>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <IonCardTitle>Présentation</IonCardTitle>
                    <IonButton size="small" fill="outline" onClick={handleEdit}>
                      <IonIcon icon={createOutline} />
                      &nbsp;Modifier
                    </IonButton>
                  </div>
                </IonCardHeader>
                <IonCardContent>
                  <p style={{ margin: '0 0 4px 0' }}>
                    <strong>Code:</strong> {getMedicalHistoryCode(entry)}
                  </p>
                  <p style={{ margin: '0 0 4px 0' }}>
                    <strong>Titre:</strong> {entry.title}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '4px 0 8px 0' }}>
                    <IonBadge color="tertiary">{historyTypeLabel[entry.type]}</IonBadge>
                    <IonBadge color={historyStatusColor[entry.status]}>{historyStatusLabel[entry.status]}</IonBadge>
                    <IonBadge color={visibilityColor[entry.visibility]}>{visibilityLabel[entry.visibility]}</IonBadge>
                  </div>
                  <p>
                    <strong>Créé le:</strong> {formatDateTime(entry.created_at)} · <strong>Dernière mise à jour:</strong>{' '}
                    {formatDateTime(entry.updated_at)}
                  </p>
                </IonCardContent>
              </IonCard>

              <IonCard className="surface-card">
                <IonCardHeader>
                  <IonCardTitle>Détails cliniques</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <p>
                    <strong>Détails:</strong> {entry.details ?? 'Aucune donnée fournie'}
                  </p>
                  <p>
                    <strong>Début:</strong> {entry.started_at ? formatDateHaiti(entry.started_at) : 'Non précisé'} · <strong>Fin:</strong>{' '}
                    {entry.ended_at ? formatDateHaiti(entry.ended_at) : 'Non précisé'}
                  </p>
                </IonCardContent>
              </IonCard>

              <IonCard className="surface-card">
                <IonCardHeader>
                  <IonCardTitle>Ordonnances liées</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  {entry.linked_prescriptions && entry.linked_prescriptions.length > 0 ? (
                    <IonList>
                      {entry.linked_prescriptions.map((rx) => (
                        <IonItem
                          key={`linked-rx-${rx.id}`}
                          button
                          detail
                          lines="none"
                          onClick={() => rx.id && handlePrescriptionNavigation(rx.id)}
                        >
                          <IonLabel>
                            <p style={{ margin: 0 }}>
                              <strong>{getPrescriptionCode(rx)}</strong>
                            </p>
                            <p style={{ margin: 0 }}>
                              Demandée le {rx.requested_at ? formatDateTime(rx.requested_at) : 'N/D'}
                            </p>
                          </IonLabel>
                          <IonBadge className={getPrescriptionStatusClassName(rx.status ?? 'pending')}>
                            {getPrescriptionStatusLabel(rx.status ?? 'pending')}
                          </IonBadge>
                        </IonItem>
                      ))}
                    </IonList>
                  ) : entry.prescription_id ? (
                    <IonItem
                      button
                      detail
                      lines="none"
                      onClick={() => handlePrescriptionNavigation(entry.prescription_id ?? 0)}
                    >
                      <IonLabel>
                        <p style={{ margin: 0 }}>
                          <strong>{entry.prescription_print_code ?? `#${entry.prescription_id}`}</strong>
                        </p>
                        <p style={{ margin: 0 }}>
                          Demandée le {entry.prescription_requested_at ? formatDateTime(entry.prescription_requested_at) : 'N/D'}
                        </p>
                      </IonLabel>
                    </IonItem>
                  ) : (
                    <IonText color="medium">Aucune ordonnance liée.</IonText>
                  )}
                </IonCardContent>
              </IonCard>

              {entry.linked_rehab_entries && entry.linked_rehab_entries.length > 0 ? (
                <IonCard className="surface-card">
                  <IonCardHeader>
                    <IonCardTitle>Reeducation liée</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonList>
                      {entry.linked_rehab_entries.map((rehab) => (
                        <IonItem key={`rehab-${rehab.id}`} lines="none">
                          <IonLabel>
                            <p style={{ margin: 0 }}>
                              <strong>{rehab.reference}</strong>
                            </p>
                            <p style={{ margin: '2px 0' }}>
                              Suivi: {rehab.follow_up_date ? formatDateHaiti(rehab.follow_up_date) : 'N/D'} · Sessions/semaine:{' '}
                              {rehab.sessions_per_week ?? 'N/D'} · Durée: {rehab.duration_weeks ?? 'N/D'} semaine(s)
                            </p>
                            <p style={{ margin: '2px 0' }}>
                              Douleur: {rehab.pain_score ?? 'N/D'} · Mobilité: {rehab.mobility_score ?? 'N/D'}
                            </p>
                            {rehab.goals ? <p style={{ margin: '2px 0' }}><strong>Objectifs:</strong> {rehab.goals}</p> : null}
                            {rehab.progress_notes ? (
                              <p style={{ margin: '2px 0' }}>
                                <strong>Progression:</strong> {rehab.progress_notes}
                              </p>
                            ) : null}
                          </IonLabel>
                        </IonItem>
                      ))}
                    </IonList>
                  </IonCardContent>
                </IonCard>
              ) : null}
            </>
          ) : (
            <IonText color="medium">Aucune donnée disponible.</IonText>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DoctorMedicalHistoryEntryPage;

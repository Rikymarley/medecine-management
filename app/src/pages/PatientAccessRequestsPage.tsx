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
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, type ApiDoctorPatientAccessRequest } from '../services/api';
import { useAuth } from '../state/AuthState';

const formatDateTime = (value?: string | null) => {
  if (!value) return 'N/D';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/D';
  return date.toLocaleString('fr-HT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const statusLabel = (status: ApiDoctorPatientAccessRequest['status']) => {
  if (status === 'pending') return 'En attente';
  if (status === 'approved') return 'Approuvee';
  if (status === 'denied') return 'Refusee';
  return status;
};

const statusColor = (status: ApiDoctorPatientAccessRequest['status']) => {
  if (status === 'pending') return 'warning';
  if (status === 'approved') return 'success';
  if (status === 'denied') return 'danger';
  return 'medium';
};

const canManageBlockOnRow = (row: ApiDoctorPatientAccessRequest) => row.status !== 'pending';

const PatientAccessRequestsPage: React.FC = () => {
  const { token } = useAuth();
  const [rows, setRows] = useState<ApiDoctorPatientAccessRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await api.getPatientAccessRequests(token);
      setRows(response);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Impossible de charger les demandes.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const pendingCount = useMemo(() => rows.filter((row) => row.status === 'pending').length, [rows]);
  const latestRequestByDoctorId = useMemo(() => {
    const latest = new Map<number, number>();
    rows.forEach((row) => {
      if (!latest.has(row.doctor_id)) {
        latest.set(row.doctor_id, row.id);
      }
    });
    return latest;
  }, [rows]);

  const respond = async (requestId: number, status: 'approved' | 'denied') => {
    if (!token) return;
    setActionKey(`respond:${requestId}`);
    setMessage(null);
    try {
      const updated = await api.respondPatientAccessRequest(token, requestId, { status });
      setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setMessage(status === 'approved' ? 'Demande approuvee.' : 'Demande refusee.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Action impossible.');
    } finally {
      setActionKey(null);
    }
  };

  const setDoctorBlockedState = (doctorId: number, isBlocked: boolean) => {
    setRows((prev) =>
      prev.map((row) => (row.doctor_id === doctorId ? { ...row, is_blocked: isBlocked } : row))
    );
  };

  const toggleDoctorBlock = async (doctorId: number, shouldBlock: boolean) => {
    if (!token) return;
    setActionKey(`${shouldBlock ? 'block' : 'unblock'}:${doctorId}`);
    setMessage(null);
    try {
      const response = shouldBlock
        ? await api.blockPatientAccessDoctor(token, doctorId)
        : await api.unblockPatientAccessDoctor(token, doctorId);
      setDoctorBlockedState(response.doctor_id, response.is_blocked);
      setMessage(response.message);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Action impossible.');
    } finally {
      setActionKey(null);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient" />
          </IonButtons>
          <IonTitle>Demandes d'acces</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardHeader>
            <IonCardTitle>Demandes medecins ({pendingCount} en attente)</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {message ? (
              <IonText color="medium">
                <p>{message}</p>
              </IonText>
            ) : null}
            {loading ? (
              <IonText color="medium">
                <p>Chargement...</p>
              </IonText>
            ) : rows.length === 0 ? (
              <IonText color="medium">
                <p>Aucune demande pour le moment.</p>
              </IonText>
            ) : (
              <IonList>
                {rows.map((row) => (
                  <IonItem key={row.id} lines="full">
                    <IonLabel>
                      <h3 style={{ marginBottom: '4px' }}>{row.doctor_name ?? 'Medecin non precise'}</h3>
                      <p>
                        <strong>Statut:</strong>{' '}
                        <IonText color={statusColor(row.status)}>{statusLabel(row.status)}</IonText>
                      </p>
                      <p><strong>Envoyee le:</strong> {formatDateTime(row.created_at)}</p>
                      {row.message ? <p><strong>Message:</strong> {row.message}</p> : null}
                      {row.responded_at ? <p><strong>Traitee le:</strong> {formatDateTime(row.responded_at)}</p> : null}
                      {row.is_blocked ? (
                        <p>
                          <strong>Blocage:</strong> <IonText color="danger">Ce medecin est bloque</IonText>
                        </p>
                      ) : null}
                    </IonLabel>
                    {row.status === 'pending' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '118px' }}>
                        <IonButton
                          size="small"
                          color="success"
                          disabled={actionKey === `respond:${row.id}`}
                          onClick={() => {
                            void respond(row.id, 'approved');
                          }}
                        >
                          Approuver
                        </IonButton>
                        <IonButton
                          size="small"
                          fill="outline"
                          color="danger"
                          disabled={actionKey === `respond:${row.id}`}
                          onClick={() => {
                            void respond(row.id, 'denied');
                          }}
                        >
                          Refuser
                        </IonButton>
                      </div>
                    ) : canManageBlockOnRow(row) && latestRequestByDoctorId.get(row.doctor_id) === row.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '118px' }}>
                        {row.is_blocked ? (
                          <IonButton
                            size="small"
                            fill="outline"
                            color="success"
                            disabled={actionKey === `unblock:${row.doctor_id}`}
                            onClick={() => {
                              void toggleDoctorBlock(row.doctor_id, false);
                            }}
                          >
                            Debloquer
                          </IonButton>
                        ) : (
                          <IonButton
                            size="small"
                            fill="outline"
                            color="danger"
                            disabled={actionKey === `block:${row.doctor_id}`}
                            onClick={() => {
                              void toggleDoctorBlock(row.doctor_id, true);
                            }}
                          >
                            Bloquer
                          </IonButton>
                        )}
                      </div>
                    ) : null}
                  </IonItem>
                ))}
              </IonList>
            )}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default PatientAccessRequestsPage;

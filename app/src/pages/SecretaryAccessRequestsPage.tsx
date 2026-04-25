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
import { api, type ApiDoctorSecretaryAccessRequest } from '../services/api';
import { useAuth } from '../state/AuthState';
import { formatDateTime as formatDateTimeLabel } from '../utils/time';

const statusLabel = (status: ApiDoctorSecretaryAccessRequest['status']) => {
  if (status === 'pending') return 'En attente';
  if (status === 'approved') return 'Approuvee';
  if (status === 'denied') return 'Refusee';
  return status;
};

const statusColor = (status: ApiDoctorSecretaryAccessRequest['status']) => {
  if (status === 'pending') return 'warning';
  if (status === 'approved') return 'success';
  if (status === 'denied') return 'danger';
  return 'medium';
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'N/D';
  return formatDateTimeLabel(value);
};

const SecretaryAccessRequestsPage: React.FC = () => {
  const { token } = useAuth();
  const [rows, setRows] = useState<ApiDoctorSecretaryAccessRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await api.getSecretaryAccessRequests(token);
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

  const respond = async (requestId: number, status: 'approved' | 'denied') => {
    if (!token) return;
    setActionKey(`respond:${requestId}`);
    setMessage(null);
    try {
      const updated = await api.respondSecretaryAccessRequest(token, requestId, { status });
      setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setMessage(status === 'approved' ? 'Demande approuvee.' : 'Demande refusee.');
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
            <IonBackButton defaultHref="/secretaire" />
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

export default SecretaryAccessRequestsPage;

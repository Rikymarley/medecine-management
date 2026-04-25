import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSearchbar,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import { personOutline } from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import {
  api,
  type ApiDoctorSecretaryAccessRequest,
  type ApiSecretaryLookup,
} from '../services/api';
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

const DoctorSecretariesPage: React.FC = () => {
  const LOAD_TTL_MS = 30_000;
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [directory, setDirectory] = useState<ApiSecretaryLookup[]>([]);
  const [requests, setRequests] = useState<ApiDoctorSecretaryAccessRequest[]>([]);
  const [searchingDirectory, setSearchingDirectory] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestsLoadAtRef = useRef(0);

  const loadRequests = useCallback(async (force = false) => {
    if (!force && Date.now() - lastRequestsLoadAtRef.current < LOAD_TTL_MS) {
      return;
    }
    if (!token) return;
    setLoadingRequests(true);
    try {
      const rows = await api.getDoctorSecretaryAccessRequests(token);
      setRequests(rows);
      lastRequestsLoadAtRef.current = Date.now();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Impossible de charger les demandes.');
    } finally {
      setLoadingRequests(false);
    }
  }, [LOAD_TTL_MS, token]);

  const searchDirectory = useCallback(async (value: string) => {
    if (!token || value.trim().length < 2) {
      setDirectory([]);
      setSearchingDirectory(false);
      return;
    }
    setSearchingDirectory(true);
    try {
      const rows = await api.searchDoctorSecretaries(token, value);
      setDirectory(rows);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Impossible de charger la liste des secretaires.');
      setDirectory([]);
    } finally {
      setSearchingDirectory(false);
    }
  }, [token]);

  useEffect(() => {
    void loadRequests(true);
  }, [loadRequests]);

  useIonViewWillEnter(() => {
    void loadRequests(false);
  });

  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    if (query.trim().length < 2) {
      setDirectory([]);
      setSearchingDirectory(false);
      return;
    }
    searchDebounceRef.current = setTimeout(() => {
      void searchDirectory(query);
    }, 250);
  }, [query, searchDirectory]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const latestRequestBySecretaryId = useMemo(() => {
    const latest = new Map<number, ApiDoctorSecretaryAccessRequest>();
    requests.forEach((row) => {
      if (!latest.has(row.secretary_id)) {
        latest.set(row.secretary_id, row);
      }
    });
    return latest;
  }, [requests]);

  const pendingCount = useMemo(
    () => requests.filter((row) => row.status === 'pending').length,
    [requests]
  );

  const requestAccess = async (secretary: ApiSecretaryLookup) => {
    if (!token) return;
    setActionKey(`request:${secretary.id}`);
    setMessage(null);
    try {
      const created = await api.createDoctorSecretaryAccessRequest(token, secretary.id);
      setRequests((prev) => {
        const alreadyExists = prev.some((row) => row.id === created.id);
        if (alreadyExists) {
          return prev.map((row) => (row.id === created.id ? created : row));
        }
        return [created, ...prev];
      });
      if (created.whatsapp_url) {
        window.open(created.whatsapp_url, '_blank', 'noopener,noreferrer');
        setMessage('Demande envoyee. Vous pouvez aussi notifier la secretaire via WhatsApp.');
      } else {
        setMessage('Demande envoyee.');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Envoi impossible.');
    } finally {
      setActionKey(null);
    }
  };

  const secretaryEntries = useMemo(
    () =>
      requests
        .map((row) => ({
          id: row.secretary_id,
          name: row.secretary_name ?? 'Secretaire non precisee',
          status: row.status,
          created_at: row.created_at,
          responded_at: row.responded_at,
          response_message: row.response_message
        }))
        .filter((entry, index, self) => self.findIndex((candidate) => candidate.id === entry.id) === index)
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })),
    [requests]
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/doctor" />
          </IonButtons>
          <IonTitle>Secretaires</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardContent>
            <IonSearchbar
              value={query}
              placeholder="Rechercher une secretaire dans la base (nom, email, telephone)"
              onIonInput={(event) => setQuery(event.detail.value ?? '')}
            />
            {searchingDirectory ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 10px' }}>
                <IonSpinner name="crescent" />
              </div>
            ) : null}
            {message ? (
              <IonText color="medium">
                <p>{message}</p>
              </IonText>
            ) : null}
            {query.trim().length >= 2 ? (
              directory.length === 0 ? (
                <IonText color="medium">
                  <p>Aucune secretaire trouvee dans la base pour cette recherche.</p>
                </IonText>
              ) : (
                <IonList inset>
                  {directory.map((row) => {
                    const latestRequest = latestRequestBySecretaryId.get(row.id);
                    const hasApproved = latestRequest?.status === 'approved';
                    const hasPending = latestRequest?.status === 'pending';

                    return (
                      <IonItem key={`db-${row.id}`} lines="full">
                        <div
                          slot="start"
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            display: 'grid',
                            placeItems: 'center',
                            background: '#dbeafe',
                            color: '#1e40af'
                          }}
                        >
                          <IonIcon icon={personOutline} />
                        </div>
                        <IonLabel>
                          <h3>{row.name}</h3>
                          <p>
                            {row.phone ? `Tel: ${row.phone}` : 'Tel: non renseigne'}
                            {row.email ? ` · Email: ${row.email}` : ''}
                          </p>
                        </IonLabel>
                        {hasApproved ? (
                          <IonBadge color="success">Acces approuve</IonBadge>
                        ) : (
                          <IonButton
                            size="small"
                            disabled={actionKey === `request:${row.id}`}
                            onClick={() => {
                              void requestAccess(row);
                            }}
                          >
                            {hasPending ? 'Renvoyer demande' : 'Demander acces'}
                          </IonButton>
                        )}
                      </IonItem>
                    );
                  })}
                </IonList>
              )
            ) : null}

            {loadingRequests ? (
              <IonText color="medium">
                <p>Chargement...</p>
              </IonText>
            ) : secretaryEntries.length === 0 ? (
              <IonText color="medium">
                <p>Aucune secretaire pour le moment.</p>
              </IonText>
            ) : (
              <IonList>
                {secretaryEntries.map((entry) => (
                  <IonItem key={`secretary-${entry.id}`} lines="full">
                    <div
                      slot="start"
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        background: '#dbeafe',
                        color: '#1e40af'
                      }}
                    >
                      <IonIcon icon={personOutline} />
                    </div>
                    <IonLabel>
                      <h3>{entry.name}</h3>
                      <p>
                        <strong>Statut:</strong>{' '}
                        <IonText color={statusColor(entry.status)}>{statusLabel(entry.status)}</IonText>
                      </p>
                      <p><strong>Envoyee le:</strong> {formatDateTime(entry.created_at)}</p>
                      {entry.responded_at ? <p><strong>Traitee le:</strong> {formatDateTime(entry.responded_at)}</p> : null}
                      {entry.response_message ? <p><strong>Reponse:</strong> {entry.response_message}</p> : null}
                    </IonLabel>
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

export default DoctorSecretariesPage;

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
  IonToolbar
} from '@ionic/react';
import { chevronDownOutline, chevronUpOutline } from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPharmacy, ApiPharmacyResponse, ApiPrescription } from '../services/api';
import {
  enqueuePharmacyResponse,
  flushPharmacyResponsesOutbox,
  getPendingPharmacyResponseCount
} from '../services/offlineQueue';
import { useAuth } from '../state/AuthState';
import { getPrescriptionCode } from '../utils/prescriptionCode';
import { getPrescriptionStatusClassName, getPrescriptionStatusLabel } from '../utils/prescriptionStatus';
import { minutesAgo, minutesUntil } from '../utils/time';

const STATUS_ACTIONS: { key: ApiPharmacyResponse['status']; label: string; color: string }[] = [
  { key: 'out_of_stock', label: '❌ 0 - Rupture', color: 'danger' },
  { key: 'very_low', label: '🔴 1-10 - Tres bas', color: 'danger' },
  { key: 'low', label: '🟠 11-30 - Bas', color: 'warning' },
  { key: 'available', label: '🟡 31-100 - Disponible', color: 'tertiary' },
  { key: 'high', label: '🟢 100+ - Eleve', color: 'success' },
  { key: 'equivalent', label: '🔄 Equivalent', color: 'medium' }
];

const statusLabel = (status: ApiPharmacyResponse['status']) => {
  switch (status) {
    case 'out_of_stock':
    case 'not_available':
      return '❌ Rupture';
    case 'very_low':
      return '🔴 Tres bas (1-10)';
    case 'low':
      return '🟠 Bas (11-30)';
    case 'available':
      return '🟡 Disponible (31-100)';
    case 'high':
      return '🟢 Eleve (100+)';
    case 'equivalent':
      return '🔄 Equivalent disponible';
    default:
      return '❌ Rupture';
  }
};

type FilterKey = 'all' | 'sent_to_pharmacies' | 'partially_available' | 'available' | 'expired';

const getStatusTimeDiffLabel = (requestedAt: string) => {
  const diffMinutes = Math.max(0, Math.round((Date.now() - new Date(requestedAt).getTime()) / 60000));
  return `il y a ${diffMinutes} min`;
};

const PharmacyPrescriptionsPage: React.FC = () => {
  const { token, user } = useAuth();
  const [pharmacies, setPharmacies] = useState<ApiPharmacy[]>([]);
  const [myPharmacy, setMyPharmacy] = useState<ApiPharmacy | null>(null);
  const [prescriptions, setPrescriptions] = useState<ApiPrescription[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingOutboxCount, setPendingOutboxCount] = useState<number>(getPendingPharmacyResponseCount());
  const [expandedPrescriptions, setExpandedPrescriptions] = useState<Record<number, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<FilterKey>('sent_to_pharmacies');
  const [reactivatingPrescriptionId, setReactivatingPrescriptionId] = useState<number | null>(null);

  const cacheKey = user ? `pharmacy-prescriptions-cache-${user.id}` : null;

  const loadData = useCallback(async () => {
    try {
      if (!token) {
        throw new Error('Authentication required');
      }

      const [pharmacyData, prescriptionData, meData] = await Promise.all([
        api.getPharmacies(),
        api.getPharmacyPrescriptions(token),
        api.getMyPharmacy(token).then((data) => data).catch(() => null)
      ]);

      setPharmacies(pharmacyData);
      setPrescriptions(prescriptionData);
      setMyPharmacy(meData);

      if (cacheKey) {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            pharmacies: pharmacyData,
            prescriptions: prescriptionData,
            myPharmacy: meData
          })
        );
      }
    } catch {
      if (!cacheKey) {
        return;
      }
      const raw = localStorage.getItem(cacheKey);
      if (!raw) {
        return;
      }
      try {
        const parsed = JSON.parse(raw) as {
          pharmacies?: ApiPharmacy[];
          prescriptions?: ApiPrescription[];
          myPharmacy?: ApiPharmacy | null;
        };
        setPharmacies(Array.isArray(parsed.pharmacies) ? parsed.pharmacies : []);
        setPrescriptions(Array.isArray(parsed.prescriptions) ? parsed.prescriptions : []);
        setMyPharmacy(parsed.myPharmacy ?? null);
        setSyncMessage('Hors ligne: donnees locales chargees.');
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }
  }, [cacheKey, token]);

  useEffect(() => {
    loadData().catch(() => undefined);
  }, [loadData]);

  useEffect(() => {
    if (!cacheKey) {
      return;
    }
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        pharmacies,
        prescriptions,
        myPharmacy
      })
    );
  }, [cacheKey, myPharmacy, pharmacies, prescriptions]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!token || !isOnline) {
      setPendingOutboxCount(getPendingPharmacyResponseCount());
      return;
    }

    flushPharmacyResponsesOutbox(token)
      .then((remaining) => {
        setPendingOutboxCount(remaining);
        if (remaining === 0) {
          setSyncMessage('Synchronisation terminee.');
        } else {
          setSyncMessage(`${remaining} action(s) en attente.`);
        }
        return loadData();
      })
      .catch(() => {
        setPendingOutboxCount(getPendingPharmacyResponseCount());
      });
  }, [isOnline, loadData, token]);

  const pharmacy = myPharmacy ?? pharmacies.find((item) => item.id === user?.pharmacy_id) ?? null;
  const pharmacyHasGps = Boolean(String(pharmacy?.latitude ?? '').trim() && String(pharmacy?.longitude ?? '').trim());

  const togglePrescription = (prescriptionId: number) => {
    setExpandedPrescriptions((prev) => ({
      ...prev,
      [prescriptionId]: !(prev[prescriptionId] ?? false)
    }));
  };

  const responsesByKey = useMemo(() => {
    const map: Record<string, ApiPharmacyResponse> = {};
    prescriptions.forEach((prescription) => {
      prescription.responses.forEach((response) => {
        const key = `${response.prescription_id}-${response.medicine_request_id}-${response.pharmacy_id}`;
        map[key] = response;
      });
    });
    return map;
  }, [prescriptions]);

  const kpis = useMemo(
    () => ({
      total: prescriptions.length,
      sent_to_pharmacies: prescriptions.filter((p) => p.status === 'sent_to_pharmacies').length,
      partially_available: prescriptions.filter((p) => p.status === 'partially_available').length,
      available: prescriptions.filter((p) => p.status === 'available').length,
      expired: prescriptions.filter((p) => p.status === 'expired').length
    }),
    [prescriptions]
  );

  const filteredPrescriptions = useMemo(() => {
    if (statusFilter === 'all') {
      return prescriptions;
    }
    return prescriptions.filter((p) => p.status === statusFilter);
  }, [prescriptions, statusFilter]);

  const handleRespond = async (payload: {
    prescription_id: number;
    medicine_request_id: number;
    status: ApiPharmacyResponse['status'];
  }) => {
    const currentPharmacyId = pharmacy?.id ?? user?.pharmacy_id ?? null;
    if (!token || !currentPharmacyId) {
      setError('Veuillez vous reconnecter.');
      return;
    }
    if (!pharmacyHasGps) {
      setError('GPS requis: renseignez latitude/longitude dans le profil pharmacie.');
      return;
    }

    setError(null);
    setSyncMessage(null);
    const queuePayload = {
      prescription_id: payload.prescription_id,
      medicine_request_id: payload.medicine_request_id,
      pharmacy_id: currentPharmacyId,
      status: payload.status,
      expires_at_minutes: 60
    } as const;

    const applyOptimisticResponse = () => {
      const nowIso = new Date().toISOString();
      const expiresAtIso = new Date(Date.now() + queuePayload.expires_at_minutes * 60_000).toISOString();
      setPrescriptions((prev) =>
        prev.map((rx) => {
          if (rx.id !== queuePayload.prescription_id) {
            return rx;
          }
          const nextResponses = rx.responses.filter(
            (r) => !(r.pharmacy_id === queuePayload.pharmacy_id && r.medicine_request_id === queuePayload.medicine_request_id)
          );
          const nextResponse: ApiPharmacyResponse = {
            id: -Date.now(),
            pharmacy_id: queuePayload.pharmacy_id,
            prescription_id: queuePayload.prescription_id,
            medicine_request_id: queuePayload.medicine_request_id,
            status: queuePayload.status,
            responded_at: nowIso,
            expires_at: expiresAtIso
          };
          nextResponses.push(nextResponse);
          return { ...rx, responses: nextResponses };
        })
      );
    };

    applyOptimisticResponse();

    if (!isOnline) {
      const queued = enqueuePharmacyResponse(queuePayload);
      setPendingOutboxCount(queued);
      setSyncMessage(`Hors ligne: reponse en file d'attente (${queued}).`);
      return;
    }

    try {
      await api.createPharmacyResponse(token, queuePayload);
      await loadData();
    } catch (err) {
      const queued = enqueuePharmacyResponse(queuePayload);
      setPendingOutboxCount(queued);
      setSyncMessage(`Reseau indisponible: reponse en file d'attente (${queued}).`);
      setError(err instanceof Error ? err.message : "Echec de l'enregistrement de la reponse");
    }
  };

  const handleReactivatePrescription = async (prescriptionId: number) => {
    if (!token) {
      return;
    }
    try {
      setReactivatingPrescriptionId(prescriptionId);
      await api.reactivatePharmacyPrescription(token, prescriptionId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de reactiver.');
    } finally {
      setReactivatingPrescriptionId(null);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/pharmacy" />
          </IonButtons>
          <IonTitle>Ordonnances</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />

        <IonCard className="surface-card">
          <IonCardContent>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <IonBadge color={isOnline ? 'success' : 'warning'}>{isOnline ? 'En ligne' : 'Hors ligne'}</IonBadge>
              <IonBadge color={pendingOutboxCount > 0 ? 'warning' : 'success'}>
                Actions en attente: {pendingOutboxCount}
              </IonBadge>
            </div>
            {syncMessage ? (
              <IonText color="medium">
                <p style={{ marginBottom: 0 }}>{syncMessage}</p>
              </IonText>
            ) : null}
          </IonCardContent>
        </IonCard>

        {error ? (
          <IonText color="danger">
            <p>{error}</p>
          </IonText>
        ) : null}

        {pharmacy ? (
          <>
            {!pharmacyHasGps ? (
              <IonText color="warning">
                <p>GPS requis: configurez la latitude/longitude dans le profil pharmacie pour activer les boutons de disponibilite.</p>
              </IonText>
            ) : null}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0,1fr))',
                gap: '8px',
                marginTop: '8px',
                marginBottom: '6px'
              }}
            >
              <IonBadge
                color={statusFilter === 'all' ? 'primary' : 'medium'}
                style={{ width: '100%', gridColumn: '1 / -1', padding: '10px', justifyContent: 'center', cursor: 'pointer' }}
                onClick={() => setStatusFilter('all')}
              >
                Total: {kpis.total}
              </IonBadge>
              <IonBadge
                color={statusFilter === 'sent_to_pharmacies' ? 'primary' : 'warning'}
                style={{ padding: '10px', justifyContent: 'center', cursor: 'pointer' }}
                onClick={() => setStatusFilter('sent_to_pharmacies')}
              >
                Envoyees: {kpis.sent_to_pharmacies}
              </IonBadge>
              <IonBadge
                color={statusFilter === 'partially_available' ? 'primary' : 'tertiary'}
                style={{ padding: '10px', justifyContent: 'center', cursor: 'pointer' }}
                onClick={() => setStatusFilter('partially_available')}
              >
                Partielles: {kpis.partially_available}
              </IonBadge>
              <IonBadge
                color={statusFilter === 'available' ? 'primary' : 'success'}
                style={{ padding: '10px', justifyContent: 'center', cursor: 'pointer' }}
                onClick={() => setStatusFilter('available')}
              >
                Disponibles: {kpis.available}
              </IonBadge>
              <IonBadge
                color={statusFilter === 'expired' ? 'primary' : 'danger'}
                style={{ padding: '10px', justifyContent: 'center', cursor: 'pointer' }}
                onClick={() => setStatusFilter('expired')}
              >
                Expirees: {kpis.expired}
              </IonBadge>
            </div>

            {filteredPrescriptions.map((prescription) => (
              <IonCard key={prescription.id} className="surface-card" style={{ marginTop: '16px' }}>
                <IonCardHeader>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <IonCardTitle>Demande pour {prescription.patient_name}</IonCardTitle>
                    <IonButton
                      fill="clear"
                      size="small"
                      onClick={() => togglePrescription(prescription.id)}
                      style={{ margin: 0 }}
                      aria-label={expandedPrescriptions[prescription.id] ?? false ? 'Masquer' : 'Afficher'}
                    >
                      <IonIcon icon={(expandedPrescriptions[prescription.id] ?? false) ? chevronUpOutline : chevronDownOutline} />
                    </IonButton>
                  </div>
                  <IonBadge color="primary" style={{ width: 'fit-content', marginTop: '8px' }}>
                    {prescription.medicine_requests.length} medicament{prescription.medicine_requests.length > 1 ? 's' : ''}
                  </IonBadge>
                  <IonText color="medium" style={{ marginTop: '6px' }}>
                    Code ordonnance: {getPrescriptionCode(prescription)}
                  </IonText>
                  <div className="status-row" style={{ marginTop: '8px' }}>
                    <span>Statut:</span>
                    <IonBadge className={getPrescriptionStatusClassName(prescription.status)}>
                      {getPrescriptionStatusLabel(prescription.status)}
                    </IonBadge>
                    <IonText color="medium" style={{ marginLeft: '6px' }}>
                      {getStatusTimeDiffLabel(prescription.requested_at)}
                    </IonText>
                    {prescription.status === 'expired' ? (
                      <IonButton
                        size="small"
                        fill="outline"
                        color="warning"
                        onClick={() => handleReactivatePrescription(prescription.id).catch(() => undefined)}
                        disabled={reactivatingPrescriptionId === prescription.id}
                        style={{ marginLeft: 'auto' }}
                      >
                        {reactivatingPrescriptionId === prescription.id ? 'Reactivation...' : 'Reactiver'}
                      </IonButton>
                    ) : null}
                  </div>
                </IonCardHeader>
                <IonCardContent style={{ display: (expandedPrescriptions[prescription.id] ?? false) ? 'block' : 'none' }}>
                  <IonList>
                    {prescription.medicine_requests.map((med) => {
                      const key = `${prescription.id}-${med.id}-${pharmacy.id}`;
                      const latestResponse = responsesByKey[key];
                      const isActive = latestResponse ? new Date(latestResponse.expires_at).getTime() > Date.now() : false;

                      return (
                        <IonItem key={med.id} lines="full">
                          <IonLabel>
                            <strong>{med.name}</strong> {med.strength} {med.form}
                            <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                              Quantite: {med.quantity ?? 1}
                              {med.duration_days ? ` · Duree: ${med.duration_days}j` : ''}
                              {med.daily_dosage ? ` · ${med.daily_dosage}x/j` : ''}
                            </div>
                            {med.notes ? <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>Notes: {med.notes}</div> : null}
                            <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                              Generique autorise : {med.generic_allowed ? 'Oui' : 'Non'} · Conversion : {med.conversion_allowed ? 'Oui' : 'Non'}
                            </div>
                            {latestResponse ? (
                              <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                                Derniere reponse : {statusLabel(latestResponse.status)} · il y a {minutesAgo(latestResponse.responded_at)} min ·
                                {isActive ? ` expire dans ${minutesUntil(latestResponse.expires_at)} min` : ' expiree'}
                              </div>
                            ) : null}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                              {STATUS_ACTIONS.map((action) => (
                                <IonButton
                                  key={action.key}
                                  size="small"
                                  color={action.color}
                                  fill={latestResponse?.status === action.key ? 'solid' : 'outline'}
                                  disabled={!pharmacyHasGps}
                                  onClick={() =>
                                    handleRespond({
                                      prescription_id: prescription.id,
                                      medicine_request_id: med.id,
                                      status: action.key
                                    })
                                  }
                                >
                                  {action.label}
                                </IonButton>
                              ))}
                            </div>
                          </IonLabel>
                        </IonItem>
                      );
                    })}
                  </IonList>
                </IonCardContent>
              </IonCard>
            ))}
          </>
        ) : (
          <IonCard className="surface-card">
            <IonCardContent>
              <IonText color="danger">Aucune pharmacie liee a ce compte.</IonText>
            </IonCardContent>
          </IonCard>
        )}
      </IonContent>
    </IonPage>
  );
};

export default PharmacyPrescriptionsPage;

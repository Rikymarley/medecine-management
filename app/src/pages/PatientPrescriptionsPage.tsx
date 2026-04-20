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
  IonSkeletonText,
  IonText,
  IonTitle,
  IonToolbar,
  useIonRouter,
  useIonViewWillEnter
} from '@ionic/react';
import { medkitOutline } from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPrescription } from '../services/api';
import { useAuth } from '../state/AuthState';
import { getPrescriptionCode } from '../utils/prescriptionCode';
import { getPrescriptionStatusClassName, getPrescriptionStatusLabel } from '../utils/prescriptionStatus';
import { formatDateTime } from '../utils/time';

const PatientPrescriptionsPage: React.FC = () => {
  const LOAD_TTL_MS = 30_000;
  const ionRouter = useIonRouter();
  const { token, user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<ApiPrescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [doctorFilter, setDoctorFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const cacheKey = user ? `patient-prescriptions-${user.id}` : null;
  const lastLoadedAtRef = useRef(0);

  const loadPrescriptions = useCallback(async (force = false) => {
    if (!force && Date.now() - lastLoadedAtRef.current < LOAD_TTL_MS) {
      return;
    }
    if (!cacheKey) {
      return;
    }

    const cachedRaw = localStorage.getItem(cacheKey);
    if (cachedRaw) {
      try {
        const cachedData = JSON.parse(cachedRaw) as ApiPrescription[];
        if (Array.isArray(cachedData)) {
          setPrescriptions(cachedData);
          // Keep cached data for instant paint, then refresh from API to avoid stale statuses.
        }
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    if (!token) {
      return;
    }
    const data = await api.getPatientPrescriptions(token);
    setPrescriptions(data);
    localStorage.setItem(cacheKey, JSON.stringify(data));
    lastLoadedAtRef.current = Date.now();
  }, [LOAD_TTL_MS, cacheKey, token]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    loadPrescriptions(true)
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loadPrescriptions]);

  useIonViewWillEnter(() => {
    loadPrescriptions(false).catch(() => undefined);
  });

  const sortedPrescriptions = useMemo(() => {
    return [...prescriptions].sort(
      (a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()
    );
  }, [prescriptions]);
  const doctorNames = useMemo(
    () => Array.from(new Set(sortedPrescriptions.map((p) => p.doctor_name).filter(Boolean))).sort(),
    [sortedPrescriptions]
  );
  const filteredPrescriptions = useMemo(() => {
    if (doctorFilter === 'all') {
      return sortedPrescriptions;
    }
    return sortedPrescriptions.filter((p) => p.doctor_name === doctorFilter);
  }, [doctorFilter, sortedPrescriptions]);
  const totalPages = Math.max(1, Math.ceil(filteredPrescriptions.length / pageSize));
  const pagedPrescriptions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPrescriptions.slice(start, start + pageSize);
  }, [filteredPrescriptions, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [doctorFilter]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient" />
          </IonButtons>
          <IonTitle>Liste des ordonnances</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardContent>
            {sortedPrescriptions.length === 0 ? (
              isLoading ? (
                <IonList>
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <IonItem key={`rx-skeleton-${idx}`} lines="full">
                      <IonLabel>
                        <IonSkeletonText animated style={{ width: '45%', height: '14px' }} />
                        <IonSkeletonText animated style={{ width: '35%', height: '12px' }} />
                        <IonSkeletonText animated style={{ width: '55%', height: '12px' }} />
                      </IonLabel>
                    </IonItem>
                  ))}
                </IonList>
              ) : (
                <IonText color="medium">
                  <div className="empty-state-card">
                    <p style={{ margin: 0 }}>Aucune ordonnance pour le moment.</p>
                  </div>
                </IonText>
              )
            ) : (
              <>
                <div className="sticky-filter-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <IonButton
                    size="small"
                    fill={doctorFilter === 'all' ? 'solid' : 'outline'}
                    onClick={() => setDoctorFilter('all')}
                  >
                    Tous les docteurs
                  </IonButton>
                  {doctorNames.map((doctorName) => (
                    <IonButton
                      key={doctorName}
                      size="small"
                      fill={doctorFilter === doctorName ? 'solid' : 'outline'}
                      onClick={() => setDoctorFilter(doctorName)}
                    >
                      {doctorName}
                    </IonButton>
                  ))}
                </div>
                {filteredPrescriptions.length === 0 ? (
                  <IonText color="medium">
                    <div className="empty-state-card">
                      <p style={{ margin: 0 }}>Aucune ordonnance pour ce docteur.</p>
                    </div>
                  </IonText>
                ) : (
                  <IonList>
                    {pagedPrescriptions.map((prescription) => (
                      <IonItem
                        key={prescription.id}
                        lines="full"
                        button
                        detail
                        onClick={() => ionRouter.push(`/patient/prescriptions/${prescription.id}`, 'forward', 'push')}
                      >
                        <IonLabel>
                          <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <IonIcon icon={medkitOutline} color="success" />
                            <span>Dr. {prescription.doctor_name}</span>
                          </h3>
                          <p>Code ordonnance: {getPrescriptionCode(prescription)}</p>
                          <div className="status-row">
                            <span>Statut:</span>
                            <IonBadge className={getPrescriptionStatusClassName(prescription.status)}>
                              {getPrescriptionStatusLabel(prescription.status)}
                            </IonBadge>
                          </div>
                          <p>Demandee le {formatDateTime(prescription.requested_at)}</p>
                        </IonLabel>
                        <IonBadge slot="end" color="primary">
                          {prescription.medicine_requests.length}
                        </IonBadge>
                      </IonItem>
                    ))}
                  </IonList>
                )}
              </>
            )}
            {filteredPrescriptions.length > pageSize ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                <IonButton fill="outline" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                  Precedent
                </IonButton>
                <IonText color="medium">
                  Page {page} / {totalPages}
                </IonText>
                <IonButton fill="outline" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
                  Suivant
                </IonButton>
              </div>
            ) : null}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default PatientPrescriptionsPage;

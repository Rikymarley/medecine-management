import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonFab,
  IonFabButton,
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
import { addOutline } from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPrescription } from '../services/api';
import { useAuth } from '../state/AuthState';
import { getPrescriptionCode } from '../utils/prescriptionCode';
import { getPrescriptionStatusClassName, getPrescriptionStatusLabel } from '../utils/prescriptionStatus';
import { formatDateTime } from '../utils/time';

const DoctorPrescriptionsPage: React.FC = () => {
  const ionRouter = useIonRouter();
  const { token, user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<ApiPrescription[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const cacheKey = user ? `doctor-prescriptions-${user.id}` : null;

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
            // Continue to refresh from API so new family-member labels are not stuck in stale cache.
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

  const sortedPrescriptions = useMemo(() => {
    return [...prescriptions].sort(
      (a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()
    );
  }, [prescriptions]);
  const totalPages = Math.max(1, Math.ceil(sortedPrescriptions.length / pageSize));
  const pagedPrescriptions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedPrescriptions.slice(start, start + pageSize);
  }, [page, sortedPrescriptions]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/doctor" />
          </IonButtons>
          <IonTitle>Liste des ordonnances</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardContent>
            {sortedPrescriptions.length === 0 ? (
              <IonText color="medium">
                <p>Aucune ordonnance pour le moment.</p>
              </IonText>
            ) : (
              <IonList>
                {pagedPrescriptions.map((prescription) => (
                  <IonItem
                    key={prescription.id}
                    lines="full"
                    button
                    detail
                    onClick={() => ionRouter.push(`/doctor/prescriptions/${prescription.id}`, 'forward', 'push')}
                  >
                    <IonLabel>
                      <h3>{prescription.familyMember?.name || prescription.family_member?.name || prescription.patient_name}</h3>
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
            {sortedPrescriptions.length > pageSize ? (
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
        <IonFab vertical="bottom" horizontal="center" slot="fixed">
          <IonFabButton color="success" onClick={() => ionRouter.push('/doctor/create-prescription', 'forward', 'push')}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default DoctorPrescriptionsPage;

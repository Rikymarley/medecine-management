import {
  IonBackButton,
  IonBadge,
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
  IonToolbar
} from '@ionic/react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPrescription } from '../services/api';
import { useAuth } from '../state/AuthState';
import { getPrescriptionStatusClassName, getPrescriptionStatusLabel } from '../utils/prescriptionStatus';
import { formatDateTime } from '../utils/time';

const DoctorPrescriptionDetailPage: React.FC = () => {
  const { token, user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [prescription, setPrescription] = useState<ApiPrescription | null>(null);
  const cacheKey = user ? `doctor-prescriptions-${user.id}` : null;

  useEffect(() => {
    const load = async () => {
      if (!cacheKey) {
        return;
      }

      const targetId = Number(id);
      const cachedRaw = localStorage.getItem(cacheKey);
      if (cachedRaw) {
        try {
          const cachedData = JSON.parse(cachedRaw) as ApiPrescription[];
          if (Array.isArray(cachedData)) {
            const found = cachedData.find((p) => p.id === targetId) ?? null;
            if (found) {
              setPrescription(found);
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
      localStorage.setItem(cacheKey, JSON.stringify(data));
      setPrescription(data.find((p) => p.id === targetId) ?? null);
    };

    load().catch(() => undefined);
  }, [cacheKey, id, token]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/doctor/prescriptions" />
          </IonButtons>
          <IonTitle>Detail ordonnance</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        {!prescription ? (
          <IonText color="medium">
            <p>Ordonnance introuvable.</p>
          </IonText>
        ) : (
          <>
            <IonCard className="surface-card">
              <IonCardHeader>
                <IonCardTitle>{prescription.patient_name}</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <div className="status-row">
                  <span>Statut:</span>
                  <IonBadge className={getPrescriptionStatusClassName(prescription.status)}>
                    {getPrescriptionStatusLabel(prescription.status)}
                  </IonBadge>
                </div>
                <p>Demandee le {formatDateTime(prescription.requested_at)}</p>
              </IonCardContent>
            </IonCard>

            <IonCard className="surface-card">
              <IonCardHeader>
                <IonCardTitle>Medicaments</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonList>
                  {prescription.medicine_requests.map((med) => (
                    <IonItem key={med.id} lines="full">
                      <IonLabel>
                        <h3>{med.name}</h3>
                        <p>
                          {med.strength || 'Sans dosage'} · {med.form || 'Sans forme'}
                        </p>
                        <p>
                          Generique: {med.generic_allowed ? 'Oui' : 'Non'} · Conversion:{' '}
                          {med.conversion_allowed ? 'Oui' : 'Non'}
                        </p>
                      </IonLabel>
                    </IonItem>
                  ))}
                </IonList>
              </IonCardContent>
            </IonCard>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default DoctorPrescriptionDetailPage;

import {
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
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
  useIonViewWillEnter,
} from '@ionic/react';
import { medkitOutline, personOutline } from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import {
  api,
  type ApiDoctorSecretaryAccessRequest,
  type ApiSecretaryLookup,
} from '../services/api';
import { useAuth } from '../state/AuthState';

type RouteParams = {
  secretaryId: string;
};

const DoctorSecretaryDetailPage: React.FC = () => {
  const { token } = useAuth();
  const { secretaryId } = useParams<RouteParams>();
  const location = useLocation();
  const secretaryUserId = Number(secretaryId);

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const [secretary, setSecretary] = useState<ApiSecretaryLookup | null>(null);
  const [requests, setRequests] = useState<ApiDoctorSecretaryAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fallbackName = query.get('name') || 'Secretaire';
  const fallbackEmail = query.get('email');
  const fallbackPhone = query.get('phone');
  const fallbackWhatsapp = query.get('whatsapp');
  const linkedDoctors = useMemo(
    () =>
      requests
        .filter((row) => row.status === 'approved')
        .map((row) => ({
          id: row.doctor_id,
          name: row.doctor_name || 'Medecin non renseigne',
          specialty: row.doctor_specialty || 'Specialite non renseignee',
        }))
        .filter((row, index, self) => self.findIndex((candidate) => candidate.id === row.id) === index)
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })),
    [requests]
  );

  const load = useCallback(async () => {
    if (!token || Number.isNaN(secretaryUserId)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [directoryRows, requestRows] = await Promise.all([
        api.searchDoctorSecretaries(token),
        api.getDoctorSecretaryAccessRequests(token),
      ]);

      const found = directoryRows.find((row) => row.id === secretaryUserId) ?? null;
      setSecretary(found);
      setRequests(
        requestRows
          .filter((row) => row.secretary_id === secretaryUserId)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      );
    } catch {
      setSecretary(null);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [secretaryUserId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  useIonViewWillEnter(() => {
    void load();
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/doctor/secretaires" />
          </IonButtons>
          <IonTitle>Detail secretaire</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        {loading ? (
          <IonCard className="surface-card">
            <IonCardContent>
              <IonText color="medium">
                <p>Chargement...</p>
              </IonText>
            </IonCardContent>
          </IonCard>
        ) : (
          <>
            <IonCard className="surface-card">
              <IonCardHeader>
                <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IonIcon icon={personOutline} /> Profil secretaire
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent style={{ display: 'grid', gap: '10px' }}>
                <div style={{ border: '1px solid #dbe7ef', borderRadius: '12px', overflow: 'hidden' }}>
                  <IonList>
                    <IonItem lines="full">
                      <IonLabel>
                        <h3>Nom</h3>
                        <p>{secretary?.name || fallbackName}</p>
                      </IonLabel>
                    </IonItem>
                    <IonItem lines="full">
                      <IonLabel>
                        <h3>Email</h3>
                        <p>{secretary?.email || fallbackEmail || 'N/D'}</p>
                      </IonLabel>
                    </IonItem>
                    <IonItem lines="full">
                      <IonLabel>
                        <h3>Telephone</h3>
                        <p>{secretary?.phone || fallbackPhone || 'N/D'}</p>
                      </IonLabel>
                    </IonItem>
                    <IonItem lines="none">
                      <IonLabel>
                        <h3>WhatsApp</h3>
                        <p>{secretary?.whatsapp || fallbackWhatsapp || 'N/D'}</p>
                      </IonLabel>
                    </IonItem>
                  </IonList>
                </div>

              </IonCardContent>
            </IonCard>

            <IonCard className="surface-card">
              <IonCardHeader>
                <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IonIcon icon={medkitOutline} /> Medecins lies ({linkedDoctors.length})
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {linkedDoctors.length === 0 ? (
                  <IonText color="medium">
                    <p>Aucun medecin lie pour cette secretaire.</p>
                  </IonText>
                ) : (
                  <IonList>
                    {linkedDoctors.map((doctor) => (
                      <IonItem key={`doctor-${doctor.id}`} lines="full">
                        <IonLabel>
                          <h3>{doctor.name}</h3>
                          <p>{doctor.specialty}</p>
                        </IonLabel>
                      </IonItem>
                    ))}
                  </IonList>
                )}
              </IonCardContent>
            </IonCard>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default DoctorSecretaryDetailPage;

import {
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonBadge,
  IonText,
  IonTitle,
  IonToolbar,
  useIonRouter,
  useIonViewWillEnter
} from '@ionic/react';
import { medkitOutline } from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPrescription } from '../services/api';
import { useAuth } from '../state/AuthState';

const PatientDoctorsPage: React.FC = () => {
  const ionRouter = useIonRouter();
  const { token, user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<ApiPrescription[]>([]);
  const [query, setQuery] = useState('');
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const cacheKey = user ? `patient-prescriptions-${user.id}` : null;

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
          setLastUpdatedAt(localStorage.getItem(`${cacheKey}-updated-at`));
        }
      } catch {
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(`${cacheKey}-updated-at`);
      }
    }

    if (!token) {
      return;
    }
    try {
      const data = await api.getPatientPrescriptions(token);
      setPrescriptions(data);
      const updatedAt = new Date().toISOString();
      setLastUpdatedAt(updatedAt);
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(`${cacheKey}-updated-at`, updatedAt);
    } catch {
      // Keep local cache when network is unavailable.
    }
  }, [cacheKey, token]);

  useEffect(() => {
    loadPrescriptions().catch(() => undefined);
  }, [loadPrescriptions]);

  useIonViewWillEnter(() => {
    loadPrescriptions().catch(() => undefined);
  });

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

  const doctors = useMemo(() => {
    const rows = prescriptions
      .map((p) => ({
        name: p.doctor_name.trim(),
        specialty: p.doctor?.specialty ?? null,
        city: p.doctor?.city ?? null
      }))
      .filter((row) => row.name);

    const byName = new Map<string, { name: string; specialty: string | null; city: string | null }>();
    rows.forEach((row) => {
      if (!byName.has(row.name)) {
        byName.set(row.name, row);
      }
    });

    const q = query.trim().toLowerCase();
    return Array.from(byName.values())
      .filter((row) => {
        if (!q) return true;
        return (
          row.name.toLowerCase().includes(q) ||
          (row.specialty ?? '').toLowerCase().includes(q) ||
          (row.city ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
  }, [prescriptions, query]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient" />
          </IonButtons>
          <IonTitle>Liste des medecins</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardHeader>
            <IonCardTitle>Medecins (A-Z)</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <IonBadge color={isOnline ? 'success' : 'warning'}>{isOnline ? 'En ligne' : 'Hors ligne'}</IonBadge>
              {lastUpdatedAt ? (
                <IonText color="medium">
                  <small>Mise a jour: {new Date(lastUpdatedAt).toLocaleString('fr-FR')}</small>
                </IonText>
              ) : null}
            </div>
            <IonItem lines="none">
              <IonLabel position="stacked">Rechercher</IonLabel>
              <IonInput
                value={query}
                placeholder="Nom, specialite, ville..."
                onIonInput={(e) => setQuery(e.detail.value ?? '')}
              />
            </IonItem>
            {doctors.length === 0 ? (
              <IonText color="medium">
                <p>Aucun medecin pour le moment.</p>
              </IonText>
            ) : (
              <IonList>
                {doctors.map((doctor) => (
                  <IonItem
                    key={doctor.name}
                    lines="full"
                    button
                    detail
                    onClick={() =>
                      ionRouter.push(`/patient/doctors/${encodeURIComponent(doctor.name)}`, 'forward', 'push')
                    }
                  >
                    <IonIcon icon={medkitOutline} slot="start" color="success" />
                    <IonLabel>
                      <strong>{doctor.name}</strong>
                      <p>
                        {doctor.specialty || 'Specialite non renseignee'}
                        {doctor.city ? ` · ${doctor.city}` : ''}
                      </p>
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

export default PatientDoctorsPage;

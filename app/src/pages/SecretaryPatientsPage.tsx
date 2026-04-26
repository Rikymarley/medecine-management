import {
  IonBackButton,
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
  IonSkeletonText,
  IonText,
  IonTitle,
  IonToolbar,
  useIonRouter,
  useIonViewWillEnter,
} from '@ionic/react';
import { personOutline } from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, type ApiDoctorPatient } from '../services/api';
import { useAuth } from '../state/AuthState';

const SecretaryPatientsPage: React.FC = () => {
  const LOAD_TTL_MS = 30_000;
  const compactItemStyle = {
    '--background': 'transparent',
    '--border-color': '#d7e4ee',
    '--padding-start': '8px',
    '--padding-end': '8px',
    '--inner-padding-end': '0',
    height: '60px',
  } as const;
  const { token } = useAuth();
  const ionRouter = useIonRouter();
  const [patients, setPatients] = useState<ApiDoctorPatient[]>([]);
  const [query, setQuery] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const lastLoadedAtRef = useRef(0);

  const loadPatients = useCallback(async (force = false) => {
    if (!force && Date.now() - lastLoadedAtRef.current < LOAD_TTL_MS) {
      return;
    }
    if (!token) {
      setPatients([]);
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    const rows = await api.getSecretaryPatients(token).catch(() => []);
    setPatients(rows);
    lastLoadedAtRef.current = Date.now();
    setIsLoadingData(false);
  }, [LOAD_TTL_MS, token]);

  useEffect(() => {
    void loadPatients(true);
  }, [loadPatients]);

  useIonViewWillEnter(() => {
    void loadPatients(false);
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const searched = q
      ? patients.filter((patient) => `${patient.name} ${patient.phone ?? ''} ${patient.ninu ?? ''}`.toLowerCase().includes(q))
      : patients;
    return [...searched].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
  }, [patients, query]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/secretaire" />
          </IonButtons>
          <IonTitle>Patients</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardContent>
            <IonSearchbar
              value={query}
              placeholder="Rechercher un patient (nom, telephone, NINU)"
              onIonInput={(event) => setQuery(event.detail.value ?? '')}
            />
            {isLoadingData && filtered.length === 0 ? (
              <IonList>
                {Array.from({ length: 4 }).map((_, idx) => (
                  <IonItem key={`patient-skeleton-${idx}`} lines="full" style={compactItemStyle}>
                    <div
                      slot="start"
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background: '#e2e8f0',
                        marginBottom: '5px',
                      }}
                    />
                    <IonLabel>
                      <IonSkeletonText animated style={{ width: '55%', height: '14px' }} />
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            ) : filtered.length === 0 ? (
              <IonText color="medium">
                <p>Aucun patient trouve.</p>
              </IonText>
            ) : (
              <IonList>
                {filtered.map((patient) => (
                  <IonItem
                    key={patient.id}
                    lines="full"
                    button
                    detail
                    style={compactItemStyle}
                    onClick={() => ionRouter.push(`/secretaire/patients/${patient.id}`, 'forward', 'push')}
                  >
                    {patient.profile_photo_url ? (
                      <img
                        slot="start"
                        src={patient.profile_photo_url}
                        alt={patient.name}
                        style={{
                          width: '50px',
                          height: '50px',
                          objectFit: 'cover',
                          borderRadius: '50%',
                          border: '1px solid #dbe7ef',
                          marginBottom: '5px',
                        }}
                      />
                    ) : (
                      <div
                        slot="start"
                        style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          background: '#dbeafe',
                          color: '#1e40af',
                          marginBottom: '5px',
                        }}
                      >
                        <IonIcon icon={personOutline} />
                      </div>
                    )}
                    <IonLabel>
                      <h3>{patient.name}</h3>
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

export default SecretaryPatientsPage;

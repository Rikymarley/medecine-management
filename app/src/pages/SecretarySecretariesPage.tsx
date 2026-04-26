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
  IonText,
  IonTitle,
  IonToolbar,
  useIonRouter,
  useIonViewWillEnter,
} from '@ionic/react';
import { personOutline } from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, type ApiSecretaryLookup } from '../services/api';
import { useAuth } from '../state/AuthState';

const SecretarySecretariesPage: React.FC = () => {
  const LOAD_TTL_MS = 30_000;
  const { token } = useAuth();
  const ionRouter = useIonRouter();
  const [rows, setRows] = useState<ApiSecretaryLookup[]>([]);
  const [query, setQuery] = useState('');
  const lastLoadedAtRef = useRef(0);

  const loadRows = useCallback(async (force = false) => {
    if (!force && Date.now() - lastLoadedAtRef.current < LOAD_TTL_MS) {
      return;
    }
    if (!token) {
      setRows([]);
      return;
    }
    const data = await api.getSecretariesDirectoryForSecretary(token).catch(() => []);
    setRows(data);
    lastLoadedAtRef.current = Date.now();
  }, [LOAD_TTL_MS, token]);

  useEffect(() => {
    void loadRows(true);
  }, [loadRows]);

  useIonViewWillEnter(() => {
    void loadRows(false);
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? rows.filter((row) => `${row.name} ${row.email ?? ''} ${row.phone ?? ''}`.toLowerCase().includes(q))
      : rows;
    return [...base].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
  }, [query, rows]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/secretaire" />
          </IonButtons>
          <IonTitle>Annuaire secretaires</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardContent>
            <IonSearchbar
              value={query}
              placeholder="Rechercher une secretaire..."
              onIonInput={(event) => setQuery(event.detail.value ?? '')}
            />
            {filtered.length === 0 ? (
              <IonText color="medium">
                <p>Aucune secretaire trouvee.</p>
              </IonText>
            ) : (
              <IonList>
                {filtered.map((secretary) => (
                  <IonItem
                    key={secretary.id}
                    lines="full"
                    button
                    detail
                    onClick={() => ionRouter.push(`/secretaire/secretaires/${secretary.id}`, 'forward', 'push')}
                  >
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
                      <h3>{secretary.name}</h3>
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

export default SecretarySecretariesPage;

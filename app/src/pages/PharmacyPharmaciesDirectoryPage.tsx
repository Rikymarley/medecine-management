import {
  IonBackButton,
  IonBadge,
  IonButtons,
  IonButton,
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
  useIonViewWillEnter
} from '@ionic/react';
import { callOutline, locateOutline, logoWhatsapp, storefrontOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPharmacy } from '../services/api';
import { useAuth } from '../state/AuthState';

const PharmacyPharmaciesDirectoryPage: React.FC = () => {
  const { token, loading: authLoading } = useAuth();
  const ionRouter = useIonRouter();
  const [pharmacies, setPharmacies] = useState<ApiPharmacy[]>([]);
  const [query, setQuery] = useState('');

  const loadPharmacies = async () => {
    if (authLoading) {
      return;
    }
    if (!token) {
      await api.getPharmacies().then(setPharmacies).catch(() => undefined);
      return;
    }
    await api.getPharmaciesForPharmacy(token).then(setPharmacies).catch(() => undefined);
  };
  useEffect(() => {
    loadPharmacies().catch(() => undefined);
  }, [token, authLoading]);
  useIonViewWillEnter(() => {
    loadPharmacies().catch(() => undefined);
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q
      ? pharmacies.filter((pharmacy) =>
          `${pharmacy.name} ${pharmacy.address ?? ''}`
            .toLowerCase()
            .includes(q)
        )
      : pharmacies;

    return [...rows].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
  }, [pharmacies, query]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/pharmacy" />
          </IonButtons>
          <IonTitle>Annuaire pharmacies</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardContent>
            <IonSearchbar
              value={query}
              placeholder="Rechercher nom, adresse..."
              onIonInput={(event) => setQuery(event.detail.value ?? '')}
            />
            {filtered.length === 0 ? (
              <IonText color="medium">
                <p>Aucune pharmacie trouvee.</p>
              </IonText>
            ) : (
              <IonList>
                {filtered.map((pharmacy) => (
                  <IonItem key={pharmacy.id} lines="full">
                    {pharmacy.logo_url ? (
                      <img
                        src={pharmacy.logo_url}
                        alt={`Logo ${pharmacy.name}`}
                        style={{
                          width: '34px',
                          height: '34px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #dbe7ef',
                          marginRight: '10px'
                        }}
                      />
                    ) : (
                      <IonIcon icon={storefrontOutline} slot="start" color="primary" />
                    )}
                    <IonLabel>
                      <h3>{pharmacy.name}</h3>
                      <p>{pharmacy.address || 'Adresse non renseignee'}</p>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                        <IonBadge color={pharmacy.temporary_closed ? 'danger' : pharmacy.open_now ? 'success' : 'medium'}>
                          {pharmacy.temporary_closed ? 'Fermeture temporaire' : pharmacy.open_now ? 'Ouverte' : 'Fermee'}
                        </IonBadge>
                        {pharmacy.account_verification_status !== 'approved' ? (
                          <IonBadge color="warning">Compte en attente</IonBadge>
                        ) : null}
                        {!pharmacy.license_verified ? (
                          <IonBadge color="warning">Licence non verifiee</IonBadge>
                        ) : null}
                        {pharmacy.emergency_available ? <IonBadge color="warning">Urgence</IonBadge> : null}
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                        <a href={pharmacy.phone ? `tel:${pharmacy.phone}` : '#'} style={{ pointerEvents: pharmacy.phone ? 'auto' : 'none', opacity: pharmacy.phone ? 1 : 0.4 }}>
                          <IonIcon icon={callOutline} />
                        </a>
                        <a
                          href={pharmacy.phone ? `https://wa.me/${pharmacy.phone.replace(/\D/g, '')}` : '#'}
                          style={{ pointerEvents: pharmacy.phone ? 'auto' : 'none', opacity: pharmacy.phone ? 1 : 0.4 }}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <IonIcon icon={logoWhatsapp} />
                        </a>
                        <a
                          href={
                            pharmacy.latitude && pharmacy.longitude
                              ? `https://www.google.com/maps/search/?api=1&query=${pharmacy.latitude},${pharmacy.longitude}`
                              : '#'
                          }
                          style={{
                            pointerEvents: pharmacy.latitude && pharmacy.longitude ? 'auto' : 'none',
                            opacity: pharmacy.latitude && pharmacy.longitude ? 1 : 0.4
                          }}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <IonIcon icon={locateOutline} />
                        </a>
                      </div>
                    </IonLabel>
                    <IonButton
                      slot="end"
                      fill="clear"
                      onClick={() => ionRouter.push(`/pharmacy/pharmacies/${pharmacy.id}`, 'forward', 'push')}
                    >
                      Voir
                    </IonButton>
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

export default PharmacyPharmaciesDirectoryPage;

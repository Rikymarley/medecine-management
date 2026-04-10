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
import { chevronForwardOutline, storefrontOutline } from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPharmacy } from '../services/api';
import { useAuth } from '../state/AuthState';

const PharmacyPharmaciesDirectoryPage: React.FC = () => {
  const { token, loading: authLoading } = useAuth();
  const ionRouter = useIonRouter();
  const [pharmacies, setPharmacies] = useState<ApiPharmacy[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'open' | 'closed' | 'approved' | 'pending' | 'licensed' | 'unlicensed' | 'emergency'
  >('all');

  const loadPharmacies = useCallback(async () => {
    if (authLoading) {
      return;
    }
    if (!token) {
      await api.getPharmacies().then(setPharmacies).catch(() => undefined);
      return;
    }
    await api.getPharmaciesForPharmacy(token).then(setPharmacies).catch(() => undefined);
  }, [authLoading, token]);
  useEffect(() => {
    loadPharmacies().catch(() => undefined);
  }, [loadPharmacies]);
  useIonViewWillEnter(() => {
    loadPharmacies().catch(() => undefined);
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const searched = q
      ? pharmacies.filter((pharmacy) =>
          `${pharmacy.name} ${pharmacy.address ?? ''}`
            .toLowerCase()
            .includes(q)
        )
      : pharmacies;

    const rows = searched.filter((pharmacy) => {
      if (statusFilter === 'open') return !!pharmacy.open_now && !pharmacy.temporary_closed;
      if (statusFilter === 'closed') return !pharmacy.open_now || !!pharmacy.temporary_closed;
      if (statusFilter === 'approved') return pharmacy.account_verification_status === 'approved';
      if (statusFilter === 'pending') return pharmacy.account_verification_status !== 'approved';
      if (statusFilter === 'licensed') return !!pharmacy.license_verified;
      if (statusFilter === 'unlicensed') return !pharmacy.license_verified;
      if (statusFilter === 'emergency') return !!pharmacy.emergency_available;
      return true;
    });

    return [...rows].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
  }, [pharmacies, query, statusFilter]);

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
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 28px 8px 0' }}>
                <IonButton size="small" style={{ height: '30px', whiteSpace: 'nowrap' }} fill={statusFilter === 'all' ? 'solid' : 'outline'} onClick={() => setStatusFilter('all')}>Tous</IonButton>
                <IonButton size="small" style={{ height: '30px', whiteSpace: 'nowrap' }} fill={statusFilter === 'open' ? 'solid' : 'outline'} onClick={() => setStatusFilter('open')}>Ouverte</IonButton>
                <IonButton size="small" style={{ height: '30px', whiteSpace: 'nowrap' }} fill={statusFilter === 'closed' ? 'solid' : 'outline'} onClick={() => setStatusFilter('closed')}>Fermee</IonButton>
                <IonButton size="small" style={{ height: '30px', whiteSpace: 'nowrap' }} fill={statusFilter === 'approved' ? 'solid' : 'outline'} onClick={() => setStatusFilter('approved')}>Compte approuve</IonButton>
                <IonButton size="small" style={{ height: '30px', whiteSpace: 'nowrap' }} fill={statusFilter === 'pending' ? 'solid' : 'outline'} onClick={() => setStatusFilter('pending')}>Compte en attente</IonButton>
                <IonButton size="small" style={{ height: '30px', whiteSpace: 'nowrap' }} fill={statusFilter === 'licensed' ? 'solid' : 'outline'} onClick={() => setStatusFilter('licensed')}>Licence verifiee</IonButton>
                <IonButton size="small" style={{ height: '30px', whiteSpace: 'nowrap' }} fill={statusFilter === 'unlicensed' ? 'solid' : 'outline'} onClick={() => setStatusFilter('unlicensed')}>Licence non verifiee</IonButton>
                <IonButton size="small" style={{ height: '30px', whiteSpace: 'nowrap' }} fill={statusFilter === 'emergency' ? 'solid' : 'outline'} onClick={() => setStatusFilter('emergency')}>Urgence</IonButton>
              </div>
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 4,
                  bottom: 8,
                  width: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  background: 'linear-gradient(to right, rgba(255,255,255,0), var(--ion-background-color))',
                  pointerEvents: 'none'
                }}
              >
                <IonIcon icon={chevronForwardOutline} color="medium" style={{ fontSize: '22px' }} />
              </div>
            </div>
            {filtered.length === 0 ? (
              <IonText color="medium">
                <p>Aucune pharmacie trouvee.</p>
              </IonText>
            ) : (
              <IonList>
                {filtered.map((pharmacy) => (
                  <IonItem
                    key={pharmacy.id}
                    lines="full"
                    button
                    onClick={() => ionRouter.push(`/pharmacy/pharmacies/${pharmacy.id}`, 'forward', 'push')}
                  >
                    <IonLabel>
                      {pharmacy.logo_url ? (
                        <img
                          src={pharmacy.logo_url}
                          alt={`Logo ${pharmacy.name}`}
                          style={{
                            width: '34px',
                            height: '34px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid rgb(219, 231, 239)',
                            marginRight: '10px',
                            float: 'left'
                          }}
                        />
                      ) : (
                        <IonIcon icon={storefrontOutline} color="primary" style={{ marginRight: '10px', float: 'left', fontSize: '26px' }} />
                      )}
                      <h3>{pharmacy.name}</h3>
                      <p>{pharmacy.address || 'Adresse non renseignee'}</p>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                        <IonBadge color={pharmacy.temporary_closed ? 'danger' : pharmacy.open_now ? 'success' : 'medium'}>
                          {pharmacy.temporary_closed ? 'Fermeture temporaire' : pharmacy.open_now ? 'Ouverte' : 'Fermee'}
                        </IonBadge>
                        <IonBadge color={pharmacy.account_verification_status === 'approved' ? 'success' : 'warning'}>
                          {pharmacy.account_verification_status === 'approved' ? 'Compte Approuve' : 'Compte en attente'}
                        </IonBadge>
                        <IonBadge color={pharmacy.license_verified ? 'success' : 'warning'}>
                          {pharmacy.license_verified ? 'Licence Verifiee' : 'Licence non verifiee'}
                        </IonBadge>
                        {pharmacy.emergency_available ? <IonBadge color="warning">Urgence</IonBadge> : null}
                      </div>
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

export default PharmacyPharmaciesDirectoryPage;

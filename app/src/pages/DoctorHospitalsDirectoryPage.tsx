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
import { businessOutline, chevronForwardOutline } from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPharmacy } from '../services/api';

const DoctorHospitalsDirectoryPage: React.FC = () => {
  const ionRouter = useIonRouter();
  const [hospitals, setHospitals] = useState<ApiPharmacy[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed' | 'approved' | 'pending' | 'licensed' | 'unlicensed' | 'emergency'>('all');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      setToken(localStorage.getItem('token'));
    } catch {
      setToken(null);
    }
  }, []);

  const loadHospitals = useCallback(async () => {
    if (!token) {
      await api.getPharmacies().then(setHospitals).catch(() => undefined);
      return;
    }
    await api.getPharmaciesForDoctor(token).then(setHospitals).catch(() => undefined);
  }, [token]);

  useEffect(() => {
    loadHospitals().catch(() => undefined);
  }, [loadHospitals]);

  useIonViewWillEnter(() => {
    loadHospitals().catch(() => undefined);
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const searched = q
      ? hospitals.filter((hospital) => `${hospital.name} ${hospital.address ?? ''}`.toLowerCase().includes(q))
      : hospitals;

    const rows = searched.filter((hospital) => {
      if (statusFilter === 'open') return !!hospital.open_now && !hospital.temporary_closed;
      if (statusFilter === 'closed') return !hospital.open_now || !!hospital.temporary_closed;
      if (statusFilter === 'approved') return hospital.account_verification_status === 'approved';
      if (statusFilter === 'pending') return hospital.account_verification_status !== 'approved';
      if (statusFilter === 'licensed') return !!hospital.license_verified;
      if (statusFilter === 'unlicensed') return !hospital.license_verified;
      if (statusFilter === 'emergency') return !!hospital.emergency_available;
      return true;
    });

    return [...rows].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
  }, [hospitals, query, statusFilter]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/doctor" />
          </IonButtons>
          <IonTitle>Annuaire hopitaux</IonTitle>
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
                <IonButton size="small" style={{ height: '30px', whiteSpace: 'nowrap' }} fill={statusFilter === 'open' ? 'solid' : 'outline'} onClick={() => setStatusFilter('open')}>Ouvert</IonButton>
                <IonButton size="small" style={{ height: '30px', whiteSpace: 'nowrap' }} fill={statusFilter === 'closed' ? 'solid' : 'outline'} onClick={() => setStatusFilter('closed')}>Ferme</IonButton>
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
                <p>Aucun hopital trouve.</p>
              </IonText>
            ) : (
              <IonList>
                {filtered.map((hospital) => (
                  <IonItem
                    key={hospital.id}
                    lines="full"
                    button
                    onClick={() => ionRouter.push(`/doctor/pharmacies/${hospital.id}`, 'forward', 'push')}
                  >
                    <IonLabel>
                      {hospital.logo_url ? (
                        <img
                          src={hospital.logo_url}
                          alt={`Logo ${hospital.name}`}
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
                        <IonIcon icon={businessOutline} color="primary" style={{ marginRight: '10px', float: 'left', fontSize: '26px' }} />
                      )}
                      <h3>{hospital.name}</h3>
                      <p>{hospital.address || 'Adresse non renseignee'}</p>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                        <IonBadge color={hospital.temporary_closed ? 'danger' : hospital.open_now ? 'success' : 'medium'}>
                          {hospital.temporary_closed ? 'Fermeture temporaire' : hospital.open_now ? 'Ouvert' : 'Ferme'}
                        </IonBadge>
                        <IonBadge color={hospital.account_verification_status === 'approved' ? 'success' : 'warning'}>
                          {hospital.account_verification_status === 'approved' ? 'Compte approuve' : 'Compte en attente'}
                        </IonBadge>
                        <IonBadge color={hospital.license_verified ? 'success' : 'warning'}>
                          {hospital.license_verified ? 'Licence verifiee' : 'Licence non verifiee'}
                        </IonBadge>
                        {hospital.emergency_available ? <IonBadge color="warning">Urgence</IonBadge> : null}
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

export default DoctorHospitalsDirectoryPage;

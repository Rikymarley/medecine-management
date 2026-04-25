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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPharmacy } from '../services/api';
import { useAuth } from '../state/AuthState';
import { isFacilityOpenNow } from '../utils/businessHours';

const DoctorHospitalsDirectoryPage: React.FC = () => {
  const LOAD_TTL_MS = 30_000;
  const ionRouter = useIonRouter();
  const { token, user } = useAuth();
  const [hospitals, setHospitals] = useState<ApiPharmacy[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed' | 'approved' | 'pending' | 'licensed' | 'unlicensed' | 'emergency'>('all');
  const lastLoadedAtRef = useRef(0);
  const canManageAccountVerification = !!user?.can_verify_accounts;

  useEffect(() => {
    if (
      !canManageAccountVerification &&
      (statusFilter === 'approved' || statusFilter === 'pending' || statusFilter === 'licensed' || statusFilter === 'unlicensed')
    ) {
      setStatusFilter('all');
    }
  }, [canManageAccountVerification, statusFilter]);

  const loadHospitals = useCallback(async (force = false) => {
    if (!force && Date.now() - lastLoadedAtRef.current < LOAD_TTL_MS) {
      return;
    }
    if (!token) {
      await api.getHospitals().then(setHospitals).catch(() => undefined);
      lastLoadedAtRef.current = Date.now();
      return;
    }
    await api.getHospitalsForDoctor(token).then(setHospitals).catch(() => undefined);
    lastLoadedAtRef.current = Date.now();
  }, [LOAD_TTL_MS, token]);

  useEffect(() => {
    loadHospitals(true).catch(() => undefined);
  }, [loadHospitals]);

  useIonViewWillEnter(() => {
    loadHospitals(false).catch(() => undefined);
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const searched = q
      ? hospitals.filter((hospital) => `${hospital.name} ${hospital.address ?? ''}`.toLowerCase().includes(q))
      : hospitals;

    const rows = searched.filter((hospital) => {
      if (statusFilter === 'open') return isFacilityOpenNow(hospital);
      if (statusFilter === 'closed') return !isFacilityOpenNow(hospital);
      if (statusFilter === 'approved' && canManageAccountVerification) return hospital.account_verification_status === 'approved';
      if (statusFilter === 'pending' && canManageAccountVerification) return hospital.account_verification_status !== 'approved';
      if (statusFilter === 'licensed' && canManageAccountVerification) return !!hospital.license_verified;
      if (statusFilter === 'unlicensed' && canManageAccountVerification) return !hospital.license_verified;
      if (statusFilter === 'emergency') return !!hospital.emergency_available;
      return true;
    });

    return [...rows].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
  }, [canManageAccountVerification, hospitals, query, statusFilter]);

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
                {canManageAccountVerification ? (
                  <>
                    <IonButton size="small" style={{ height: '30px', whiteSpace: 'nowrap' }} fill={statusFilter === 'approved' ? 'solid' : 'outline'} onClick={() => setStatusFilter('approved')}>Compte approuve</IonButton>
                    <IonButton size="small" style={{ height: '30px', whiteSpace: 'nowrap' }} fill={statusFilter === 'pending' ? 'solid' : 'outline'} onClick={() => setStatusFilter('pending')}>Compte en attente</IonButton>
                    <IonButton size="small" style={{ height: '30px', whiteSpace: 'nowrap' }} fill={statusFilter === 'licensed' ? 'solid' : 'outline'} onClick={() => setStatusFilter('licensed')}>Licence verifiee</IonButton>
                    <IonButton size="small" style={{ height: '30px', whiteSpace: 'nowrap' }} fill={statusFilter === 'unlicensed' ? 'solid' : 'outline'} onClick={() => setStatusFilter('unlicensed')}>Licence non verifiee</IonButton>
                  </>
                ) : null}
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
                    onClick={() => ionRouter.push(`/doctor/hopitaux/${hospital.id}`, 'forward', 'push')}
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
                        <IonBadge color={hospital.temporary_closed ? 'danger' : isFacilityOpenNow(hospital) ? 'success' : 'medium'}>
                          {hospital.temporary_closed ? 'Fermeture temporaire' : isFacilityOpenNow(hospital) ? 'Ouvert' : 'Ferme'}
                        </IonBadge>
                        {canManageAccountVerification ? (
                          <>
                            <IonBadge color={hospital.account_verification_status === 'approved' ? 'success' : 'warning'}>
                              {hospital.account_verification_status === 'approved' ? 'Compte approuve' : 'Compte en attente'}
                            </IonBadge>
                            <IonBadge color={hospital.license_verified ? 'success' : 'warning'}>
                              {hospital.license_verified ? 'Licence verifiee' : 'Licence non verifiee'}
                            </IonBadge>
                          </>
                        ) : null}
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

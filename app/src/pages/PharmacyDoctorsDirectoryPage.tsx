import {
  IonBackButton,
  IonBadge,
  IonButton,
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
  useIonViewWillEnter
} from '@ionic/react';
import { chevronForwardOutline, medkitOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiDoctorDirectory } from '../services/api';
import { useAuth } from '../state/AuthState';

const PharmacyDoctorsDirectoryPage: React.FC = () => {
  const { token } = useAuth();
  const ionRouter = useIonRouter();
  const [doctors, setDoctors] = useState<ApiDoctorDirectory[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'licensed' | 'unlicensed' | 'tele'>('all');

  const loadDoctors = async () => {
    if (!token) {
      await api.getDoctorsDirectory().then(setDoctors).catch(() => undefined);
      return;
    }
    await api.getDoctorsDirectoryForPharmacy(token).then(setDoctors).catch(() => undefined);
  };

  useEffect(() => {
    loadDoctors().catch(() => undefined);
  }, [token]);

  useIonViewWillEnter(() => {
    loadDoctors().catch(() => undefined);
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const searched = q
      ? doctors.filter((doctor) =>
          `${doctor.name} ${doctor.specialty ?? ''} ${doctor.city ?? ''} ${doctor.department ?? ''}`
            .toLowerCase()
            .includes(q)
        )
      : doctors;

    const rows = searched.filter((doctor) => {
      if (statusFilter === 'approved') return doctor.account_verification_status === 'approved';
      if (statusFilter === 'pending') return doctor.account_verification_status !== 'approved';
      if (statusFilter === 'licensed') return !!doctor.license_verified;
      if (statusFilter === 'unlicensed') return !doctor.license_verified;
      if (statusFilter === 'tele') return !!doctor.teleconsultation_available;
      return true;
    });

    return [...rows].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
  }, [doctors, query, statusFilter]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/pharmacy" />
          </IonButtons>
          <IonTitle>Annuaire medecins</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardContent>
            <IonSearchbar
              value={query}
              placeholder="Rechercher nom, specialite, ville..."
              onIonInput={(event) => setQuery(event.detail.value ?? '')}
            />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 28px 8px 0' }}>
                <IonButton size="small" style={{ height: '30px', whiteSpace: 'nowrap' }} fill={statusFilter === 'all' ? 'solid' : 'outline'} onClick={() => setStatusFilter('all')}>Tous</IonButton>
                <IonButton size="small" style={{ height: '30px', whiteSpace: 'nowrap' }} fill={statusFilter === 'approved' ? 'solid' : 'outline'} onClick={() => setStatusFilter('approved')}>Compte approuve</IonButton>
                <IonButton size="small" style={{ height: '30px', whiteSpace: 'nowrap' }} fill={statusFilter === 'pending' ? 'solid' : 'outline'} onClick={() => setStatusFilter('pending')}>Compte en attente</IonButton>
                <IonButton size="small" style={{ height: '30px', whiteSpace: 'nowrap' }} fill={statusFilter === 'licensed' ? 'solid' : 'outline'} onClick={() => setStatusFilter('licensed')}>Licence verifiee</IonButton>
                <IonButton size="small" style={{ height: '30px', whiteSpace: 'nowrap' }} fill={statusFilter === 'unlicensed' ? 'solid' : 'outline'} onClick={() => setStatusFilter('unlicensed')}>Licence non verifiee</IonButton>
                <IonButton size="small" style={{ height: '30px', whiteSpace: 'nowrap' }} fill={statusFilter === 'tele' ? 'solid' : 'outline'} onClick={() => setStatusFilter('tele')}>Teleconsultation</IonButton>
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
                <p>Aucun medecin trouve.</p>
              </IonText>
            ) : (
              <IonList>
                {filtered.map((doctor) => (
                  <IonItem
                    key={doctor.id}
                    lines="full"
                    button
                    onClick={() => ionRouter.push(`/pharmacy/doctors/${doctor.id}`, 'forward', 'push')}
                  >
                    <IonLabel>
                      <IonIcon icon={medkitOutline} color="success" style={{ marginRight: '10px', float: 'left', fontSize: '26px' }} />
                      <h3>{doctor.name}</h3>
                      <p>
                        {doctor.specialty || 'Specialite non renseignee'}
                        {doctor.city ? ` · ${doctor.city}` : ''}
                        {doctor.department ? ` (${doctor.department})` : ''}
                      </p>
                      <p>{doctor.address || 'Adresse non renseignee'}</p>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                        <IonBadge color={doctor.account_verification_status === 'approved' ? 'success' : 'warning'}>
                          {doctor.account_verification_status === 'approved' ? 'Compte approuve' : 'Compte en attente'}
                        </IonBadge>
                        <IonBadge color={doctor.license_verified ? 'success' : 'warning'}>
                          {doctor.license_verified ? 'Licence verifiee' : 'Licence non verifiee'}
                        </IonBadge>
                        {doctor.teleconsultation_available ? <IonBadge color="tertiary">Teleconsultation</IonBadge> : null}
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

export default PharmacyDoctorsDirectoryPage;

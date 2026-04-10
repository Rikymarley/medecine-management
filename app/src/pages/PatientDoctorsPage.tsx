import {
  IonBackButton,
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
  IonBadge,
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

const PatientDoctorsPage: React.FC = () => {
  const ionRouter = useIonRouter();
  const { token } = useAuth();
  const [directoryDoctors, setDirectoryDoctors] = useState<ApiDoctorDirectory[]>([]);
  const [myDoctorNames, setMyDoctorNames] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'mine' | 'all' | 'licensed' | 'unlicensed' | 'tele'>('mine');

  useEffect(() => {
    const loadDoctors = async () => {
      if (!token) {
        await api.getDoctorsDirectory().then(setDirectoryDoctors).catch(() => setDirectoryDoctors([]));
        return;
      }
      await api.getDoctorsDirectory().then(setDirectoryDoctors).catch(() => setDirectoryDoctors([]));
      const prescriptions = await api.getPatientPrescriptions(token).catch(() => []);
      const names = new Set(
        prescriptions
          .map((p) => p.doctor_name?.trim().toLowerCase())
          .filter((name): name is string => !!name)
      );
      setMyDoctorNames(names);
    };
    loadDoctors().catch(() => undefined);
  }, [token]);

  useIonViewWillEnter(() => {
    api.getDoctorsDirectory().then(setDirectoryDoctors).catch(() => setDirectoryDoctors([]));
    if (token) {
      api.getPatientPrescriptions(token)
        .then((prescriptions) => {
          const names = new Set(
            prescriptions
              .map((p) => p.doctor_name?.trim().toLowerCase())
              .filter((name): name is string => !!name)
          );
          setMyDoctorNames(names);
        })
        .catch(() => undefined);
    }
  });

  const doctors = useMemo(() => {
    const q = query.trim().toLowerCase();
    const searched = directoryDoctors
      .filter((row) => {
        if (!q) return true;
        return (
          row.name.toLowerCase().includes(q) ||
          (row.specialty ?? '').toLowerCase().includes(q) ||
          (row.city ?? '').toLowerCase().includes(q)
        );
      });

    const rows = searched.filter((doctor) => {
      if (statusFilter === 'mine') return myDoctorNames.has(doctor.name.trim().toLowerCase());
      if (statusFilter === 'licensed') return !!doctor.license_verified;
      if (statusFilter === 'unlicensed') return !doctor.license_verified;
      if (statusFilter === 'tele') return !!doctor.teleconsultation_available;
      return true;
    });

    return rows
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
  }, [directoryDoctors, myDoctorNames, query, statusFilter]);

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
          <IonCardContent>
            <IonSearchbar
              value={query}
              placeholder="Rechercher nom, specialite, ville..."
              onIonInput={(event) => setQuery(event.detail.value ?? '')}
            />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 28px 8px 0' }}>
                <IonButton style={{ whiteSpace: 'nowrap' }} size="small" fill={statusFilter === 'mine' ? 'solid' : 'outline'} onClick={() => setStatusFilter('mine')}>Mes medecins</IonButton>
                <IonButton style={{ whiteSpace: 'nowrap' }} size="small" fill={statusFilter === 'all' ? 'solid' : 'outline'} onClick={() => setStatusFilter('all')}>Tous</IonButton>
                <IonButton style={{ whiteSpace: 'nowrap' }} size="small" fill={statusFilter === 'licensed' ? 'solid' : 'outline'} onClick={() => setStatusFilter('licensed')}>Licence verifiee</IonButton>
                <IonButton style={{ whiteSpace: 'nowrap' }} size="small" fill={statusFilter === 'unlicensed' ? 'solid' : 'outline'} onClick={() => setStatusFilter('unlicensed')}>Licence non verifiee</IonButton>
                <IonButton style={{ whiteSpace: 'nowrap' }} size="small" fill={statusFilter === 'tele' ? 'solid' : 'outline'} onClick={() => setStatusFilter('tele')}>Teleconsultation</IonButton>
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
            {doctors.length === 0 ? (
              <IonText color="medium">
                <p>Aucun medecin pour le moment.</p>
              </IonText>
            ) : (
              <IonList>
                {doctors.map((doctor) => {
                  const isMyDoctor = myDoctorNames.has(doctor.name.trim().toLowerCase());
                  return (
                  <IonItem
                    key={doctor.id}
                    lines="full"
                    button
                    detail
                    onClick={() =>
                      ionRouter.push(`/patient/doctors/${encodeURIComponent(doctor.name)}`, 'forward', 'push')
                    }
                  >
                    {doctor.profile_photo_url ? (
                      <img
                        slot="start"
                        src={doctor.profile_photo_url}
                        alt={`Photo Dr. ${doctor.name}`}
                        style={{
                          width: '34px',
                          height: '34px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid rgb(219, 231, 239)'
                        }}
                      />
                    ) : (
                      <IonIcon icon={medkitOutline} slot="start" color="success" />
                    )}
                    <IonLabel>
                      <strong>{doctor.name}</strong>
                      <p>
                        {doctor.specialty || 'Specialite non renseignee'}
                        {doctor.city ? ` · ${doctor.city}` : ''}
                      </p>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                        {isMyDoctor ? <IonBadge color="success">Mon medecin</IonBadge> : null}
                        <IonBadge color={doctor.license_verified ? 'success' : 'warning'}>
                          {doctor.license_verified ? 'Licence verifiee' : 'Licence non verifiee'}
                        </IonBadge>
                        {doctor.teleconsultation_available ? <IonBadge color="tertiary">Teleconsultation</IonBadge> : null}
                      </div>
                    </IonLabel>
                  </IonItem>
                  );
                })}
              </IonList>
            )}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default PatientDoctorsPage;

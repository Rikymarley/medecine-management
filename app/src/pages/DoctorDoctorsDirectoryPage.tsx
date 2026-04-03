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
  useIonRouter
} from '@ionic/react';
import { callOutline, locateOutline, logoWhatsapp, medkitOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiDoctorDirectory } from '../services/api';

const DoctorDoctorsDirectoryPage: React.FC = () => {
  const ionRouter = useIonRouter();
  const [doctors, setDoctors] = useState<ApiDoctorDirectory[]>([]);
  const [query, setQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<{ id: number; can_verify_accounts?: boolean } | null>(null);
  const [updatingDoctorId, setUpdatingDoctorId] = useState<number | null>(null);
  const [updatingAccountDoctorId, setUpdatingAccountDoctorId] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      setCurrentUser(raw ? JSON.parse(raw) : null);
      setToken(localStorage.getItem('token'));
    } catch {
      setCurrentUser(null);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      api.getDoctorsDirectory().then(setDoctors).catch(() => undefined);
      return;
    }
    api.getDoctorsDirectoryForDoctor(token).then(setDoctors).catch(() => undefined);
  }, [token]);

  const canVerify = !!currentUser?.can_verify_accounts;

  const verifyDoctor = async (doctorId: number) => {
    if (!token) {
      return;
    }

    try {
      setUpdatingDoctorId(doctorId);
      const updated = await api.verifyDoctorLicense(token, doctorId, { verified: true });
      setDoctors((prev) => prev.map((doctor) => (doctor.id === doctorId ? { ...doctor, ...updated } : doctor)));
    } catch (error) {
      console.error(error);
    } finally {
      setUpdatingDoctorId(null);
    }
  };

  const unverifyDoctor = async (doctorId: number) => {
    if (!token) {
      return;
    }

    try {
      setUpdatingDoctorId(doctorId);
      const updated = await api.verifyDoctorLicense(token, doctorId, { verified: false });
      setDoctors((prev) => prev.map((doctor) => (doctor.id === doctorId ? { ...doctor, ...updated } : doctor)));
    } catch (error) {
      console.error(error);
    } finally {
      setUpdatingDoctorId(null);
    }
  };

  const approveDoctorAccount = async (doctor: ApiDoctorDirectory) => {
    if (!token) {
      return;
    }

    try {
      setUpdatingAccountDoctorId(doctor.id);
      await api.approveDoctorAccount(token, doctor.id);
      const refreshed = await api.getDoctorsDirectoryForDoctor(token);
      setDoctors(refreshed);
    } catch (error) {
      console.error(error);
    } finally {
      setUpdatingAccountDoctorId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q
      ? doctors.filter((doctor) =>
          `${doctor.name} ${doctor.specialty ?? ''} ${doctor.city ?? ''} ${doctor.department ?? ''}`
            .toLowerCase()
            .includes(q)
        )
      : doctors;

    return [...rows].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
  }, [doctors, query]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/doctor" />
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
            {filtered.length === 0 ? (
              <IonText color="medium">
                <p>Aucun medecin trouve.</p>
              </IonText>
            ) : (
              <IonList>
                {filtered.map((doctor) => (
                  <IonItem key={doctor.id} lines="full">
                    <IonIcon icon={medkitOutline} slot="start" color="success" />
                    <IonLabel>
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
                        {doctor.license_verified && doctor.license_verified_by_doctor_name ? (
                          <IonBadge color="light">Verifiee par {doctor.license_verified_by_doctor_name}</IonBadge>
                        ) : null}
                        {doctor.teleconsultation_available ? <IonBadge color="tertiary">Teleconsultation</IonBadge> : null}
                      </div>
                      {doctor.account_verification_status === 'approved' && doctor.account_verified_by_name ? (
                        <p>Approuve par {doctor.account_verified_by_name}</p>
                      ) : null}
                      {doctor.account_verification_status !== 'approved' && canVerify && doctor.id !== currentUser?.id ? (
                        <div style={{ marginTop: '8px' }}>
                          <IonButton
                            size="small"
                            color="tertiary"
                            fill="outline"
                            disabled={updatingAccountDoctorId === doctor.id}
                            onClick={() => approveDoctorAccount(doctor)}
                          >
                            Approuver le compte
                          </IonButton>
                        </div>
                      ) : null}
                      {!doctor.license_verified && canVerify && doctor.id !== currentUser?.id ? (
                        <div style={{ marginTop: '8px' }}>
                          <IonButton
                            size="small"
                            color="success"
                            fill="outline"
                            disabled={updatingDoctorId === doctor.id}
                            onClick={() => verifyDoctor(doctor.id)}
                          >
                            Verifier la licence
                          </IonButton>
                        </div>
                      ) : null}
                      {doctor.license_verified && canVerify && doctor.id !== currentUser?.id ? (
                        <div style={{ marginTop: '8px' }}>
                          <IonButton
                            size="small"
                            color="warning"
                            fill="outline"
                            disabled={updatingDoctorId === doctor.id}
                            onClick={() => unverifyDoctor(doctor.id)}
                          >
                            Retirer verification licence
                          </IonButton>
                        </div>
                      ) : null}
                      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                        <a href={doctor.phone ? `tel:${doctor.phone}` : '#'} style={{ pointerEvents: doctor.phone ? 'auto' : 'none', opacity: doctor.phone ? 1 : 0.4 }}>
                          <IonIcon icon={callOutline} />
                        </a>
                        <a
                          href={doctor.whatsapp ? `https://wa.me/${doctor.whatsapp.replace(/\D/g, '')}` : '#'}
                          style={{ pointerEvents: doctor.whatsapp ? 'auto' : 'none', opacity: doctor.whatsapp ? 1 : 0.4 }}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <IonIcon icon={logoWhatsapp} />
                        </a>
                        <a
                          href={
                            doctor.latitude && doctor.longitude
                              ? `https://www.google.com/maps/search/?api=1&query=${doctor.latitude},${doctor.longitude}`
                              : '#'
                          }
                          style={{
                            pointerEvents: doctor.latitude && doctor.longitude ? 'auto' : 'none',
                            opacity: doctor.latitude && doctor.longitude ? 1 : 0.4
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
                      onClick={() => ionRouter.push(`/doctor/doctors/${doctor.id}`, 'forward', 'push')}
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

export default DoctorDoctorsDirectoryPage;

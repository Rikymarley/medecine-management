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
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { callOutline, locateOutline, logoWhatsapp, medkitOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api, ApiDoctorDirectory } from '../services/api';

type RouteParams = {
  doctorId: string;
};

const DoctorDoctorDetailPage: React.FC = () => {
  const { doctorId } = useParams<RouteParams>();
  const [doctor, setDoctor] = useState<ApiDoctorDirectory | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: number; can_verify_accounts?: boolean } | null>(null);

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
    let active = true;
    setLoading(true);

    const loader = token ? api.getDoctorsDirectoryForDoctor(token) : api.getDoctorsDirectory();

    loader
      .then((rows) => {
        if (!active) {
          return;
        }
        const found = rows.find((row) => row.id === Number(doctorId)) ?? null;
        setDoctor(found);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setDoctor(null);
      })
      .finally(() => {
        if (!active) {
          return;
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [doctorId, token]);

  const canVerify = useMemo(() => {
    if (!doctor || !currentUser) {
      return false;
    }
    return !!currentUser.can_verify_accounts && currentUser.id !== doctor.id && !doctor.license_verified;
  }, [currentUser, doctor]);

  const verifyDoctor = async () => {
    if (!token || !doctor) {
      return;
    }

    try {
      setUpdating(true);
      const updated = await api.verifyDoctorLicense(token, doctor.id, { verified: true });
      setDoctor(updated);
    } catch (error) {
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const unverifyDoctor = async () => {
    if (!token || !doctor) {
      return;
    }
    try {
      setUpdating(true);
      const updated = await api.verifyDoctorLicense(token, doctor.id, { verified: false });
      setDoctor(updated);
    } catch (error) {
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const approveDoctor = async () => {
    if (!token || !doctor) {
      return;
    }
    try {
      setApproving(true);
      await api.approveDoctorAccount(token, doctor.id);
      const rows = await api.getDoctorsDirectoryForDoctor(token);
      const refreshed = rows.find((row) => row.id === doctor.id) ?? doctor;
      setDoctor(refreshed);
    } catch (error) {
      console.error(error);
    } finally {
      setApproving(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/doctor/doctors" />
          </IonButtons>
          <IonTitle>Detail medecin</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardContent>
            {loading ? (
              <IonText color="medium">
                <p>Chargement...</p>
              </IonText>
            ) : !doctor ? (
              <IonText color="danger">
                <p>Medecin introuvable.</p>
              </IonText>
            ) : (
              <>
                <IonItem lines="none">
                  <IonIcon icon={medkitOutline} slot="start" color="success" />
                  <IonLabel>
                    <h2>{doctor.name}</h2>
                    <p>{doctor.specialty || 'Specialite non renseignee'}</p>
                  </IonLabel>
                </IonItem>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '8px 0 12px' }}>
                  <IonBadge color={doctor.account_verification_status === 'approved' ? 'success' : 'warning'}>
                    {doctor.account_verification_status === 'approved' ? 'Compte approuve' : 'Compte en attente'}
                  </IonBadge>
                  <IonBadge color={doctor.license_verified ? 'success' : 'warning'}>
                    {doctor.license_verified ? 'Licence verifiee' : 'Licence non verifiee'}
                  </IonBadge>
                  {doctor.account_verification_status === 'approved' && doctor.account_verified_by_name ? (
                    <IonBadge color="light">Approuve par {doctor.account_verified_by_name}</IonBadge>
                  ) : null}
                  {doctor.license_verified && doctor.license_verified_by_doctor_name ? (
                    <IonBadge color="light">Verifiee par {doctor.license_verified_by_doctor_name}</IonBadge>
                  ) : null}
                  {doctor.teleconsultation_available ? <IonBadge color="tertiary">Teleconsultation</IonBadge> : null}
                </div>

                {doctor.account_verification_status !== 'approved' && !!currentUser?.can_verify_accounts && currentUser.id !== doctor.id ? (
                  <IonButton size="small" color="tertiary" fill="outline" disabled={approving} onClick={approveDoctor}>
                    Approuver le compte
                  </IonButton>
                ) : null}
                {canVerify ? (
                  <IonButton size="small" color="success" fill="outline" disabled={updating} onClick={verifyDoctor}>
                    Verifier la licence
                  </IonButton>
                ) : null}
                {!!currentUser?.can_verify_accounts && currentUser.id !== doctor.id && doctor.license_verified ? (
                  <IonButton size="small" color="warning" fill="outline" disabled={updating} onClick={unverifyDoctor}>
                    Retirer verification licence
                  </IonButton>
                ) : null}

                <IonList>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Telephone</h3>
                      <p>{doctor.phone || 'N/D'}</p>
                    </IonLabel>
                    {doctor.phone ? (
                      <a href={`tel:${doctor.phone}`} slot="end">
                        <IonIcon icon={callOutline} />
                      </a>
                    ) : null}
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>WhatsApp</h3>
                      <p>{doctor.whatsapp || 'N/D'}</p>
                    </IonLabel>
                    {doctor.whatsapp ? (
                      <a href={`https://wa.me/${doctor.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" slot="end">
                        <IonIcon icon={logoWhatsapp} />
                      </a>
                    ) : null}
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Adresse</h3>
                      <p>{doctor.address || 'N/D'}</p>
                      <p>
                        {doctor.city || 'N/D'}
                        {doctor.department ? ` (${doctor.department})` : ''}
                      </p>
                    </IonLabel>
                    {doctor.latitude && doctor.longitude ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${doctor.latitude},${doctor.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        slot="end"
                      >
                        <IonIcon icon={locateOutline} />
                      </a>
                    ) : null}
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Numero de licence</h3>
                      <p>{doctor.license_number || 'N/D'}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Experience</h3>
                      <p>{doctor.years_experience ? `${doctor.years_experience} ans` : 'N/D'}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel>
                      <h3>Bio</h3>
                      <p>{doctor.bio || 'N/D'}</p>
                    </IonLabel>
                  </IonItem>
                </IonList>
              </>
            )}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default DoctorDoctorDetailPage;

import {
  IonBackButton,
  IonBadge,
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
  IonToggle,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { callOutline, locateOutline, logoWhatsapp, medkitOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api, ApiDoctorDirectory } from '../services/api';
import { useAuth } from '../state/AuthState';
import { formatDateTime } from '../utils/time';

type RouteParams = {
  doctorId: string;
};

const DoctorDoctorDetailPage: React.FC = () => {
  const { token, user, loading: authLoading } = useAuth();
  const { doctorId } = useParams<RouteParams>();
  const [doctor, setDoctor] = useState<ApiDoctorDirectory | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [permissionLoaded, setPermissionLoaded] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      setPermissionLoaded(true);
    }
  }, [authLoading]);

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

  const canVerify = !!user?.can_verify_accounts;

  const canManageLicense = useMemo(() => {
    if (!permissionLoaded || !doctor || !user) {
      return false;
    }
    return !!user.can_verify_accounts && user.id !== doctor.id;
  }, [permissionLoaded, user, doctor]);

  const isOwnDoctorProfile = useMemo(() => {
    if (!doctor || !user) {
      return false;
    }
    return user.id === doctor.id;
  }, [doctor, user]);

  const verifyDoctor = async () => {
    if (!token || !doctor) {
      return;
    }

    try {
      setUpdating(true);
      setActionMessage(null);
      const updated = await api.verifyDoctorLicense(token, doctor.id, { verified: true });
      setDoctor((prev) => (prev ? { ...prev, ...updated } : updated));
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Verification impossible.');
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
      setActionMessage(null);
      const updated = await api.verifyDoctorLicense(token, doctor.id, { verified: false });
      setDoctor((prev) => (prev ? { ...prev, ...updated } : updated));
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Action impossible.');
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
      setActionMessage(null);
      await api.approveDoctorAccount(token, doctor.id);
      const rows = await api.getDoctorsDirectoryForDoctor(token);
      const refreshed = rows.find((row) => row.id === doctor.id) ?? doctor;
      setDoctor(refreshed);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Action impossible.');
    } finally {
      setApproving(false);
    }
  };

  const unapproveDoctor = async () => {
    if (!token || !doctor) {
      return;
    }
    try {
      setApproving(true);
      setActionMessage(null);
      await api.unapproveDoctorAccount(token, doctor.id);
      const rows = await api.getDoctorsDirectoryForDoctor(token);
      const refreshed = rows.find((row) => row.id === doctor.id) ?? doctor;
      setDoctor(refreshed);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Action impossible.');
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
                {doctor.profile_banner_url ? (
                  <div style={{ marginBottom: '10px' }}>
                    <img
                      src={doctor.profile_banner_url}
                      alt={`Banniere ${doctor.name}`}
                      style={{
                        width: '100%',
                        maxHeight: '170px',
                        objectFit: 'cover',
                        borderRadius: '10px',
                        border: '1px solid #dbe7ef'
                      }}
                    />
                  </div>
                ) : null}
                <IonItem lines="none">
                  {doctor.profile_photo_url ? (
                    <img
                      src={doctor.profile_photo_url}
                      alt={doctor.name}
                      style={{
                        width: '38px',
                        height: '38px',
                        objectFit: 'cover',
                        borderRadius: '10px',
                        border: '1px solid #dbe7ef',
                        marginRight: '8px'
                      }}
                    />
                  ) : (
                    <IonIcon icon={medkitOutline} slot="start" color="success" />
                  )}
                  <IonLabel>
                    <h2>{doctor.name}</h2>
                    <p>{doctor.specialty || 'Specialite non renseignee'}</p>
                  </IonLabel>
                  {!isOwnDoctorProfile ? (
                    <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.9rem', color: '#475569' }}>Approbation :</span>
                      <IonToggle
                        checked={doctor.account_verification_status === 'approved'}
                        disabled={!canVerify || updating || approving}
                        onIonChange={(event) => {
                          const enabled = !!event.detail.checked;
                          if (enabled) {
                            void approveDoctor();
                          } else {
                            void unapproveDoctor();
                          }
                        }}
                      />
                    </div>
                  ) : null}
                </IonItem>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '4px 0 8px' }}>
                  <IonBadge color={doctor.account_verification_status === 'approved' ? 'success' : 'warning'}>
                    {doctor.account_verification_status === 'approved' ? 'Compte approuve' : 'Compte en attente'}
                  </IonBadge>
                  <IonBadge color={doctor.license_verified ? 'success' : 'warning'}>
                    {doctor.license_verified ? 'Licence verifiee' : 'Licence non verifiee'}
                  </IonBadge>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '8px 0 12px' }}>
                  {doctor.account_verification_status === 'approved' && doctor.approved_by ? (
                    <IonBadge color="light">
                      Approuvee par {doctor.approved_by}
                      {doctor.approved_at ? `, Le ${formatDateTime(doctor.approved_at)}` : ''}
                    </IonBadge>
                  ) : null}
                  {doctor.license_verified && doctor.license_verified_by_doctor_name ? (
                    <IonBadge color="light">
                      Verifiee par {doctor.license_verified_by_doctor_name}
                      {doctor.license_verified_at ? `, Le ${formatDateTime(doctor.license_verified_at)}` : ''}
                    </IonBadge>
                  ) : null}
                  {doctor.teleconsultation_available ? <IonBadge color="tertiary">Teleconsultation</IonBadge> : null}
                </div>
                {actionMessage ? (
                  <IonText color="danger">
                    <p>{actionMessage}</p>
                  </IonText>
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
                    {doctor.license_number && canManageLicense ? (
                      <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.9rem', color: '#475569' }}>Verification</span>
                        <IonToggle
                          checked={!!doctor.license_verified}
                          disabled={updating}
                          onIonChange={(event) => {
                            const enabled = !!event.detail.checked;
                            if (enabled) {
                              void verifyDoctor();
                            } else {
                              void unverifyDoctor();
                            }
                          }}
                        />
                      </div>
                    ) : doctor.license_number ? (
                      <div
                        slot="end"
                        style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '220px', textAlign: 'right', width: '50%' }}
                      >
                        {!permissionLoaded
                          ? 'Verification des permissions en cours...'
                          : canVerify
                          ? 'Vous ne pouvez pas verifier votre propre compte.'
                          : 'Delegation requise pour verifier/deverifier la licence.'}
                      </div>
                    ) : null}
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

import {
  IonAlert,
  IonBackButton,
  IonBadge,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonButton,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
  useIonRouter
} from '@ionic/react';
import {
  callOutline,
  cashOutline,
  chevronDownOutline,
  chevronUpOutline,
  languageOutline,
  locationOutline,
  logoWhatsapp,
  medicalOutline,
  timeOutline,
  videocamOutline
} from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api, ApiDoctorDirectory, ApiPrescription } from '../services/api';
import { useAuth } from '../state/AuthState';
import { formatDateTime } from '../utils/time';

const PatientDoctorPrescriptionsPage: React.FC = () => {
  const ionRouter = useIonRouter();
  const { token, user } = useAuth();
  const { doctorId } = useParams<{ doctorId: string }>();
  const [prescriptions, setPrescriptions] = useState<ApiPrescription[]>([]);
  const [directoryDoctor, setDirectoryDoctor] = useState<ApiDoctorDirectory | null>(null);
  const [contactExpanded, setContactExpanded] = useState(true);
  const [professionalExpanded, setProfessionalExpanded] = useState(false);
  const [consultationExpanded, setConsultationExpanded] = useState(false);
  const [isDoctorBlocked, setIsDoctorBlocked] = useState(false);
  const [blockActionLoading, setBlockActionLoading] = useState(false);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  const [savingEmergencyContact, setSavingEmergencyContact] = useState(false);
  const [emergencyContactMessage, setEmergencyContactMessage] = useState<string | null>(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showUnblockConfirm, setShowUnblockConfirm] = useState(false);
  const cacheKey = user ? `patient-prescriptions-${user.id}` : null;
  const numericDoctorId = Number(doctorId);

  const loadPrescriptions = useCallback(async () => {
    if (!cacheKey) {
      return;
    }

    const cachedRaw = localStorage.getItem(cacheKey);
    if (cachedRaw) {
      try {
        const cachedData = JSON.parse(cachedRaw) as ApiPrescription[];
        if (Array.isArray(cachedData)) {
          setPrescriptions(cachedData);
          const matchedDoctorRows = cachedData.filter(
            (p) => typeof p.doctor_user_id === 'number' && p.doctor_user_id === numericDoctorId
          );
          const hasDoctorProfileData = matchedDoctorRows.some(
            (p) =>
              !!p.doctor &&
              !!(
                p.doctor.phone ||
                p.doctor.address ||
                p.doctor.specialty ||
                p.doctor.city ||
                p.doctor.languages ||
                p.doctor.whatsapp
              )
          );

          if (cachedData.length > 0 && (matchedDoctorRows.length === 0 || hasDoctorProfileData)) {
            return;
          }
        }
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    if (!token) {
      return;
    }
    const data = await api.getPatientPrescriptions(token);
    setPrescriptions(data);
    localStorage.setItem(cacheKey, JSON.stringify(data));
  }, [cacheKey, numericDoctorId, token]);

  useEffect(() => {
    loadPrescriptions().catch(() => undefined);
  }, [loadPrescriptions]);

  useEffect(() => {
    let active = true;
    api.getDoctorsDirectory()
      .then((rows) => {
        if (!active) return;
        const found = rows.find((row) => row.id === numericDoctorId) ?? null;
        setDirectoryDoctor(found);
      })
      .catch(() => {
        if (!active) return;
        setDirectoryDoctor(null);
      });
    return () => {
      active = false;
    };
  }, [numericDoctorId]);

  const doctorPrescriptions = useMemo(() => {
    return prescriptions
      .filter((p) => {
        if (typeof p.doctor_user_id === 'number') {
          return p.doctor_user_id === numericDoctorId;
        }
        return directoryDoctor ? p.doctor_name.trim().toLowerCase() === directoryDoctor.name.trim().toLowerCase() : false;
      })
      .sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
  }, [directoryDoctor, numericDoctorId, prescriptions]);

  const doctorInfo = useMemo(() => {
    const totalPrescriptions = doctorPrescriptions.length;
    const totalMedicines = doctorPrescriptions.reduce(
      (sum, prescription) =>
        sum + prescription.medicine_requests.reduce((inner, med) => inner + (med.quantity ?? 1), 0),
      0
    );
    const latestPrescriptionAt = doctorPrescriptions[0]?.requested_at ?? null;

    const doctorProfile = doctorPrescriptions.find((prescription) => prescription.doctor)?.doctor ?? null;

    return {
      name: doctorProfile?.name ?? directoryDoctor?.name ?? 'Medecin',
      totalPrescriptions,
      totalMedicines,
      latestPrescriptionAt,
      phone: doctorProfile?.phone ?? null,
      address: doctorProfile?.address ?? null,
      latitude: doctorProfile?.latitude ?? null,
      longitude: doctorProfile?.longitude ?? null,
      specialty: doctorProfile?.specialty ?? null,
      city: doctorProfile?.city ?? null,
      department: doctorProfile?.department ?? null,
      languages: doctorProfile?.languages ?? null,
      teleconsultationAvailable: !!doctorProfile?.teleconsultation_available,
      consultationHours: doctorProfile?.consultation_hours ?? null,
      licenseNumber: doctorProfile?.license_number ?? null,
      licenseVerified: !!doctorProfile?.license_verified,
      yearsExperience: doctorProfile?.years_experience ?? null,
      consultationFeeRange: doctorProfile?.consultation_fee_range ?? null,
      whatsapp: doctorProfile?.whatsapp ?? null,
      bio: doctorProfile?.bio ?? null,
      profilePhotoUrl: doctorProfile?.profile_photo_url ?? directoryDoctor?.profile_photo_url ?? null,
      profileBannerUrl: doctorProfile?.profile_banner_url ?? directoryDoctor?.profile_banner_url ?? null
    };
  }, [doctorPrescriptions, directoryDoctor]);

  const doctorUserId = useMemo(() => {
    const fromPrescription = doctorPrescriptions.find((row) => Number.isFinite(row.doctor_user_id ?? NaN))?.doctor_user_id;
    if (typeof fromPrescription === 'number' && fromPrescription > 0) {
      return fromPrescription;
    }
    if (directoryDoctor?.id && directoryDoctor.id > 0) {
      return directoryDoctor.id;
    }
    return null;
  }, [directoryDoctor?.id, doctorPrescriptions]);

  useEffect(() => {
    if (!token || !doctorUserId) {
      setIsDoctorBlocked(false);
      return;
    }

    api.getPatientAccessDoctorBlockStatus(token, doctorUserId)
      .then((response) => setIsDoctorBlocked(response.is_blocked))
      .catch(() => setIsDoctorBlocked(false));
  }, [doctorUserId, token]);

  const handleSetDoctorBlocked = useCallback(async (nextBlocked: boolean) => {
    if (!token || !doctorUserId || blockActionLoading) {
      return;
    }
    setBlockActionLoading(true);
    setBlockMessage(null);
    try {
      const response = nextBlocked
        ? await api.blockPatientAccessDoctor(token, doctorUserId)
        : await api.unblockPatientAccessDoctor(token, doctorUserId);
      setIsDoctorBlocked(response.is_blocked);
      setBlockMessage(response.message);
    } catch (err) {
      setBlockMessage(err instanceof Error ? err.message : 'Action impossible.');
    } finally {
      setBlockActionLoading(false);
    }
  }, [blockActionLoading, doctorUserId, token]);

  const addToEmergencyContacts = useCallback(async () => {
    if (!token || !doctorUserId || savingEmergencyContact) {
      return;
    }

    setSavingEmergencyContact(true);
    setEmergencyContactMessage(null);
    try {
      const response = await api.createPatientEmergencyContactFromProfile(token, {
        source_type: 'doctor_user',
        source_id: doctorUserId,
      });
      setEmergencyContactMessage(response.message);
    } catch (err) {
      setEmergencyContactMessage(err instanceof Error ? err.message : 'Action impossible.');
    } finally {
      setSavingEmergencyContact(false);
    }
  }, [doctorUserId, savingEmergencyContact, token]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient/doctors" />
          </IonButtons>
          <IonTitle>{doctorInfo.name}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardHeader>
            <div
              style={{
                width: '100%',
                height: '110px',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '8px',
                border: '1px solid #dbe7ef',
                background: doctorInfo.profileBannerUrl
                  ? `url(${doctorInfo.profileBannerUrl}) center/cover no-repeat`
                  : 'linear-gradient(120deg, #ecfeff 0%, #dbeafe 100%)'
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    border: '1px solid #dbe7ef',
                    background: '#dcfce7'
                  }}
                >
                  {doctorInfo.profilePhotoUrl ? (
                    <img
                      src={doctorInfo.profilePhotoUrl}
                      alt={`Photo Dr. ${doctorInfo.name}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                      <IonIcon icon={medicalOutline} style={{ fontSize: '24px', color: '#166534' }} />
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>Dr. {doctorInfo.name}</div>
                  <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{doctorInfo.specialty || 'Specialite non renseignee'}</div>
                </div>
              </IonCardTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isDoctorBlocked ? (
                  <IonButton
                    size="small"
                    fill="outline"
                    color="success"
                    disabled={blockActionLoading || !doctorUserId}
                    onClick={() => setShowUnblockConfirm(true)}
                  >
                    Debloquer
                  </IonButton>
                ) : (
                  <IonButton
                    size="small"
                    fill="outline"
                    color="danger"
                    disabled={blockActionLoading || !doctorUserId}
                    onClick={() => setShowBlockConfirm(true)}
                  >
                    Bloquer
                  </IonButton>
                )}
              </div>
            </div>
          </IonCardHeader>
          <IonCardContent>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {doctorInfo.licenseVerified ? <IonBadge color="success">Verifie</IonBadge> : <IonBadge color="medium">Non verifie</IonBadge>}
              {doctorInfo.teleconsultationAvailable ? <IonBadge color="primary">Teleconsultation</IonBadge> : null}
              {isDoctorBlocked ? <IonBadge color="danger">Bloque</IonBadge> : null}
            </div>
            {blockMessage ? (
              <IonText color={isDoctorBlocked ? 'warning' : 'success'}>
                <p>{blockMessage}</p>
              </IonText>
            ) : null}
            <IonButton
              expand="block"
              fill="outline"
              color="warning"
              disabled={!doctorUserId || savingEmergencyContact}
              onClick={() => {
                void addToEmergencyContacts();
              }}
            >
              {savingEmergencyContact ? 'Ajout...' : "Ajouter aux contacts d'urgence"}
            </IonButton>
            {emergencyContactMessage ? (
              <IonText color="medium">
                <p>{emergencyContactMessage}</p>
              </IonText>
            ) : null}

            <div style={{ border: '1px solid #dbe7ef', borderRadius: '12px', padding: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Coordonnees</strong>
                <IonButton fill="clear" size="small" onClick={() => setContactExpanded((prev) => !prev)}>
                  <IonIcon icon={contactExpanded ? chevronUpOutline : chevronDownOutline} />
                </IonButton>
              </div>
              {contactExpanded ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <p style={{ margin: 0 }}>{doctorInfo.phone || 'Telephone N/D'}</p>
                    <IonButton
                      fill="clear"
                      size="small"
                      disabled={!doctorInfo.phone}
                      href={doctorInfo.phone ? `tel:${doctorInfo.phone}` : undefined}
                    >
                      <IonIcon icon={callOutline} />
                    </IonButton>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '4px' }}>
                    <p style={{ margin: 0 }}>{doctorInfo.whatsapp || 'WhatsApp N/D'}</p>
                    <IonButton
                      fill="clear"
                      size="small"
                      disabled={!doctorInfo.whatsapp}
                      href={doctorInfo.whatsapp ? `https://wa.me/${doctorInfo.whatsapp.replace(/[^0-9]/g, '')}` : undefined}
                      target="_blank"
                    >
                      <IonIcon icon={logoWhatsapp} />
                    </IonButton>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '4px' }}>
                    <p style={{ margin: 0 }}>{doctorInfo.address || 'Adresse N/D'}</p>
                    <IonButton
                      fill="clear"
                      size="small"
                      disabled={!doctorInfo.latitude || !doctorInfo.longitude}
                      href={
                        doctorInfo.latitude && doctorInfo.longitude
                          ? `https://www.google.com/maps?q=${doctorInfo.latitude},${doctorInfo.longitude}`
                          : undefined
                      }
                      target="_blank"
                    >
                      <IonIcon icon={locationOutline} />
                    </IonButton>
                  </div>
                  <p>{[doctorInfo.city, doctorInfo.department].filter(Boolean).join(' / ') || 'Ville/Departement N/D'}</p>
                </>
              ) : null}
            </div>

            <div style={{ border: '1px solid #dbe7ef', borderRadius: '12px', padding: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Profil professionnel</strong>
                <IonButton fill="clear" size="small" onClick={() => setProfessionalExpanded((prev) => !prev)}>
                  <IonIcon icon={professionalExpanded ? chevronUpOutline : chevronDownOutline} />
                </IonButton>
              </div>
              {professionalExpanded ? (
                <>
                  <p><IonIcon icon={medicalOutline} /> {doctorInfo.specialty || 'Specialite N/D'}</p>
                  <p><IonIcon icon={timeOutline} /> {doctorInfo.yearsExperience !== null ? `${doctorInfo.yearsExperience} an(s)` : 'Experience N/D'}</p>
                  <p><IonIcon icon={languageOutline} /> {doctorInfo.languages || 'Langues N/D'}</p>
                  <p>{doctorInfo.bio || 'Bio N/D'}</p>
                </>
              ) : null}
            </div>

            <div style={{ border: '1px solid #dbe7ef', borderRadius: '12px', padding: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Consultation</strong>
                <IonButton fill="clear" size="small" onClick={() => setConsultationExpanded((prev) => !prev)}>
                  <IonIcon icon={consultationExpanded ? chevronUpOutline : chevronDownOutline} />
                </IonButton>
              </div>
              {consultationExpanded ? (
                <>
                  <p><IonIcon icon={videocamOutline} /> Teleconsultation: {doctorInfo.teleconsultationAvailable ? 'Oui' : 'Non'}</p>
                  <p><IonIcon icon={timeOutline} /> {doctorInfo.consultationHours || 'Horaires N/D'}</p>
                  <p><IonIcon icon={cashOutline} /> {doctorInfo.consultationFeeRange || 'Tarif N/D'}</p>
                </>
              ) : null}
            </div>

          </IonCardContent>
        </IonCard>
        <IonAlert
          isOpen={showBlockConfirm}
          onDidDismiss={() => setShowBlockConfirm(false)}
          header="Bloquer ce medecin ?"
          message="Le medecin ne pourra plus demander l'acces a votre dossier tant qu'il reste bloque."
          buttons={[
            {
              text: 'Annuler',
              role: 'cancel'
            },
            {
              text: 'Bloquer',
              role: 'destructive',
              handler: () => {
                void handleSetDoctorBlocked(true);
              }
            }
          ]}
        />
        <IonAlert
          isOpen={showUnblockConfirm}
          onDidDismiss={() => setShowUnblockConfirm(false)}
          header="Debloquer ce medecin ?"
          message="Le medecin pourra a nouveau envoyer des demandes d'acces a votre dossier."
          buttons={[
            {
              text: 'Annuler',
              role: 'cancel'
            },
            {
              text: 'Debloquer',
              handler: () => {
                void handleSetDoctorBlocked(false);
              }
            }
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default PatientDoctorPrescriptionsPage;

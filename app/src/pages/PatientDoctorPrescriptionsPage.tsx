import {
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
  IonItem,
  IonLabel,
  IonList,
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
  shieldCheckmarkOutline,
  timeOutline,
  videocamOutline
} from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api, ApiDoctorDirectory, ApiPrescription } from '../services/api';
import { useAuth } from '../state/AuthState';
import { getPrescriptionStatusClassName, getPrescriptionStatusLabel } from '../utils/prescriptionStatus';
import { formatDateTime } from '../utils/time';

const PatientDoctorPrescriptionsPage: React.FC = () => {
  const ionRouter = useIonRouter();
  const { token, user } = useAuth();
  const { doctorName } = useParams<{ doctorName: string }>();
  const [prescriptions, setPrescriptions] = useState<ApiPrescription[]>([]);
  const [directoryDoctor, setDirectoryDoctor] = useState<ApiDoctorDirectory | null>(null);
  const [doctorInfoExpanded, setDoctorInfoExpanded] = useState(true);
  const [contactExpanded, setContactExpanded] = useState(true);
  const [professionalExpanded, setProfessionalExpanded] = useState(false);
  const [consultationExpanded, setConsultationExpanded] = useState(false);
  const [verificationExpanded, setVerificationExpanded] = useState(false);
  const cacheKey = user ? `patient-prescriptions-${user.id}` : null;
  const decodedDoctorName = decodeURIComponent(doctorName);

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
            (p) => p.doctor_name.trim().toLowerCase() === decodedDoctorName.trim().toLowerCase()
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
  }, [cacheKey, decodedDoctorName, token]);

  useEffect(() => {
    loadPrescriptions().catch(() => undefined);
  }, [loadPrescriptions]);

  useEffect(() => {
    let active = true;
    api.getDoctorsDirectory()
      .then((rows) => {
        if (!active) return;
        const found = rows.find(
          (row) => row.name.trim().toLowerCase() === decodedDoctorName.trim().toLowerCase()
        ) ?? null;
        setDirectoryDoctor(found);
      })
      .catch(() => {
        if (!active) return;
        setDirectoryDoctor(null);
      });
    return () => {
      active = false;
    };
  }, [decodedDoctorName]);

  const doctorPrescriptions = useMemo(() => {
    return prescriptions
      .filter((p) => p.doctor_name.trim().toLowerCase() === decodedDoctorName.trim().toLowerCase())
      .sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
  }, [decodedDoctorName, prescriptions]);

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
      name: decodedDoctorName,
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
  }, [decodedDoctorName, doctorPrescriptions, directoryDoctor]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient/doctors" />
          </IonButtons>
          <IonTitle>{decodedDoctorName}</IonTitle>
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
              <IonButton size="small" fill="clear" onClick={() => setDoctorInfoExpanded((prev) => !prev)}>
                <IonIcon icon={doctorInfoExpanded ? chevronUpOutline : chevronDownOutline} />
              </IonButton>
            </div>
          </IonCardHeader>
          <IonCardContent style={{ display: doctorInfoExpanded ? 'block' : 'none' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {doctorInfo.licenseVerified ? <IonBadge color="success">Verifie</IonBadge> : <IonBadge color="medium">Non verifie</IonBadge>}
              {doctorInfo.teleconsultationAvailable ? <IonBadge color="primary">Teleconsultation</IonBadge> : null}
            </div>

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

            <div style={{ border: '1px solid #dbe7ef', borderRadius: '12px', padding: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Verification</strong>
                <IonButton fill="clear" size="small" onClick={() => setVerificationExpanded((prev) => !prev)}>
                  <IonIcon icon={verificationExpanded ? chevronUpOutline : chevronDownOutline} />
                </IonButton>
              </div>
              {verificationExpanded ? (
                <>
                  <p><IonIcon icon={shieldCheckmarkOutline} /> Licence: {doctorInfo.licenseNumber || 'N/D'}</p>
                  <p>Statut: {doctorInfo.licenseVerified ? 'Verifiee' : 'Non verifiee'}</p>
                  <p>Total ordonnances: {doctorInfo.totalPrescriptions}</p>
                  <p>Total medicaments prescrits: {doctorInfo.totalMedicines}</p>
                  <p>
                    Derniere ordonnance:{' '}
                    {doctorInfo.latestPrescriptionAt ? formatDateTime(doctorInfo.latestPrescriptionAt) : 'Aucune'}
                  </p>
                </>
              ) : null}
            </div>
          </IonCardContent>
        </IonCard>
        <IonCard className="surface-card">
          <IonCardHeader>
            <IonCardTitle>Ordonnances</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {doctorPrescriptions.length === 0 ? (
              <IonText color="medium">
                <p>Aucune ordonnance pour ce medecin.</p>
              </IonText>
            ) : (
              <IonList>
                {doctorPrescriptions.map((prescription) => (
                  <IonItem
                    key={prescription.id}
                    lines="full"
                    button
                    detail
                    onClick={() => ionRouter.push(`/patient/prescriptions/${prescription.id}`, 'forward', 'push')}
                  >
                    <IonLabel>
                      <div className="status-row">
                        <span>Statut:</span>
                        <IonBadge className={getPrescriptionStatusClassName(prescription.status)}>
                          {getPrescriptionStatusLabel(prescription.status)}
                        </IonBadge>
                      </div>
                      <p>Demandee le {formatDateTime(prescription.requested_at)}</p>
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

export default PatientDoctorPrescriptionsPage;

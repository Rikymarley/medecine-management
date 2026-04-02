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
import { medicalOutline } from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPrescription } from '../services/api';
import { useAuth } from '../state/AuthState';
import { getPrescriptionStatusClassName, getPrescriptionStatusLabel } from '../utils/prescriptionStatus';
import { formatDateTime } from '../utils/time';

const PatientDoctorPrescriptionsPage: React.FC = () => {
  const ionRouter = useIonRouter();
  const { token, user } = useAuth();
  const { doctorName } = useParams<{ doctorName: string }>();
  const [prescriptions, setPrescriptions] = useState<ApiPrescription[]>([]);
  const [doctorInfoExpanded, setDoctorInfoExpanded] = useState(false);
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
      bio: doctorProfile?.bio ?? null
    };
  }, [decodedDoctorName, doctorPrescriptions]);

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <IonIcon icon={medicalOutline} style={{ fontSize: '20px' }} />
                Informations du medecin
              </IonCardTitle>
              <IonButton size="small" fill="outline" onClick={() => setDoctorInfoExpanded((prev) => !prev)}>
                {doctorInfoExpanded ? 'Masquer' : 'Afficher'}
              </IonButton>
            </div>
          </IonCardHeader>
          <IonCardContent style={{ display: doctorInfoExpanded ? 'block' : 'none' }}>
            <p>
              <strong>Nom:</strong> {doctorInfo.name}
            </p>
            <p>
              <strong>Specialite:</strong> {doctorInfo.specialty || 'Non renseignee'}
            </p>
            <p>
              <strong>Total ordonnances:</strong> {doctorInfo.totalPrescriptions}
            </p>
            <p>
              <strong>Total medicaments prescrits:</strong> {doctorInfo.totalMedicines}
            </p>
            <p>
              <strong>Derniere ordonnance:</strong>{' '}
              {doctorInfo.latestPrescriptionAt ? formatDateTime(doctorInfo.latestPrescriptionAt) : 'Aucune'}
            </p>
            <p>
              <strong>Telephone:</strong> {doctorInfo.phone || 'Non renseigne'}
            </p>
            <p>
              <strong>Adresse:</strong> {doctorInfo.address || 'Non renseignee'}
            </p>
            <p>
              <strong>Ville / Departement:</strong>{' '}
              {[doctorInfo.city, doctorInfo.department].filter(Boolean).join(' / ') || 'Non renseigne'}
            </p>
            <p>
              <strong>Langues:</strong> {doctorInfo.languages || 'Non renseignees'}
            </p>
            <p>
              <strong>Teleconsultation:</strong> {doctorInfo.teleconsultationAvailable ? 'Oui' : 'Non'}
            </p>
            <p>
              <strong>Horaires:</strong> {doctorInfo.consultationHours || 'Non renseignes'}
            </p>
            <p>
              <strong>Numero licence:</strong> {doctorInfo.licenseNumber || 'Non renseigne'}{' '}
              {doctorInfo.licenseVerified ? '(Verifiee)' : ''}
            </p>
            <p>
              <strong>Experience:</strong>{' '}
              {doctorInfo.yearsExperience !== null ? `${doctorInfo.yearsExperience} an(s)` : 'Non renseignee'}
            </p>
            <p>
              <strong>Frais consultation:</strong> {doctorInfo.consultationFeeRange || 'Non renseignes'}
            </p>
            <p>
              <strong>WhatsApp:</strong> {doctorInfo.whatsapp || 'Non renseigne'}
            </p>
            <p>
              <strong>Bio:</strong> {doctorInfo.bio || 'Non renseignee'}
            </p>
            <p>
              <strong>GPS:</strong>{' '}
              {doctorInfo.latitude && doctorInfo.longitude
                ? `${doctorInfo.latitude}, ${doctorInfo.longitude}`
                : 'Non renseigne'}
            </p>
            {doctorInfo.whatsapp ? (
              <IonButton
                fill="outline"
                size="small"
                href={`https://wa.me/${doctorInfo.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
              >
                WhatsApp
              </IonButton>
            ) : null}
            {doctorInfo.latitude && doctorInfo.longitude ? (
              <IonButton
                fill="outline"
                size="small"
                href={`https://www.google.com/maps?q=${doctorInfo.latitude},${doctorInfo.longitude}`}
                target="_blank"
              >
                Ouvrir la carte
              </IonButton>
            ) : null}
          </IonCardContent>
        </IonCard>
        <IonCard className="surface-card">
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

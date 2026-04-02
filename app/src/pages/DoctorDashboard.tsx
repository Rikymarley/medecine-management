import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonText,
  IonTextarea,
  IonTitle,
  IonToggle,
  IonToolbar,
  useIonRouter
} from '@ionic/react';
import { addOutline, documentTextOutline, locateOutline, peopleOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api } from '../services/api';
import { useAuth } from '../state/AuthState';
import { maskHaitiPhone } from '../utils/phoneMask';

const DoctorDashboard: React.FC = () => {
  const ionRouter = useIonRouter();
  const { logout, token, user } = useAuth();

  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [city, setCity] = useState('');
  const [department, setDepartment] = useState('');
  const [languages, setLanguages] = useState('');
  const [teleconsultationAvailable, setTeleconsultationAvailable] = useState(false);
  const [consultationHours, setConsultationHours] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseVerified, setLicenseVerified] = useState(false);
  const [yearsExperience, setYearsExperience] = useState('');
  const [consultationFeeRange, setConsultationFeeRange] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [bio, setBio] = useState('');

  const [saving, setSaving] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const normalizeText = (value: unknown) => (value === null || value === undefined ? '' : String(value));

  useEffect(() => {
    if (!token) {
      return;
    }

    api
      .me(token)
      .then((me) => {
        setPhone(maskHaitiPhone(normalizeText(me.phone)));
        setAddress(normalizeText(me.address));
        setLatitude(normalizeText(me.latitude));
        setLongitude(normalizeText(me.longitude));
        setSpecialty(normalizeText(me.specialty));
        setCity(normalizeText(me.city));
        setDepartment(normalizeText(me.department));
        setLanguages(normalizeText(me.languages));
        setTeleconsultationAvailable(!!me.teleconsultation_available);
        setConsultationHours(normalizeText(me.consultation_hours));
        setLicenseNumber(normalizeText(me.license_number));
        setLicenseVerified(!!me.license_verified);
        setYearsExperience(normalizeText(me.years_experience));
        setConsultationFeeRange(normalizeText(me.consultation_fee_range));
        setWhatsapp(maskHaitiPhone(normalizeText(me.whatsapp)));
        setBio(normalizeText(me.bio));
      })
      .catch(() => {
        setPhone(maskHaitiPhone(normalizeText(user?.phone)));
        setAddress(normalizeText(user?.address));
        setLatitude(normalizeText(user?.latitude));
        setLongitude(normalizeText(user?.longitude));
        setSpecialty(normalizeText(user?.specialty));
        setCity(normalizeText(user?.city));
        setDepartment(normalizeText(user?.department));
        setLanguages(normalizeText(user?.languages));
        setTeleconsultationAvailable(!!user?.teleconsultation_available);
        setConsultationHours(normalizeText(user?.consultation_hours));
        setLicenseNumber(normalizeText(user?.license_number));
        setLicenseVerified(!!user?.license_verified);
        setYearsExperience(normalizeText(user?.years_experience));
        setConsultationFeeRange(normalizeText(user?.consultation_fee_range));
        setWhatsapp(maskHaitiPhone(normalizeText(user?.whatsapp)));
        setBio(normalizeText(user?.bio));
      });
  }, [
    token,
    user?.address,
    user?.bio,
    user?.city,
    user?.consultation_fee_range,
    user?.consultation_hours,
    user?.department,
    user?.languages,
    user?.latitude,
    user?.license_number,
    user?.license_verified,
    user?.longitude,
    user?.phone,
    user?.specialty,
    user?.teleconsultation_available,
    user?.whatsapp,
    user?.years_experience
  ]);

  const profileMissingFields = useMemo(() => {
    const lat = normalizeText(latitude).trim();
    const lng = normalizeText(longitude).trim();
    const missing: string[] = [];
    if (!phone.trim()) missing.push('telephone');
    if (!specialty.trim()) missing.push('specialite');
    if (!address.trim()) missing.push('adresse');
    if (!lat || !lng) missing.push('gps');
    return missing;
  }, [address, latitude, longitude, phone, specialty]);
  const profileIncomplete = profileMissingFields.length > 0;

  const saveProfile = async () => {
    if (!token) {
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await api.updateDoctorProfile(token, {
        phone: phone.trim() || null,
        address: address.trim() || null,
        latitude: normalizeText(latitude).trim() ? Number(normalizeText(latitude).trim()) : null,
        longitude: normalizeText(longitude).trim() ? Number(normalizeText(longitude).trim()) : null,
        specialty: specialty.trim() || null,
        city: city.trim() || null,
        department: department.trim() || null,
        languages: languages.trim() || null,
        teleconsultation_available: teleconsultationAvailable,
        consultation_hours: consultationHours.trim() || null,
        license_number: licenseNumber.trim() || null,
        license_verified: licenseVerified,
        years_experience: yearsExperience.trim() ? Number(yearsExperience) : null,
        consultation_fee_range: consultationFeeRange.trim() || null,
        whatsapp: whatsapp.trim() || null,
        bio: bio.trim() || null
      });
      setMessage('Profil mis a jour.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Echec de mise a jour.');
    } finally {
      setSaving(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage('Geolocalisation indisponible sur cet appareil.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude));
        setLongitude(String(position.coords.longitude));
      },
      () => setMessage('Impossible de recuperer la position GPS.')
    );
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Tableau de bord</IonTitle>
          <IonButton slot="end" fill="clear" onClick={logout}>
            Se deconnecter
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="hero-card">
          <IonCardHeader>
            <IonCardTitle>{user?.name ?? 'Profil medecin'}</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <IonBadge color={profileIncomplete ? 'warning' : 'success'}>
                {profileIncomplete ? `Infos incompletes (${profileMissingFields.length})` : 'Infos completes'}
              </IonBadge>
              <IonButton size="small" fill="outline" onClick={() => setProfileExpanded((prev) => !prev)}>
                {profileExpanded ? 'Masquer infos' : 'Afficher infos'}
              </IonButton>
            </div>
            {profileIncomplete ? (
              <IonText color="warning">
                <p>Champs manquants: {profileMissingFields.join(', ')}.</p>
              </IonText>
            ) : null}
            {message ? (
              <IonText color="medium">
                <p>{message}</p>
              </IonText>
            ) : null}
            {profileExpanded ? (
              <>
                <IonItem lines="none">
                  <IonLabel position="stacked">Specialite</IonLabel>
                  <IonInput value={specialty} placeholder="Cardiologie, Pediatrie..." onIonInput={(e) => setSpecialty(e.detail.value ?? '')} />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">Telephone</IonLabel>
                  <IonInput value={phone} placeholder="+509-xxxx-xxxx" onIonInput={(e) => setPhone(maskHaitiPhone(e.detail.value ?? ''))} />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">WhatsApp</IonLabel>
                  <IonInput value={whatsapp} placeholder="+509-xxxx-xxxx" onIonInput={(e) => setWhatsapp(maskHaitiPhone(e.detail.value ?? ''))} />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">Adresse</IonLabel>
                  <IonInput value={address} placeholder="Adresse du cabinet" onIonInput={(e) => setAddress(e.detail.value ?? '')} />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">Ville</IonLabel>
                  <IonInput value={city} onIonInput={(e) => setCity(e.detail.value ?? '')} />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">Departement</IonLabel>
                  <IonInput value={department} onIonInput={(e) => setDepartment(e.detail.value ?? '')} />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">Langues</IonLabel>
                  <IonInput value={languages} placeholder="Francais, Kreyol, English" onIonInput={(e) => setLanguages(e.detail.value ?? '')} />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel>Teleconsultation</IonLabel>
                  <IonToggle checked={teleconsultationAvailable} onIonChange={(e) => setTeleconsultationAvailable(e.detail.checked)} />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">Horaires de consultation</IonLabel>
                  <IonTextarea autoGrow value={consultationHours} onIonInput={(e) => setConsultationHours(e.detail.value ?? '')} />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">Numero licence</IonLabel>
                  <IonInput value={licenseNumber} onIonInput={(e) => setLicenseNumber(e.detail.value ?? '')} />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel>Licence verifiee</IonLabel>
                  <IonToggle checked={licenseVerified} onIonChange={(e) => setLicenseVerified(e.detail.checked)} />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">Annees d'experience</IonLabel>
                  <IonInput type="number" value={yearsExperience} onIonInput={(e) => setYearsExperience(e.detail.value ?? '')} />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">Frais consultation (plage)</IonLabel>
                  <IonInput value={consultationFeeRange} placeholder="500 HTG - 1500 HTG" onIonInput={(e) => setConsultationFeeRange(e.detail.value ?? '')} />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">Bio</IonLabel>
                  <IonTextarea autoGrow value={bio} onIonInput={(e) => setBio(e.detail.value ?? '')} />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">Latitude</IonLabel>
                  <IonInput type="number" value={latitude} placeholder="19.7510" onIonInput={(e) => setLatitude(e.detail.value ?? '')} />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">Longitude</IonLabel>
                  <IonInput type="number" value={longitude} placeholder="-72.2014" onIonInput={(e) => setLongitude(e.detail.value ?? '')} />
                </IonItem>
                <div style={{ display: 'flex', justifyContent: 'flex-end', position: 'absolute', marginTop: '-85px', right: '10px', zIndex: 1 }}>
                  <IonButton size="small" fill="outline" onClick={useCurrentLocation}>
                    <IonIcon icon={locateOutline} slot="start" />
                    Obtenir GPS
                  </IonButton>
                </div>
                <IonButton expand="block" onClick={() => saveProfile().catch(() => undefined)} disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Mettre a jour le profil'}
                </IonButton>
              </>
            ) : null}
          </IonCardContent>
        </IonCard>

        <div className="dashboard-grid dashboard-grid-fab">
          <IonCard button className="surface-card" style={{ margin: 0 }} onClick={() => ionRouter.push('/doctor/patients', 'forward', 'push')}>
            <IonCardContent>
              <div className="quick-icon quick-icon-green">
                <IonIcon icon={peopleOutline} />
              </div>
              <h3>Patients</h3>
              <p className="muted-note">Voir la liste de vos patients.</p>
            </IonCardContent>
          </IonCard>
          <IonCard button className="surface-card" style={{ margin: 0 }} onClick={() => ionRouter.push('/doctor/prescriptions', 'forward', 'push')}>
            <IonCardContent>
              <div className="quick-icon quick-icon-gold">
                <IonIcon icon={documentTextOutline} />
              </div>
              <h3>Ordonnances</h3>
              <p className="muted-note">Voir toutes vos ordonnances.</p>
            </IonCardContent>
          </IonCard>
        </div>

        <IonFab vertical="bottom" horizontal="center" slot="fixed">
          <IonFabButton color="success" onClick={() => ionRouter.push('/doctor/create-prescription', 'forward', 'push')}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default DoctorDashboard;

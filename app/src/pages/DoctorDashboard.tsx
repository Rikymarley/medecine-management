import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonContent,
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
import {
  alertCircleOutline,
  closeCircleOutline,
  checkmarkCircleOutline,
  chevronDownOutline,
  chevronUpOutline,
  documentTextOutline,
  locateOutline,
  medkitOutline,
  peopleOutline,
  personCircleOutline,
  storefrontOutline,
  starOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';
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
  const [profileCardExpanded, setProfileCardExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [contactExpanded, setContactExpanded] = useState(false);
  const [professionalExpanded, setProfessionalExpanded] = useState(false);
  const [verificationExpanded, setVerificationExpanded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const normalizeText = (value: unknown) => (value === null || value === undefined ? '' : String(value));
  const parseCoordinate = (value: string): number | null => {
    const raw = value.trim();
    if (!raw) {
      return null;
    }
    const normalized = raw.replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };

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

  const completionMissingFields = useMemo(() => {
    const checks = [
      { label: 'specialite', value: specialty.trim() },
      { label: 'telephone', value: phone.trim() },
      { label: 'whatsapp', value: whatsapp.trim() },
      { label: 'adresse', value: address.trim() },
      { label: 'ville', value: city.trim() },
      { label: 'departement', value: department.trim() },
      { label: 'langues', value: languages.trim() },
      { label: 'horaires de consultation', value: consultationHours.trim() },
      { label: 'numero licence', value: licenseNumber.trim() },
      { label: "annees d'experience", value: yearsExperience.trim() },
      { label: 'frais de consultation', value: consultationFeeRange.trim() },
      { label: 'latitude', value: normalizeText(latitude).trim() },
      { label: 'longitude', value: normalizeText(longitude).trim() }
    ];
    return checks.filter((item) => !item.value).map((item) => item.label);
  }, [
    address,
    city,
    consultationFeeRange,
    consultationHours,
    department,
    languages,
    latitude,
    licenseNumber,
    longitude,
    phone,
    specialty,
    whatsapp,
    yearsExperience
  ]);
  const profileIncomplete = completionMissingFields.length > 0;
  const profileCompletion = useMemo(() => {
    const total = 13;
    const done = total - completionMissingFields.length;
    return Math.round((done / total) * 100);
  }, [
    completionMissingFields.length
  ]);
  const canUseDoctorApp = profileCompletion === 100;
  const requiredLabel = (label: string, isFilled: boolean) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span>* {label}</span>
      <IonIcon
        icon={isFilled ? checkmarkCircleOutline : alertCircleOutline}
        color={isFilled ? 'success' : 'warning'}
      />
    </span>
  );
  const focusMissingField = (field: string) => {
    setProfileCardExpanded(true);
    setEditMode(true);

    const contactFields = new Set([
      'specialite',
      'telephone',
      'whatsapp',
      'adresse',
      'ville',
      'departement',
      'langues'
    ]);
    const professionalFields = new Set([
      'horaires de consultation',
      "annees d'experience",
      'frais de consultation'
    ]);
    const verificationFields = new Set([
      'numero licence',
      'latitude',
      'longitude'
    ]);

    setContactExpanded(contactFields.has(field));
    setProfessionalExpanded(professionalFields.has(field));
    setVerificationExpanded(verificationFields.has(field));
  };

  const saveProfile = async () => {
    if (!token) {
      return;
    }
    const parsedLatitude = parseCoordinate(normalizeText(latitude));
    const parsedLongitude = parseCoordinate(normalizeText(longitude));
    const hasLatitudeInput = normalizeText(latitude).trim() !== '';
    const hasLongitudeInput = normalizeText(longitude).trim() !== '';

    if (hasLatitudeInput && parsedLatitude === null) {
      setMessage('Latitude invalide. Utilisez un nombre (ex: 19.7510).');
      return;
    }
    if (hasLongitudeInput && parsedLongitude === null) {
      setMessage('Longitude invalide. Utilisez un nombre (ex: -72.2014).');
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await api.updateDoctorProfile(token, {
        phone: phone.trim() || null,
        address: address.trim() || null,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        specialty: specialty.trim() || null,
        city: city.trim() || null,
        department: department.trim() || null,
        languages: languages.trim() || null,
        teleconsultation_available: teleconsultationAvailable,
        consultation_hours: consultationHours.trim() || null,
        license_number: licenseNumber.trim() || null,
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <IonCardTitle>Profil medecin</IonCardTitle>
                <IonBadge color={profileCompletion === 100 ? 'success' : 'warning'}>
                  Completion du profil : {profileCompletion}%
                </IonBadge>
              </div>
              <IonButton fill="clear" size="small" onClick={() => setProfileCardExpanded((prev) => !prev)}>
                <IonIcon icon={profileCardExpanded ? chevronUpOutline : chevronDownOutline} />
              </IonButton>
            </div>
          </IonCardHeader>
          {profileCardExpanded ? <IonCardContent>
            <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr auto', gap: '10px', alignItems: 'center' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  display: 'grid',
                  placeItems: 'center',
                  background: '#dcfce7'
                }}
              >
                <IonIcon icon={personCircleOutline} style={{ fontSize: '32px', color: '#15803d' }} />
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{user?.name ?? 'Profil medecin'}</div>
                <div style={{ color: '#64748b', fontSize: '0.95rem' }}>{specialty || 'Specialite non renseignee'}</div>
              </div>
              <IonButton size="small" fill={editMode ? 'solid' : 'outline'} onClick={() => setEditMode((prev) => !prev)}>
                {editMode ? 'Lecture' : 'Modifier'}
              </IonButton>
            </div>

            <div
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '999px',
                background: '#e2e8f0',
                overflow: 'hidden',
                marginTop: '8px'
              }}
            >
              <div
                style={{
                  width: `${profileCompletion}%`,
                  height: '100%',
                  background: profileCompletion >= 80 ? '#16a34a' : profileCompletion >= 50 ? '#d97706' : '#dc2626'
                }}
              />
            </div>
            {!canUseDoctorApp ? (
              <div
                style={{
                  marginTop: '10px',
                  border: '1px solid #fde68a',
                  background: '#fffbeb',
                  borderRadius: '12px',
                  padding: '10px'
                }}
              >
                <div style={{ fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>Profil incomplet</div>
                <div style={{ color: '#92400e', fontSize: '0.92rem', marginBottom: '8px' }}>
                  Il manque {completionMissingFields.length} champ(s) obligatoire(s). Bio reste facultatif.
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {completionMissingFields.map((field) => (
                    <IonButton
                      key={field}
                      size="small"
                      fill="outline"
                      color="warning"
                      onClick={() => focusMissingField(field)}
                    >
                      {field}
                    </IonButton>
                  ))}
                </div>
              </div>
            ) : null}
            {message ? (
              <IonText color="medium">
                <p>{message}</p>
              </IonText>
            ) : null}
            <div style={{ marginTop: '10px', border: '1px solid #dbe7ef', borderRadius: '12px', overflow: 'hidden' }}>
              <IonButton
                expand="block"
                fill="clear"
                color="dark"
                onClick={() => setContactExpanded((prev) => !prev)}
                style={{ margin: 0 }}
              >
                Coordonnees {contactExpanded ? <IonIcon slot="end" icon={chevronUpOutline} /> : <IonIcon slot="end" icon={chevronDownOutline} />}
              </IonButton>
              {contactExpanded ? (
                <>
                  <IonItem lines="none">
                    <IonLabel position="stacked">{requiredLabel('Specialite', specialty.trim().length > 0)}</IonLabel>
                    <IonInput
                      disabled={!editMode}
                      value={specialty}
                      placeholder="Cardiologie, Pediatrie..."
                      onIonInput={(e) => setSpecialty(e.detail.value ?? '')}
                    />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">{requiredLabel('Telephone', phone.trim().length > 0)}</IonLabel>
                    <IonInput
                      disabled={!editMode}
                      value={phone}
                      placeholder="+509-xxxx-xxxx"
                      onIonInput={(e) => setPhone(maskHaitiPhone(e.detail.value ?? ''))}
                    />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">{requiredLabel('WhatsApp', whatsapp.trim().length > 0)}</IonLabel>
                    <IonInput
                      disabled={!editMode}
                      value={whatsapp}
                      placeholder="+509-xxxx-xxxx"
                      onIonInput={(e) => setWhatsapp(maskHaitiPhone(e.detail.value ?? ''))}
                    />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">{requiredLabel('Adresse', address.trim().length > 0)}</IonLabel>
                    <IonInput disabled={!editMode} value={address} placeholder="Adresse du cabinet" onIonInput={(e) => setAddress(e.detail.value ?? '')} />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">{requiredLabel('Ville', city.trim().length > 0)}</IonLabel>
                    <IonInput disabled={!editMode} value={city} onIonInput={(e) => setCity(e.detail.value ?? '')} />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">{requiredLabel('Departement', department.trim().length > 0)}</IonLabel>
                    <IonInput disabled={!editMode} value={department} onIonInput={(e) => setDepartment(e.detail.value ?? '')} />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">{requiredLabel('Langues', languages.trim().length > 0)}</IonLabel>
                    <IonInput
                      disabled={!editMode}
                      value={languages}
                      placeholder="Francais, Kreyol, English"
                      onIonInput={(e) => setLanguages(e.detail.value ?? '')}
                    />
                  </IonItem>
                </>
              ) : null}
            </div>

            <div style={{ marginTop: '10px', border: '1px solid #dbe7ef', borderRadius: '12px', overflow: 'hidden' }}>
              <IonButton
                expand="block"
                fill="clear"
                color="dark"
                onClick={() => setProfessionalExpanded((prev) => !prev)}
                style={{ margin: 0 }}
              >
                Informations professionnelles{' '}
                {professionalExpanded ? <IonIcon slot="end" icon={chevronUpOutline} /> : <IonIcon slot="end" icon={chevronDownOutline} />}
              </IonButton>
              {professionalExpanded ? (
                <>
                  <IonItem lines="none">
                    <IonLabel>Teleconsultation</IonLabel>
                    <IonToggle
                      disabled={!editMode}
                      checked={teleconsultationAvailable}
                      onIonChange={(e) => setTeleconsultationAvailable(e.detail.checked)}
                    />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">{requiredLabel('Horaires de consultation', consultationHours.trim().length > 0)}</IonLabel>
                    <IonTextarea disabled={!editMode} autoGrow value={consultationHours} onIonInput={(e) => setConsultationHours(e.detail.value ?? '')} />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">{requiredLabel("Annees d'experience", yearsExperience.trim().length > 0)}</IonLabel>
                    <IonInput
                      disabled={!editMode}
                      type="number"
                      value={yearsExperience}
                      onIonInput={(e) => setYearsExperience(e.detail.value ?? '')}
                    />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">{requiredLabel('Frais consultation (plage)', consultationFeeRange.trim().length > 0)}</IonLabel>
                    <IonInput
                      disabled={!editMode}
                      value={consultationFeeRange}
                      placeholder="500 HTG - 1500 HTG"
                      onIonInput={(e) => setConsultationFeeRange(e.detail.value ?? '')}
                    />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Bio (optionel)</IonLabel>
                    <IonTextarea disabled={!editMode} autoGrow value={bio} onIonInput={(e) => setBio(e.detail.value ?? '')} />
                  </IonItem>
                </>
              ) : null}
            </div>

            <div style={{ marginTop: '10px', border: '1px solid #dbe7ef', borderRadius: '12px', overflow: 'hidden' }}>
              <IonButton
                expand="block"
                fill="clear"
                color="dark"
                onClick={() => setVerificationExpanded((prev) => !prev)}
                style={{ margin: 0 }}
              >
                <IonIcon icon={shieldCheckmarkOutline} slot="start" />
                Verification & GPS{' '}
                {verificationExpanded ? <IonIcon slot="end" icon={chevronUpOutline} /> : <IonIcon slot="end" icon={chevronDownOutline} />}
              </IonButton>
              {verificationExpanded ? (
                <>
                  <IonItem lines="none">
                    <IonLabel position="stacked">{requiredLabel('Numero licence', licenseNumber.trim().length > 0)}</IonLabel>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                      <IonInput
                        disabled={!editMode}
                        value={licenseNumber}
                        onIonInput={(e) => setLicenseNumber(e.detail.value ?? '')}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                        <IonText color={licenseVerified ? 'warning' : 'danger'}>
                          {licenseVerified ? 'Verifiee' : 'Non verifiee'}
                        </IonText>
                        <IonIcon
                          icon={licenseVerified ? starOutline : closeCircleOutline}
                          color={licenseVerified ? 'warning' : 'danger'}
                        />
                      </div>
                    </div>
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">{requiredLabel('Latitude', normalizeText(latitude).trim().length > 0)}</IonLabel>
                    <IonInput disabled={!editMode} type="number" value={latitude} placeholder="19.7510" onIonInput={(e) => setLatitude(e.detail.value ?? '')} />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">{requiredLabel('Longitude', normalizeText(longitude).trim().length > 0)}</IonLabel>
                    <IonInput disabled={!editMode} type="number" value={longitude} placeholder="-72.2014" onIonInput={(e) => setLongitude(e.detail.value ?? '')} />
                  </IonItem>
                  {editMode ? (
                    <div style={{ padding: '0 12px 12px' }}>
                      <IonButton size="small" fill="outline" onClick={useCurrentLocation}>
                        <IonIcon icon={locateOutline} slot="start" />
                        Obtenir GPS
                      </IonButton>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>

            {editMode ? (
              <IonButton expand="block" style={{ marginTop: '12px' }} onClick={() => saveProfile().catch(() => undefined)} disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </IonButton>
            ) : null}
          </IonCardContent> : null}
        </IonCard>

        <div className="dashboard-grid dashboard-grid-fab">
          <IonCard
            button={canUseDoctorApp}
            className="surface-card"
            style={{ margin: 0, opacity: canUseDoctorApp ? 1 : 0.65 }}
            onClick={() => {
              if (!canUseDoctorApp) {
                setMessage('Completez le profil a 100% pour acceder aux patients.');
                return;
              }
              ionRouter.push('/doctor/patients', 'forward', 'push');
            }}
          >
            <IonCardContent>
              <div className="quick-icon quick-icon-rose">
                <IonIcon icon={peopleOutline} />
              </div>
              <h3>Patients</h3>
              <p className="muted-note">Voir la liste de vos patients.</p>
            </IonCardContent>
          </IonCard>
          <IonCard
            button={canUseDoctorApp}
            className="surface-card"
            style={{ margin: 0, opacity: canUseDoctorApp ? 1 : 0.65 }}
            onClick={() => {
              if (!canUseDoctorApp) {
                setMessage('Completez le profil a 100% pour acceder aux ordonnances.');
                return;
              }
              ionRouter.push('/doctor/prescriptions', 'forward', 'push');
            }}
          >
            <IonCardContent>
              <div className="quick-icon quick-icon-gold">
                <IonIcon icon={documentTextOutline} />
              </div>
              <h3>Ordonnances</h3>
              <p className="muted-note">Voir toutes vos ordonnances.</p>
            </IonCardContent>
          </IonCard>
          <IonCard
            button
            className="surface-card"
            style={{ margin: 0 }}
            onClick={() => {
              ionRouter.push('/doctor/doctors', 'forward', 'push');
            }}
          >
            <IonCardContent>
              <div className="quick-icon quick-icon-blue">
                <IonIcon icon={medkitOutline} />
              </div>
              <h3>Annuaire medecins</h3>
              <p className="muted-note">Voir tous les medecins approuves.</p>
            </IonCardContent>
          </IonCard>
          <IonCard
            button
            className="surface-card"
            style={{ margin: 0 }}
            onClick={() => {
              ionRouter.push('/doctor/pharmacies', 'forward', 'push');
            }}
          >
            <IonCardContent>
              <div className="quick-icon quick-icon-green">
                <IonIcon icon={storefrontOutline} />
              </div>
              <h3>Annuaire pharmacies</h3>
              <p className="muted-note">Voir les pharmacies disponibles.</p>
            </IonCardContent>
          </IonCard>
        </div>

      </IonContent>
    </IonPage>
  );
};

export default DoctorDashboard;

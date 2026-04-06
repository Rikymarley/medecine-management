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
  IonSelect,
  IonSelectOption,
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
  imageOutline,
  storefrontOutline,
  starOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api } from '../services/api';
import { useAuth } from '../state/AuthState';
import { maskHaitiPhone } from '../utils/phoneMask';
import { getPasswordStrength } from '../utils/passwordStrength';
import {
  buildDoctorSpecialty,
  DOCTOR_SPECIALTY_OPTIONS,
  OTHER_SPECIALTY_VALUE,
  parseDoctorSpecialty
} from '../constants/doctorSpecialties';

const DoctorDashboard: React.FC = () => {
  const ionRouter = useIonRouter();
  const { logout, token, user } = useAuth();

  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [specialtyChoice, setSpecialtyChoice] = useState('');
  const [specialtyOther, setSpecialtyOther] = useState('');
  const [specialtyOptions, setSpecialtyOptions] = useState<string[]>([...DOCTOR_SPECIALTY_OPTIONS]);
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
  const [recoveryWhatsapp, setRecoveryWhatsapp] = useState('');
  const [bio, setBio] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [profileBannerUrl, setProfileBannerUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileCardExpanded, setProfileCardExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [contactExpanded, setContactExpanded] = useState(false);
  const [professionalExpanded, setProfessionalExpanded] = useState(false);
  const [verificationExpanded, setVerificationExpanded] = useState(false);
  const [passwordExpanded, setPasswordExpanded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
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
  const specialty = useMemo(
    () => buildDoctorSpecialty(specialtyChoice, specialtyOther),
    [specialtyChoice, specialtyOther]
  );
  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

  useEffect(() => {
    api
      .getDoctorSpecialties()
      .then((rows) => {
        const names = rows.map((row) => row.name).filter(Boolean);
        if (names.length > 0) {
          setSpecialtyOptions(names);
        }
      })
      .catch(() => undefined);
  }, []);

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
        const parsedSpecialty = parseDoctorSpecialty(normalizeText(me.specialty), specialtyOptions);
        setSpecialtyChoice(parsedSpecialty.selected);
        setSpecialtyOther(parsedSpecialty.custom);
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
        setRecoveryWhatsapp(maskHaitiPhone(normalizeText((me as any).recovery_whatsapp)));
        setBio(normalizeText(me.bio));
        setProfilePhotoUrl(normalizeText((me as any).profile_photo_url));
        setProfileBannerUrl(normalizeText((me as any).profile_banner_url));
      })
      .catch(() => {
        setPhone(maskHaitiPhone(normalizeText(user?.phone)));
        setAddress(normalizeText(user?.address));
        setLatitude(normalizeText(user?.latitude));
        setLongitude(normalizeText(user?.longitude));
        const parsedSpecialty = parseDoctorSpecialty(normalizeText(user?.specialty), specialtyOptions);
        setSpecialtyChoice(parsedSpecialty.selected);
        setSpecialtyOther(parsedSpecialty.custom);
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
        setRecoveryWhatsapp(maskHaitiPhone(normalizeText((user as any)?.recovery_whatsapp)));
        setBio(normalizeText(user?.bio));
        setProfilePhotoUrl(normalizeText((user as any)?.profile_photo_url));
        setProfileBannerUrl(normalizeText((user as any)?.profile_banner_url));
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
    specialtyOptions,
    user?.teleconsultation_available,
    user?.whatsapp,
    (user as any)?.recovery_whatsapp,
    user?.years_experience,
    (user as any)?.profile_photo_url,
    (user as any)?.profile_banner_url
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
        recovery_whatsapp: recoveryWhatsapp.trim() || null,
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

  const uploadDoctorPhoto = async (file: File) => {
    if (!token) return;
    try {
      setUploadingPhoto(true);
      setMessage(null);
      const updated = await api.uploadMyDoctorProfilePhoto(token, file);
      setProfilePhotoUrl(normalizeText((updated as any).profile_photo_url));
      setMessage('Photo de profil mise a jour.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Echec upload photo.');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  const uploadDoctorBanner = async (file: File) => {
    if (!token) return;
    try {
      setUploadingBanner(true);
      setMessage(null);
      const updated = await api.uploadMyDoctorBanner(token, file);
      setProfileBannerUrl(normalizeText((updated as any).profile_banner_url));
      setMessage('Banniere mise a jour.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Echec upload banniere.');
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) {
        bannerInputRef.current.value = '';
      }
    }
  };

  const savePassword = async () => {
    if (!token) {
      return;
    }
    if (!currentPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
      setMessage('Veuillez renseigner tous les champs mot de passe.');
      return;
    }
    setPasswordSaving(true);
    setMessage(null);
    try {
      const response = await api.changePassword(token, {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmNewPassword
      });
      setMessage(response.message || 'Mot de passe mis a jour.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordExpanded(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Echec mise a jour mot de passe.');
    } finally {
      setPasswordSaving(false);
    }
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
            <div
              style={{
                width: '100%',
                height: '120px',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '10px',
                border: '1px solid #dbe7ef',
                background: profileBannerUrl
                  ? `url(${profileBannerUrl}) center/cover no-repeat`
                  : 'linear-gradient(120deg, #dcfce7 0%, #dbeafe 100%)'
              }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr auto', gap: '10px', alignItems: 'center' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid #dbe7ef',
                  background: '#dcfce7'
                }}
              >
                {profilePhotoUrl ? (
                  <img
                    src={profilePhotoUrl}
                    alt="Photo profil"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                    <IonIcon icon={personCircleOutline} style={{ fontSize: '32px', color: '#15803d' }} />
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{user?.name ?? 'Profil medecin'}</div>
                <div style={{ color: '#64748b', fontSize: '0.95rem' }}>{specialty || 'Specialite non renseignee'}</div>
              </div>
              <IonButton size="small" fill={editMode ? 'solid' : 'outline'} onClick={() => setEditMode((prev) => !prev)}>
                {editMode ? 'Lecture' : 'Modifier'}
              </IonButton>
            </div>
            {editMode ? (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadDoctorPhoto(file);
                  }}
                />
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadDoctorBanner(file);
                  }}
                />
                <IonButton size="small" fill="outline" disabled={uploadingPhoto} onClick={() => photoInputRef.current?.click()}>
                  <IonIcon icon={personCircleOutline} slot="start" />
                  {uploadingPhoto ? 'Upload...' : 'Photo profil'}
                </IonButton>
                <IonButton size="small" fill="outline" disabled={uploadingBanner} onClick={() => bannerInputRef.current?.click()}>
                  <IonIcon icon={imageOutline} slot="start" />
                  {uploadingBanner ? 'Upload...' : 'Banniere'}
                </IonButton>
              </div>
            ) : null}

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
                    <IonSelect
                      disabled={!editMode}
                      value={specialtyChoice}
                      placeholder="Selectionner"
                      onIonChange={(e) => setSpecialtyChoice(e.detail.value)}
                    >
                      {specialtyOptions.map((option) => (
                        <IonSelectOption key={option} value={option}>
                          {option}
                        </IonSelectOption>
                      ))}
                      <IonSelectOption value={OTHER_SPECIALTY_VALUE}>Autre (preciser)</IonSelectOption>
                    </IonSelect>
                  </IonItem>
                  {specialtyChoice === OTHER_SPECIALTY_VALUE ? (
                    <IonItem lines="none">
                      <IonLabel position="stacked">Autre specialite</IonLabel>
                      <IonInput
                        disabled={!editMode}
                        value={specialtyOther}
                        placeholder="Ex: Rhumatologie"
                        onIonInput={(e) => setSpecialtyOther(e.detail.value ?? '')}
                      />
                    </IonItem>
                  ) : null}
                  <IonItem lines="none">
                    <IonLabel position="stacked">{requiredLabel('Telephone', phone.trim().length > 0)}</IonLabel>
                    <IonInput
                      disabled={!editMode}
                      value={phone}
                      placeholder="+509-xxxx-xxxx"
                      maxlength={14}
                      inputmode="tel"
                      onIonInput={(e) => setPhone(maskHaitiPhone(e.detail.value ?? ''))}
                    />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">{requiredLabel('WhatsApp', whatsapp.trim().length > 0)}</IonLabel>
                    <IonInput
                      disabled={!editMode}
                      value={whatsapp}
                      placeholder="+509-xxxx-xxxx"
                      maxlength={14}
                      inputmode="tel"
                      onIonInput={(e) => setWhatsapp(maskHaitiPhone(e.detail.value ?? ''))}
                    />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">WhatsApp de recuperation</IonLabel>
                    <IonInput
                      disabled={!editMode}
                      value={recoveryWhatsapp}
                      placeholder="+509-xxxx-xxxx"
                      maxlength={14}
                      inputmode="tel"
                      onIonInput={(e) => setRecoveryWhatsapp(maskHaitiPhone(e.detail.value ?? ''))}
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

            <div style={{ marginTop: '10px', border: '1px solid #dbe7ef', borderRadius: '12px', overflow: 'hidden' }}>
              <IonButton
                expand="block"
                fill="clear"
                color="dark"
                onClick={() => setPasswordExpanded((prev) => !prev)}
                style={{ margin: 0 }}
              >
                Reinitialiser mot de passe{' '}
                {passwordExpanded ? <IonIcon slot="end" icon={chevronUpOutline} /> : <IonIcon slot="end" icon={chevronDownOutline} />}
              </IonButton>
              {passwordExpanded ? (
                <>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Mot de passe actuel</IonLabel>
                    <IonInput
                      type="password"
                      value={currentPassword}
                      onIonInput={(e) => setCurrentPassword(e.detail.value ?? '')}
                    />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Nouveau mot de passe</IonLabel>
                    <IonInput type="password" value={newPassword} onIonInput={(e) => setNewPassword(e.detail.value ?? '')} />
                  </IonItem>
                  {newPassword ? (
                    <div style={{ padding: '0 12px 8px' }}>
                      <IonText color={passwordStrength.color}>Force: {passwordStrength.label}</IonText>
                    </div>
                  ) : null}
                  <IonItem lines="none">
                    <IonLabel position="stacked">Confirmer nouveau mot de passe</IonLabel>
                    <IonInput
                      type="password"
                      value={confirmNewPassword}
                      onIonInput={(e) => setConfirmNewPassword(e.detail.value ?? '')}
                    />
                  </IonItem>
                  <div style={{ padding: '0 12px 12px' }}>
                    <IonButton expand="block" onClick={() => savePassword().catch(() => undefined)} disabled={passwordSaving}>
                      {passwordSaving ? 'Mise a jour...' : 'Mettre a jour le mot de passe'}
                    </IonButton>
                  </div>
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

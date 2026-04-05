import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
  useIonRouter
} from '@ionic/react';
import {
  callOutline,
  chevronDownOutline,
  chevronUpOutline,
  createOutline,
  documentTextOutline,
  medkitOutline,
  peopleOutline,
  personCircleOutline,
  pulseOutline,
  shieldCheckmarkOutline,
  storefrontOutline
} from 'ionicons/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api } from '../services/api';
import { useAuth } from '../state/AuthState';
import { maskHaitiPhone } from '../utils/phoneMask';

const PatientDashboard: React.FC = () => {
  const ionRouter = useIonRouter();
  const { logout, token, user } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [ninu, setNinu] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'' | 'male' | 'female'>('');
  const [allergies, setAllergies] = useState('');
  const [chronicDiseases, setChronicDiseases] = useState('');
  const [bloodType, setBloodType] = useState<
    '' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
  >('');
  const [emergencyNotes, setEmergencyNotes] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [surgicalHistory, setSurgicalHistory] = useState('');
  const [vaccinationUpToDate, setVaccinationUpToDate] = useState<'' | 'yes' | 'no'>('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [profileCardExpanded, setProfileCardExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [contactExpanded, setContactExpanded] = useState(false);
  const [personalExpanded, setPersonalExpanded] = useState(false);
  const [emergencyExpanded, setEmergencyExpanded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const profileCacheKey = user ? `patient-profile-cache-${user.id}` : null;

  const normalizeText = (value: unknown) => (value === null || value === undefined ? '' : String(value));
  const normalizeDate = (value: unknown) => {
    const raw = normalizeText(value).trim();
    if (!raw) return '';
    return raw.includes('T') ? raw.split('T')[0] : raw;
  };

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline && editMode) {
      setEditMode(false);
      setMessage('Hors ligne: modification du profil desactivee.');
    }
  }, [editMode, isOnline]);

  useEffect(() => {
    if (!token) {
      return;
    }

    api
      .me(token)
      .then((me) => {
        if (profileCacheKey) {
          localStorage.setItem(profileCacheKey, JSON.stringify(me));
        }
        setName(normalizeText(me.name));
        setPhone(maskHaitiPhone(normalizeText(me.phone)));
        setNinu(normalizeText(me.ninu));
        setWhatsapp(maskHaitiPhone(normalizeText(me.whatsapp)));
        setAddress(normalizeText(me.address));
        setDateOfBirth(normalizeDate(me.date_of_birth));
        setGender((me.gender as '' | 'male' | 'female' | null) ?? '');
        setAllergies(normalizeText(me.allergies));
        setChronicDiseases(normalizeText(me.chronic_diseases));
        setBloodType((me.blood_type as '' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null) ?? '');
        setEmergencyNotes(normalizeText(me.emergency_notes));
        setWeightKg(me.weight_kg === null || me.weight_kg === undefined ? '' : String(me.weight_kg));
        setHeightCm(me.height_cm === null || me.height_cm === undefined ? '' : String(me.height_cm));
        setSurgicalHistory(normalizeText(me.surgical_history));
        setVaccinationUpToDate(
          me.vaccination_up_to_date === null || me.vaccination_up_to_date === undefined
            ? ''
            : me.vaccination_up_to_date
            ? 'yes'
            : 'no'
        );
        setProfilePhotoUrl(normalizeText((me as any).profile_photo_url));
      })
      .catch(() => {
        if (profileCacheKey) {
          const cached = localStorage.getItem(profileCacheKey);
          if (cached) {
            try {
              const me = JSON.parse(cached) as typeof user;
              setName(normalizeText(me?.name));
              setPhone(maskHaitiPhone(normalizeText(me?.phone)));
              setNinu(normalizeText((me as any)?.ninu));
              setWhatsapp(maskHaitiPhone(normalizeText((me as any)?.whatsapp)));
              setAddress(normalizeText((me as any)?.address));
              setDateOfBirth(normalizeDate((me as any)?.date_of_birth));
              setGender(((me as any)?.gender as '' | 'male' | 'female' | null) ?? '');
              setAllergies(normalizeText((me as any)?.allergies));
              setChronicDiseases(normalizeText((me as any)?.chronic_diseases));
              setBloodType(((me as any)?.blood_type as '' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null) ?? '');
              setEmergencyNotes(normalizeText((me as any)?.emergency_notes));
              setWeightKg((me as any)?.weight_kg === null || (me as any)?.weight_kg === undefined ? '' : String((me as any)?.weight_kg));
              setHeightCm((me as any)?.height_cm === null || (me as any)?.height_cm === undefined ? '' : String((me as any)?.height_cm));
              setSurgicalHistory(normalizeText((me as any)?.surgical_history));
              setVaccinationUpToDate(
                (me as any)?.vaccination_up_to_date === null || (me as any)?.vaccination_up_to_date === undefined
                  ? ''
                  : (me as any)?.vaccination_up_to_date
                  ? 'yes'
                  : 'no'
              );
              setProfilePhotoUrl(normalizeText((me as any)?.profile_photo_url));
              setMessage('Hors ligne: profil local charge.');
              return;
            } catch {
              localStorage.removeItem(profileCacheKey);
            }
          }
        }
        setName(normalizeText(user?.name));
        setPhone(maskHaitiPhone(normalizeText(user?.phone)));
        setNinu(normalizeText(user?.ninu));
        setWhatsapp(maskHaitiPhone(normalizeText(user?.whatsapp)));
        setAddress(normalizeText(user?.address));
        setDateOfBirth(normalizeDate(user?.date_of_birth));
        setGender((user?.gender as '' | 'male' | 'female' | null) ?? '');
        setAllergies(normalizeText(user?.allergies));
        setChronicDiseases(normalizeText(user?.chronic_diseases));
        setBloodType((user?.blood_type as '' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null) ?? '');
        setEmergencyNotes(normalizeText(user?.emergency_notes));
        setWeightKg(user?.weight_kg === null || user?.weight_kg === undefined ? '' : String(user?.weight_kg));
        setHeightCm(user?.height_cm === null || user?.height_cm === undefined ? '' : String(user?.height_cm));
        setSurgicalHistory(normalizeText(user?.surgical_history));
        setVaccinationUpToDate(
          user?.vaccination_up_to_date === null || user?.vaccination_up_to_date === undefined
            ? ''
            : user?.vaccination_up_to_date
            ? 'yes'
            : 'no'
        );
        setProfilePhotoUrl(normalizeText((user as any)?.profile_photo_url));
      });
  }, [
    profileCacheKey,
    token,
    user?.address,
    user?.allergies,
    user?.blood_type,
    user?.chronic_diseases,
    user?.date_of_birth,
    user?.emergency_notes,
    user?.height_cm,
    user?.gender,
    user?.name,
    user?.ninu,
    user?.phone,
    user?.surgical_history,
    user?.vaccination_up_to_date,
    user?.weight_kg,
    user?.whatsapp,
    (user as any)?.profile_photo_url
  ]);

  const profileMissingFields = useMemo(() => {
    const missing: string[] = [];
    if (!name.trim()) missing.push('nom');
    if (!phone.trim()) missing.push('telephone');
    if (!address.trim()) missing.push('adresse');
    return missing;
  }, [address, name, phone]);
  const profileIncomplete = profileMissingFields.length > 0;
  const profileCompletion = useMemo(() => {
    const checks = [
      name.trim(),
      phone.trim(),
      address.trim(),
      ninu.trim(),
      whatsapp.trim(),
      dateOfBirth.trim(),
      gender,
      allergies.trim(),
      chronicDiseases.trim(),
      bloodType,
      emergencyNotes.trim(),
      weightKg.trim(),
      heightCm.trim(),
      surgicalHistory.trim(),
      vaccinationUpToDate
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [address, allergies, bloodType, chronicDiseases, dateOfBirth, emergencyNotes, gender, heightCm, name, ninu, phone, surgicalHistory, vaccinationUpToDate, weightKg, whatsapp]);

  const computedAge = useMemo(() => {
    if (!dateOfBirth) return null;
    const dob = new Date(`${dateOfBirth}T00:00:00`);
    if (Number.isNaN(dob.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
      age -= 1;
    }
    return age >= 0 ? age : null;
  }, [dateOfBirth]);

  const saveProfile = async () => {
    if (!token) {
      return;
    }
    if (!isOnline) {
      setMessage('Hors ligne: vous pouvez consulter, mais pas modifier le profil.');
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await api.updatePatientProfile(token, {
        name: name.trim() || user?.name || '',
        phone: phone.trim() || null,
        ninu: ninu.trim() || null,
        whatsapp: whatsapp.trim() || null,
        address: address.trim() || null,
        date_of_birth: dateOfBirth.trim() || null,
        age: computedAge,
        gender: gender || null,
        allergies: allergies.trim() || null,
        chronic_diseases: chronicDiseases.trim() || null,
        blood_type: bloodType || null,
        emergency_notes: emergencyNotes.trim() || null,
        weight_kg: weightKg.trim() ? Number(weightKg) : null,
        height_cm: heightCm.trim() ? Number(heightCm) : null,
        surgical_history: surgicalHistory.trim() || null,
        vaccination_up_to_date: vaccinationUpToDate === '' ? null : vaccinationUpToDate === 'yes'
      });
      setMessage('Profil mis a jour.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Echec de mise a jour.');
    } finally {
      setSaving(false);
    }
  };

  const uploadPatientPhoto = async (file: File) => {
    if (!token) return;
    if (!isOnline) {
      setMessage('Hors ligne: impossible de televerser une photo.');
      return;
    }
    setUploadingPhoto(true);
    setMessage(null);
    try {
      const updated = await api.uploadMyPatientProfilePhoto(token, file);
      setProfilePhotoUrl(normalizeText((updated as any).profile_photo_url));
      if (profileCacheKey) {
        localStorage.setItem(profileCacheKey, JSON.stringify(updated));
      }
      setMessage('Photo de profil mise a jour.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Echec de l'upload photo.");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
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
        <IonCard className="surface-card">
          <IonCardContent>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <IonBadge color={isOnline ? 'success' : 'warning'}>
                {isOnline ? 'En ligne' : 'Hors ligne'}
              </IonBadge>
            </div>
          </IonCardContent>
        </IonCard>
        <IonCard className="hero-card">
          <IonCardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <IonCardTitle>Profil patient</IonCardTitle>
              <IonButton fill="clear" size="small" onClick={() => setProfileCardExpanded((prev) => !prev)}>
                <IonIcon icon={profileCardExpanded ? chevronUpOutline : chevronDownOutline} />
              </IonButton>
            </div>
          </IonCardHeader>
          {profileCardExpanded ? <IonCardContent>
            <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr auto', gap: '10px', alignItems: 'center' }}>
              <div
                style={{
                  position: 'relative',
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid #dbe7ef',
                  background: '#dbeafe',
                  cursor: !isOnline || uploadingPhoto ? 'not-allowed' : 'pointer',
                  opacity: !isOnline || uploadingPhoto ? 0.7 : 1
                }}
                onClick={() => {
                  if (!isOnline || uploadingPhoto) return;
                  photoInputRef.current?.click();
                }}
              >
                {profilePhotoUrl ? (
                  <img src={profilePhotoUrl} alt="Photo patient" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
                    <IonIcon icon={personCircleOutline} style={{ fontSize: '32px', color: '#1d4ed8' }} />
                  </div>
                )}
                <div
                  style={{
                    position: 'absolute',
                    right: '2px',
                    bottom: '2px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '999px',
                    background: '#0ea5e9',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    border: '1px solid #fff'
                  }}
                >
                  <IonIcon icon={createOutline} style={{ fontSize: '12px' }} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{name || user?.name || 'Profil patient'}</div>
                <div style={{ color: '#64748b', fontSize: '0.95rem' }}>{phone || 'Telephone non renseigne'}</div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadPatientPhoto(file);
                  }}
                />
                {uploadingPhoto ? <div style={{ marginTop: '6px', fontSize: '0.85rem', color: '#64748b' }}>Upload...</div> : null}
              </div>
              <IonButton
                size="small"
                fill={editMode ? 'solid' : 'outline'}
                color={isOnline ? 'primary' : 'warning'}
                onClick={() => setEditMode((prev) => !prev)}
                disabled={!isOnline}
              >
                {editMode ? 'Lecture' : 'Modifier'}
              </IonButton>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
              <IonBadge color={profileIncomplete ? 'warning' : 'success'}>
                Completion du profil : {profileCompletion}%
              </IonBadge>
            </div>
            {profileIncomplete ? (
              <IonText color="warning">
                <p>Champs manquants: {profileMissingFields.join(', ')}.</p>
              </IonText>
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
                    <IonLabel position="stacked" style={{ fontSize: "20px", fontWeight: "bold" }}>Nom</IonLabel>
                    <IonInput disabled={!editMode} value={name} onIonInput={(e) => setName(e.detail.value ?? '')} />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked" style={{ fontSize: "20px", fontWeight: "bold" }}>Telephone</IonLabel>
                    <IonInput disabled={!editMode} value={phone} onIonInput={(e) => setPhone(maskHaitiPhone(e.detail.value ?? ''))} />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked" style={{ fontSize: "20px", fontWeight: "bold" }}>WhatsApp</IonLabel>
                    <IonInput
                      disabled={!editMode}
                      value={whatsapp}
                      onIonInput={(e) => setWhatsapp(maskHaitiPhone(e.detail.value ?? ''))}
                    />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked" style={{ fontSize: "20px", fontWeight: "bold" }}>NINU</IonLabel>
                    <IonInput disabled={!editMode} value={ninu} onIonInput={(e) => setNinu(e.detail.value ?? '')} />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked" style={{ fontSize: "20px", fontWeight: "bold" }}>Adresse</IonLabel>
                    <IonInput disabled={!editMode} value={address} onIonInput={(e) => setAddress(e.detail.value ?? '')} />
                  </IonItem>
                </>
              ) : null}
            </div>

            <div style={{ marginTop: '10px', border: '1px solid #dbe7ef', borderRadius: '12px', overflow: 'hidden' }}>
              <IonButton
                expand="block"
                fill="clear"
                color="dark"
                onClick={() => setPersonalExpanded((prev) => !prev)}
                style={{ margin: 0 }}
              >
                Informations personnelles{' '}
                {personalExpanded ? <IonIcon slot="end" icon={chevronUpOutline} /> : <IonIcon slot="end" icon={chevronDownOutline} />}
              </IonButton>
              {personalExpanded ? (
                <>
                  <IonItem lines="none">
                    <IonLabel position="stacked" style={{ fontSize: "20px", fontWeight: "bold" }}>Date de naissance</IonLabel>
                    <IonInput
                      disabled={!editMode}
                      type="date"
                      value={dateOfBirth}
                      onIonInput={(e) => setDateOfBirth(e.detail.value ?? '')}
                    />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked" style={{ fontSize: "20px", fontWeight: "bold" }}>Age (calcule)</IonLabel>
                    <IonInput disabled value={computedAge === null ? '' : String(computedAge)} />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked" style={{ fontSize: "20px", fontWeight: "bold" }}>Genre</IonLabel>
                    <IonSelect
                      disabled={!editMode}
                      value={gender}
                      onIonChange={(e) => setGender((e.detail.value as '' | 'male' | 'female') ?? '')}
                    >
                      <IonSelectOption value="">Non precise</IonSelectOption>
                      <IonSelectOption value="male">M</IonSelectOption>
                      <IonSelectOption value="female">F</IonSelectOption>
                    </IonSelect>
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked" style={{ fontSize: "20px", fontWeight: "bold" }}>Allergies</IonLabel>
                    <IonTextarea
                      disabled={!editMode}
                      autoGrow
                      value={allergies}
                      onIonInput={(e) => setAllergies(e.detail.value ?? '')}
                    />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked" style={{ fontSize: "20px", fontWeight: "bold" }}>Poids (kg)</IonLabel>
                    <IonInput
                      disabled={!editMode}
                      type="number"
                      inputmode="decimal"
                      step="0.1"
                      value={weightKg}
                      onIonInput={(e) => setWeightKg(e.detail.value ?? '')}
                    />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked" style={{ fontSize: "20px", fontWeight: "bold" }}>Taille (cm)</IonLabel>
                    <IonInput
                      disabled={!editMode}
                      type="number"
                      inputmode="decimal"
                      step="0.1"
                      value={heightCm}
                      onIonInput={(e) => setHeightCm(e.detail.value ?? '')}
                    />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked" style={{ fontSize: "20px", fontWeight: "bold" }}>Maladies chroniques</IonLabel>
                    <IonTextarea
                      disabled={!editMode}
                      autoGrow
                      value={chronicDiseases}
                      onIonInput={(e) => setChronicDiseases(e.detail.value ?? '')}
                    />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked" style={{ fontSize: "20px", fontWeight: "bold" }}>Groupe sanguin</IonLabel>
                    <IonSelect
                      disabled={!editMode}
                      value={bloodType}
                      onIonChange={(e) =>
                        setBloodType((e.detail.value as '' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-') ?? '')
                      }
                    >
                      <IonSelectOption value="">Non precise</IonSelectOption>
                      <IonSelectOption value="A+">A+</IonSelectOption>
                      <IonSelectOption value="A-">A-</IonSelectOption>
                      <IonSelectOption value="B+">B+</IonSelectOption>
                      <IonSelectOption value="B-">B-</IonSelectOption>
                      <IonSelectOption value="AB+">AB+</IonSelectOption>
                      <IonSelectOption value="AB-">AB-</IonSelectOption>
                      <IonSelectOption value="O+">O+</IonSelectOption>
                      <IonSelectOption value="O-">O-</IonSelectOption>
                    </IonSelect>
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked" style={{ fontSize: "20px", fontWeight: "bold" }}>Antecedents chirurgicaux</IonLabel>
                    <IonTextarea
                      disabled={!editMode}
                      autoGrow
                      value={surgicalHistory}
                      onIonInput={(e) => setSurgicalHistory(e.detail.value ?? '')}
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
                onClick={() => setEmergencyExpanded((prev) => !prev)}
                style={{ margin: 0 }}
              >
                <IonIcon icon={shieldCheckmarkOutline} slot="start" />
                Urgence {emergencyExpanded ? <IonIcon slot="end" icon={chevronUpOutline} /> : <IonIcon slot="end" icon={chevronDownOutline} />}
              </IonButton>
              {emergencyExpanded ? (
                <>
                  <IonItem lines="none">
                    <IonLabel position="stacked" style={{ fontSize: "20px", fontWeight: "bold" }}>Notes d'urgence</IonLabel>
                    <IonTextarea
                      disabled={!editMode}
                      autoGrow
                      value={emergencyNotes}
                      onIonInput={(e) => setEmergencyNotes(e.detail.value ?? '')}
                    />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked" style={{ fontSize: "20px", fontWeight: "bold" }}>Carnet de vaccination a jour</IonLabel>
                    <IonSelect
                      disabled={!editMode}
                      value={vaccinationUpToDate}
                      onIonChange={(e) => setVaccinationUpToDate((e.detail.value as '' | 'yes' | 'no') ?? '')}
                    >
                      <IonSelectOption value="">Non precise</IonSelectOption>
                      <IonSelectOption value="yes">Oui</IonSelectOption>
                      <IonSelectOption value="no">Non</IonSelectOption>
                    </IonSelect>
                  </IonItem>
                  <div style={{ padding: '0 12px 12px' }}>
                    <IonButton
                      expand="block"
                      fill="outline"
                      onClick={() => ionRouter.push('/patient/emergency-contacts', 'forward', 'push')}
                    >
                      Voir contacts d'urgence
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

        <div className="dashboard-grid">
          <IonCard
            button
            className="surface-card"
            style={{ margin: 0 }}
            onClick={() => ionRouter.push('/patient/doctors', 'forward', 'push')}
          >
            <IonCardContent>
              <div className="quick-icon quick-icon-green">
                <IonIcon icon={medkitOutline} />
              </div>
              <h3>Medecins</h3>
              <p className="muted-note">Voir la liste de vos medecins.</p>
            </IonCardContent>
          </IonCard>
          <IonCard
            button
            className="surface-card"
            style={{ margin: 0 }}
            onClick={() => ionRouter.push('/patient/pharmacies', 'forward', 'push')}
          >
            <IonCardContent>
              <div className="quick-icon quick-icon-blue">
                <IonIcon icon={storefrontOutline} />
              </div>
              <h3>Pharmacies</h3>
              <p className="muted-note">Voir les pharmacies proches.</p>
            </IonCardContent>
          </IonCard>
          <IonCard
            button
            className="surface-card"
            style={{ margin: 0 }}
            onClick={() => ionRouter.push('/patient/prescriptions', 'forward', 'push')}
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
            onClick={() => ionRouter.push('/patient/emergency-contacts', 'forward', 'push')}
          >
            <IonCardContent>
              <div className="quick-icon quick-icon-blue">
                <IonIcon icon={callOutline} />
              </div>
              <h3>Urgence</h3>
              <p className="muted-note">Gerer vos contacts d'urgence.</p>
            </IonCardContent>
          </IonCard>
          <IonCard
            button
            className="surface-card"
            style={{ margin: 0 }}
            onClick={() => ionRouter.push('/patient/medical-history', 'forward', 'push')}
          >
            <IonCardContent>
              <div className="quick-icon quick-icon-gold">
                <IonIcon icon={pulseOutline} />
              </div>
              <h3>Historique</h3>
              <p className="muted-note">Gerer votre historique medical.</p>
            </IonCardContent>
          </IonCard>
          <IonCard
            button
            className="surface-card"
            style={{ margin: 0 }}
            onClick={() => ionRouter.push('/patient/family-members', 'forward', 'push')}
          >
            <IonCardContent>
              <div className="quick-icon quick-icon-rose">
                <IonIcon icon={peopleOutline} />
              </div>
              <h3>Famille</h3>
              <p className="muted-note">Ajouter et gerer vos proches.</p>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PatientDashboard;

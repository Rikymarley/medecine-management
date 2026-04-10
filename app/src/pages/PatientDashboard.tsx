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
  addCircleOutline,
  alarmOutline,
  beaker,
  businessOutline,
  calendarOutline,
  callOutline,
  chevronDownOutline,
  chevronUpOutline,
  createOutline,
  documentAttachOutline,
  documentTextOutline,
  folderOutline,
  medkitOutline,
  peopleOutline,
  personCircleOutline,
  pulseOutline,
  walkOutline,
  shieldCheckmarkOutline,
  storefrontOutline
} from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiUser } from '../services/api';
import { useAuth } from '../state/AuthState';
import { maskHaitiPhone } from '../utils/phoneMask';
import { getPasswordStrength } from '../utils/passwordStrength';

const PatientDashboard: React.FC = () => {
  const ionRouter = useIonRouter();
  const { logout, token, user } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [ninu, setNinu] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [recoveryWhatsapp, setRecoveryWhatsapp] = useState('');
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
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingIdDocument, setUploadingIdDocument] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [idDocumentUrl, setIdDocumentUrl] = useState('');
  const [profileCardExpanded, setProfileCardExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [contactExpanded, setContactExpanded] = useState(false);
  const [personalExpanded, setPersonalExpanded] = useState(false);
  const [emergencyExpanded, setEmergencyExpanded] = useState(false);
  const [passwordExpanded, setPasswordExpanded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const idDocumentInputRef = useRef<HTMLInputElement | null>(null);
  const profileCacheKey = user ? `patient-profile-cache-${user.id}` : null;

  const normalizeText = useCallback((value: unknown) => (value === null || value === undefined ? '' : String(value)), []);
  const normalizeDate = useCallback((value: unknown) => {
    const raw = normalizeText(value).trim();
    if (!raw) return '';
    return raw.includes('T') ? raw.split('T')[0] : raw;
  }, [normalizeText]);

  const applyProfile = useCallback((profile: Partial<ApiUser> | null | undefined) => {
    if (!profile) {
      return;
    }
    setName(normalizeText(profile.name));
    setPhone(maskHaitiPhone(normalizeText(profile.phone)));
    setNinu(normalizeText(profile.ninu));
    setWhatsapp(maskHaitiPhone(normalizeText(profile.whatsapp)));
    setRecoveryWhatsapp(maskHaitiPhone(normalizeText(profile.recovery_whatsapp)));
    setAddress(normalizeText(profile.address));
    setDateOfBirth(normalizeDate(profile.date_of_birth));
    setGender((profile.gender as '' | 'male' | 'female' | null) ?? '');
    setAllergies(normalizeText(profile.allergies));
    setChronicDiseases(normalizeText(profile.chronic_diseases));
    setBloodType((profile.blood_type as '' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null) ?? '');
    setEmergencyNotes(normalizeText(profile.emergency_notes));
    setWeightKg(profile.weight_kg === null || profile.weight_kg === undefined ? '' : String(profile.weight_kg));
    setHeightCm(profile.height_cm === null || profile.height_cm === undefined ? '' : String(profile.height_cm));
    setSurgicalHistory(normalizeText(profile.surgical_history));
    setVaccinationUpToDate(
      profile.vaccination_up_to_date === null || profile.vaccination_up_to_date === undefined
        ? ''
        : profile.vaccination_up_to_date
        ? 'yes'
        : 'no'
    );
    setProfilePhotoUrl(normalizeText(profile.profile_photo_url));
    setIdDocumentUrl(normalizeText(profile.id_document_url));
  }, [normalizeDate, normalizeText]);

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
        applyProfile(me);
      })
      .catch(() => {
        if (profileCacheKey) {
          const cached = localStorage.getItem(profileCacheKey);
          if (cached) {
            try {
              const me = JSON.parse(cached) as ApiUser;
              applyProfile(me);
              setMessage('Hors ligne: profil local charge.');
              return;
            } catch {
              localStorage.removeItem(profileCacheKey);
            }
          }
        }
        applyProfile(user);
      });
  }, [
    applyProfile,
    profileCacheKey,
    token,
    user,
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
    user?.recovery_whatsapp,
    user?.profile_photo_url,
    user?.id_document_url
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
      recoveryWhatsapp.trim(),
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
  }, [address, allergies, bloodType, chronicDiseases, dateOfBirth, emergencyNotes, gender, heightCm, name, ninu, phone, recoveryWhatsapp, surgicalHistory, vaccinationUpToDate, weightKg, whatsapp]);

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
  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

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
        recovery_whatsapp: recoveryWhatsapp.trim() || null,
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
      setProfilePhotoUrl(normalizeText(updated.profile_photo_url));
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

  const uploadPatientIdDocument = async (file: File) => {
    if (!token) return;
    if (!isOnline) {
      setMessage("Hors ligne: impossible de televerser la piece d'identite.");
      return;
    }
    setUploadingIdDocument(true);
    setMessage(null);
    try {
      const updated = await api.uploadMyPatientIdDocument(token, file);
      setIdDocumentUrl(normalizeText(updated.id_document_url));
      if (profileCacheKey) {
        localStorage.setItem(profileCacheKey, JSON.stringify(updated));
      }
      setMessage("Piece d'identite mise a jour.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Echec de l'upload de la piece d'identite.");
    } finally {
      setUploadingIdDocument(false);
      if (idDocumentInputRef.current) {
        idDocumentInputRef.current.value = '';
      }
    }
  };

  const removePatientIdDocument = async () => {
    if (!token || !idDocumentUrl) return;
    if (!isOnline) {
      setMessage("Hors ligne: impossible de supprimer la piece d'identite.");
      return;
    }
    setUploadingIdDocument(true);
    setMessage(null);
    try {
      const updated = await api.removeMyPatientIdDocument(token);
      setIdDocumentUrl(normalizeText(updated.id_document_url));
      if (profileCacheKey) {
        localStorage.setItem(profileCacheKey, JSON.stringify(updated));
      }
      setMessage("Piece d'identite supprimee.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Echec de suppression de la piece d'identite.");
    } finally {
      setUploadingIdDocument(false);
    }
  };

  const savePassword = async () => {
    if (!token) return;
    if (!isOnline) {
      setMessage('Hors ligne: impossible de modifier le mot de passe.');
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
      setMessage(err instanceof Error ? err.message : 'Echec de mise a jour du mot de passe.');
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
                    <IonInput
                      disabled={!editMode}
                      value={phone}
                      maxlength={14}
                      inputmode="tel"
                      onIonInput={(e) => setPhone(maskHaitiPhone(e.detail.value ?? ''))}
                    />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked" style={{ fontSize: "20px", fontWeight: "bold" }}>WhatsApp</IonLabel>
                    <IonInput
                      disabled={!editMode}
                      value={whatsapp}
                      maxlength={14}
                      inputmode="tel"
                      onIonInput={(e) => setWhatsapp(maskHaitiPhone(e.detail.value ?? ''))}
                    />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked" style={{ fontSize: "20px", fontWeight: "bold" }}>WhatsApp de recuperation</IonLabel>
                    <IonInput
                      disabled={!editMode}
                      value={recoveryWhatsapp}
                      maxlength={14}
                      inputmode="tel"
                      onIonInput={(e) => setRecoveryWhatsapp(maskHaitiPhone(e.detail.value ?? ''))}
                    />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked" style={{ fontSize: "20px", fontWeight: "bold" }}>NINU</IonLabel>
                    <IonInput disabled={!editMode} value={ninu} onIonInput={(e) => setNinu(e.detail.value ?? '')} />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked" style={{ fontSize: "20px", fontWeight: "bold" }}>Piece d'identite (optionnel)</IonLabel>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>
                      <IonButton
                        size="small"
                        fill="outline"
                        color={isOnline ? 'primary' : 'warning'}
                        disabled={!isOnline || uploadingIdDocument}
                        onClick={() => idDocumentInputRef.current?.click()}
                      >
                        <IonIcon icon={documentAttachOutline} slot="start" />
                        {uploadingIdDocument ? 'Upload...' : idDocumentUrl ? 'Remplacer fichier' : 'Ajouter fichier'}
                      </IonButton>
                      {idDocumentUrl ? (
                        <a href={idDocumentUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.9rem' }}>
                          Voir fichier
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Aucun fichier</span>
                      )}
                      {idDocumentUrl ? (
                        <IonButton
                          size="small"
                          fill="outline"
                          color="medium"
                          disabled={!isOnline || uploadingIdDocument}
                          onClick={() => removePatientIdDocument().catch(() => undefined)}
                        >
                          Retirer fichier
                        </IonButton>
                      ) : null}
                      <input
                        ref={idDocumentInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        style={{ display: 'none' }}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void uploadPatientIdDocument(file);
                        }}
                      />
                    </div>
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
                    <IonInput type="password" value={currentPassword} onIonInput={(e) => setCurrentPassword(e.detail.value ?? '')} />
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
                    <IonInput type="password" value={confirmNewPassword} onIonInput={(e) => setConfirmNewPassword(e.detail.value ?? '')} />
                  </IonItem>
                  <div style={{ padding: '0 12px 12px' }}>
                    <IonButton expand="block" onClick={() => savePassword().catch(() => undefined)} disabled={passwordSaving}>
                      {passwordSaving ? 'Mise a jour...' : 'Mettre a jour le mot de passe'}
                    </IonButton>
                  </div>
                </>
              ) : null}
            </div>
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
              <div className="quick-icon quick-icon-blue">
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
            onClick={() => ionRouter.push('/patient/access-requests', 'forward', 'push')}
          >
            <IonCardContent>
              <div className="quick-icon quick-icon-gold">
                <IonIcon icon={shieldCheckmarkOutline} />
              </div>
              <h3>Demandes d'acces</h3>
              <p className="muted-note">Approuver ou refuser l'acces medecin.</p>
            </IonCardContent>
          </IonCard>
          <IonCard
            button
            className="surface-card"
            style={{ margin: 0 }}
            onClick={() => ionRouter.push('/patient/pharmacies', 'forward', 'push')}
          >
            <IonCardContent>
              <div className="quick-icon quick-icon-green">
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
            onClick={() => ionRouter.push('/patient/laboratoires', 'forward', 'push')}
          >
            <IonCardContent>
              <div className="quick-icon quick-icon-purple">
                <IonIcon icon={beaker} />
              </div>
              <h3>Laboratoires</h3>
              <p className="muted-note">Voir les laboratoires disponibles.</p>
            </IonCardContent>
          </IonCard>
          <IonCard
            button
            className="surface-card"
            style={{ margin: 0 }}
            onClick={() => ionRouter.push('/patient/hopitaux', 'forward', 'push')}
          >
            <IonCardContent>
              <div className="quick-icon quick-icon-red">
                <IonIcon icon={businessOutline} />
              </div>
              <h3>Hopitaux</h3>
              <p className="muted-note">Voir les hopitaux disponibles.</p>
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
            onClick={() => ionRouter.push('/patient/medicaments', 'forward', 'push')}
          >
            <IonCardContent>
              <div className="quick-icon quick-icon-green">
                <IonIcon icon={addCircleOutline} />
              </div>
              <h3>Mes medicaments</h3>
              <p className="muted-note">Suivre vos medicaments.</p>
            </IonCardContent>
          </IonCard>
          <IonCard
            button
            className="surface-card"
            style={{ margin: 0 }}
            onClick={() => ionRouter.push('/patient/emergency-contacts', 'forward', 'push')}
          >
            <IonCardContent>
              <div className="quick-icon quick-icon-red">
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
              <div className="quick-icon quick-icon-purple">
                <IonIcon icon={folderOutline} />
              </div>
              <h3>Historique</h3>
              <p className="muted-note">Gerer votre historique medical.</p>
            </IonCardContent>
          </IonCard>
          <IonCard
            button
            className="surface-card"
            style={{ margin: 0 }}
            onClick={() => setMessage('Module rappel medicament bientot disponible.')}
          >
            <IonCardContent>
              <div className="quick-icon quick-icon-gold">
                <IonIcon icon={alarmOutline} />
              </div>
              <h3>Rappel medicament</h3>
              <p className="muted-note">Programmer vos rappels de prise.</p>
            </IonCardContent>
          </IonCard>
          <IonCard
            button
            className="surface-card"
            style={{ margin: 0 }}
            onClick={() => setMessage('Module Signes vitaux bientot disponible.')}
          >
            <IonCardContent>
              <div className="quick-icon quick-icon-red">
                <IonIcon icon={pulseOutline} />
              </div>
              <h3>Signes vitaux</h3>
              <p className="muted-note">Suivre vos signes vitaux.</p>
            </IonCardContent>
          </IonCard>
          <IonCard
            button
            className="surface-card"
            style={{ margin: 0 }}
            onClick={() => ionRouter.push('/patient/visites', 'forward', 'push')}
          >
            <IonCardContent>
              <div className="quick-icon quick-icon-purple">
                <IonIcon icon={walkOutline} />
              </div>
              <h3>Mes visites</h3>
              <p className="muted-note">Voir l'historique de vos visites medicales.</p>
            </IonCardContent>
          </IonCard>
          <IonCard
            button
            className="surface-card"
            style={{ margin: 0 }}
            onClick={() => ionRouter.push('/patient/rendez-vous', 'forward', 'push')}
          >
            <IonCardContent>
              <div className="quick-icon quick-icon-blue">
                <IonIcon icon={calendarOutline} />
              </div>
              <h3>Mes rendez-vous</h3>
              <p className="muted-note">Suivre vos rendez-vous a venir.</p>
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

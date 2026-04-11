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
  IonPage,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
  useIonRouter
} from '@ionic/react';
import {
  beaker,
  businessOutline,
  calendarOutline,
  chevronDownOutline,
  chevronUpOutline,
  documentTextOutline,
  imageOutline,
  peopleOutline,
  personCircleOutline,
  shieldCheckmarkOutline,
  storefrontOutline,
  walkOutline
} from 'ionicons/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api } from '../services/api';
import { useAuth } from '../state/AuthState';
import { maskHaitiPhone } from '../utils/phoneMask';
import { getPasswordStrength } from '../utils/passwordStrength';

const SecretaryDashboard: React.FC = () => {
  const ionRouter = useIonRouter();
  const { logout, token, user } = useAuth();
  const [profileCardExpanded, setProfileCardExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [contactExpanded, setContactExpanded] = useState(false);
  const [locationExpanded, setLocationExpanded] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [networkExpanded, setNetworkExpanded] = useState(false);
  const [accountExpanded, setAccountExpanded] = useState(false);
  const [passwordExpanded, setPasswordExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(maskHaitiPhone(user?.phone ?? ''));
  const [whatsapp, setWhatsapp] = useState(maskHaitiPhone(user?.whatsapp ?? ''));
  const [recoveryWhatsapp, setRecoveryWhatsapp] = useState(maskHaitiPhone(user?.recovery_whatsapp ?? ''));
  const [address, setAddress] = useState(user?.address ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [department, setDepartment] = useState(user?.department ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(user?.profile_photo_url ?? '');
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

  useEffect(() => {
    if (!token) return;
    api.me(token)
      .then((me) => {
        setName(me.name ?? '');
        setPhone(maskHaitiPhone(me.phone ?? ''));
        setWhatsapp(maskHaitiPhone(me.whatsapp ?? ''));
        setRecoveryWhatsapp(maskHaitiPhone(me.recovery_whatsapp ?? ''));
        setAddress(me.address ?? '');
        setCity(me.city ?? '');
        setDepartment(me.department ?? '');
        setBio(me.bio ?? '');
        setProfilePhotoUrl(me.profile_photo_url ?? '');
      })
      .catch(() => undefined);
  }, [token]);

  const saveProfile = async () => {
    if (!token) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.updateSecretaryProfile(token, {
        name: name.trim(),
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        recovery_whatsapp: recoveryWhatsapp.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        department: department.trim() || null,
        bio: bio.trim() || null,
      });
      setMessage('Profil mis a jour.');
      setEditMode(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Impossible de mettre a jour le profil.');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (!token) return;
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
      setMessage(err instanceof Error ? err.message : 'Impossible de mettre a jour le mot de passe.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const uploadProfilePhoto = async (file: File) => {
    if (!token) return;
    try {
      setUploadingPhoto(true);
      setMessage(null);
      const updated = await api.uploadMySecretaryProfilePhoto(token, file);
      setProfilePhotoUrl(updated.profile_photo_url ?? '');
      setMessage('Photo de profil mise a jour.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Impossible de mettre a jour la photo de profil.');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  const openUpcomingModule = (moduleName: string) => {
    setMessage(`${moduleName} sera disponible prochainement pour le role secretaire.`);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Tableau de bord secretaire</IonTitle>
          <IonButton slot="end" fill="clear" onClick={logout}>
            Deconnexion
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="hero-card">
          <IonCardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <IonCardTitle>Profil secretaire</IonCardTitle>
                <IonBadge color="primary">Compte actif</IonBadge>
              </div>
              <IonButton fill="clear" size="small" onClick={() => setProfileCardExpanded((prev) => !prev)}>
                <IonIcon icon={profileCardExpanded ? chevronUpOutline : chevronDownOutline} />
              </IonButton>
            </div>
          </IonCardHeader>
          {profileCardExpanded ? (
            <IonCardContent>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadProfilePhoto(file);
                }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr auto', gap: '10px', alignItems: 'center' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    border: '1px solid #dbe7ef',
                    background: '#f8fafc',
                    display: 'grid',
                    placeItems: 'center',
                    overflow: 'hidden'
                  }}
                >
                  {profilePhotoUrl ? (
                    <img
                      src={profilePhotoUrl}
                      alt="Photo profil secretaire"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <IonIcon icon={personCircleOutline} style={{ fontSize: '32px', color: '#475569' }} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{name || user?.name || 'Secretaire'}</div>
                  <div style={{ color: '#64748b', fontSize: '0.95rem' }}>{user?.email ?? ''}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {editMode ? (
                    <IonButton
                      size="small"
                      fill="outline"
                      disabled={uploadingPhoto}
                      onClick={() => photoInputRef.current?.click()}
                    >
                      <IonIcon icon={imageOutline} slot="start" />
                      {uploadingPhoto ? 'Upload...' : 'Photo'}
                    </IonButton>
                  ) : null}
                  <IonButton size="small" fill={editMode ? 'solid' : 'outline'} onClick={() => setEditMode((prev) => !prev)}>
                    {editMode ? 'Lecture' : 'Modifier'}
                  </IonButton>
                </div>
              </div>

              <div style={{ marginTop: '10px', border: '1px solid #dbe7ef', borderRadius: '12px', overflow: 'hidden' }}>
                <IonButton expand="block" fill="clear" color="dark" style={{ margin: 0 }} onClick={() => setContactExpanded((prev) => !prev)}>
                  Coordonnees {contactExpanded ? <IonIcon slot="end" icon={chevronUpOutline} /> : <IonIcon slot="end" icon={chevronDownOutline} />}
                </IonButton>
                {contactExpanded ? (
                  <>
                    <IonItem lines="none">
                      <IonLabel position="stacked">Nom</IonLabel>
                      <IonInput value={name} disabled={!editMode} onIonInput={(e) => setName(e.detail.value ?? '')} />
                    </IonItem>
                    <IonItem lines="none">
                      <IonLabel position="stacked">Telephone</IonLabel>
                      <IonInput
                        value={phone}
                        maxlength={14}
                        inputmode="tel"
                        placeholder="+509-xxxx-xxxx"
                        disabled={!editMode}
                        onIonInput={(e) => setPhone(maskHaitiPhone(e.detail.value ?? ''))}
                      />
                    </IonItem>
                    <IonItem lines="none">
                      <IonLabel position="stacked">WhatsApp</IonLabel>
                      <IonInput
                        value={whatsapp}
                        maxlength={14}
                        inputmode="tel"
                        placeholder="+509-xxxx-xxxx"
                        disabled={!editMode}
                        onIonInput={(e) => setWhatsapp(maskHaitiPhone(e.detail.value ?? ''))}
                      />
                    </IonItem>
                    <IonItem lines="none">
                      <IonLabel position="stacked">WhatsApp de recuperation</IonLabel>
                      <IonInput
                        value={recoveryWhatsapp}
                        maxlength={14}
                        inputmode="tel"
                        placeholder="+509-xxxx-xxxx"
                        disabled={!editMode}
                        onIonInput={(e) => setRecoveryWhatsapp(maskHaitiPhone(e.detail.value ?? ''))}
                      />
                    </IonItem>
                  </>
                ) : null}
              </div>

              <div style={{ marginTop: '10px', border: '1px solid #dbe7ef', borderRadius: '12px', overflow: 'hidden' }}>
                <IonButton expand="block" fill="clear" color="dark" style={{ margin: 0 }} onClick={() => setLocationExpanded((prev) => !prev)}>
                  Localisation {locationExpanded ? <IonIcon slot="end" icon={chevronUpOutline} /> : <IonIcon slot="end" icon={chevronDownOutline} />}
                </IonButton>
                {locationExpanded ? (
                  <>
                    <IonItem lines="none">
                      <IonLabel position="stacked">Adresse</IonLabel>
                      <IonInput value={address} disabled={!editMode} onIonInput={(e) => setAddress(e.detail.value ?? '')} />
                    </IonItem>
                    <IonItem lines="none">
                      <IonLabel position="stacked">Ville</IonLabel>
                      <IonInput value={city} disabled={!editMode} onIonInput={(e) => setCity(e.detail.value ?? '')} />
                    </IonItem>
                    <IonItem lines="none">
                      <IonLabel position="stacked">Departement</IonLabel>
                      <IonInput value={department} disabled={!editMode} onIonInput={(e) => setDepartment(e.detail.value ?? '')} />
                    </IonItem>
                  </>
                ) : null}
              </div>

              <div style={{ marginTop: '10px', border: '1px solid #dbe7ef', borderRadius: '12px', overflow: 'hidden' }}>
                <IonButton expand="block" fill="clear" color="dark" style={{ margin: 0 }} onClick={() => setBioExpanded((prev) => !prev)}>
                  Bio / Notes {bioExpanded ? <IonIcon slot="end" icon={chevronUpOutline} /> : <IonIcon slot="end" icon={chevronDownOutline} />}
                </IonButton>
                {bioExpanded ? (
                  <IonItem lines="none">
                    <IonLabel position="stacked">Bio / Notes</IonLabel>
                    <IonTextarea autoGrow value={bio} disabled={!editMode} onIonInput={(e) => setBio(e.detail.value ?? '')} />
                  </IonItem>
                ) : null}
              </div>

              <div style={{ marginTop: '10px', border: '1px solid #dbe7ef', borderRadius: '12px', overflow: 'hidden' }}>
                <IonButton expand="block" fill="clear" color="dark" style={{ margin: 0 }} onClick={() => setPasswordExpanded((prev) => !prev)}>
                  Reinitialiser mot de passe {passwordExpanded ? <IonIcon slot="end" icon={chevronUpOutline} /> : <IonIcon slot="end" icon={chevronDownOutline} />}
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

              {editMode ? (
                <IonButton
                  expand="block"
                  style={{ marginTop: '12px' }}
                  disabled={saving || !name.trim()}
                  onClick={() => saveProfile().catch(() => undefined)}
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </IonButton>
              ) : null}

              {message ? (
                <IonText color="medium">
                  <p>{message}</p>
                </IonText>
              ) : null}
            </IonCardContent>
          ) : null}
        </IonCard>

        <IonCard className="surface-card">
          <IonCardHeader>
            <IonCardTitle>Activite clinique</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div className="dashboard-grid">
              <IonCard button className="surface-card" style={{ margin: 0 }} onClick={() => openUpcomingModule('Patients')}>
                <IonCardContent>
                  <div className="quick-icon quick-icon-rose">
                    <IonIcon icon={peopleOutline} />
                  </div>
                  <h3>Patients</h3>
                  <p className="muted-note">Acceder aux dossiers patients.</p>
                </IonCardContent>
              </IonCard>
              <IonCard button className="surface-card" style={{ margin: 0 }} onClick={() => openUpcomingModule('Rendez-Vous')}>
                <IonCardContent>
                  <div className="quick-icon quick-icon-blue">
                    <IonIcon icon={calendarOutline} />
                  </div>
                  <h3>Rendez-Vous</h3>
                  <p className="muted-note">Consulter les rendez-vous planifies.</p>
                </IonCardContent>
              </IonCard>
              <IonCard button className="surface-card" style={{ margin: 0 }} onClick={() => openUpcomingModule('Ordonnances')}>
                <IonCardContent>
                  <div className="quick-icon quick-icon-purple">
                    <IonIcon icon={documentTextOutline} />
                  </div>
                  <h3>Ordonnances</h3>
                  <p className="muted-note">Suivre le flux des ordonnances.</p>
                </IonCardContent>
              </IonCard>
              <IonCard button className="surface-card" style={{ margin: 0 }} onClick={() => openUpcomingModule('Visites')}>
                <IonCardContent>
                  <div className="quick-icon quick-icon-green">
                    <IonIcon icon={walkOutline} />
                  </div>
                  <h3>Visites</h3>
                  <p className="muted-note">Consulter les visites enregistrees.</p>
                </IonCardContent>
              </IonCard>
            </div>
          </IonCardContent>
        </IonCard>

        <IonCard className="surface-card">
          <IonCardHeader>
            <IonCardTitle>Reseau & compte</IonCardTitle>
          </IonCardHeader>
          <IonCardContent style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ border: '1px solid #dbe7ef', borderRadius: '12px', overflow: 'hidden' }}>
              <IonButton
                expand="block"
                fill="clear"
                color="dark"
                onClick={() => setNetworkExpanded((prev) => !prev)}
                style={{ margin: 0 }}
              >
                Reseau
                {networkExpanded ? <IonIcon slot="end" icon={chevronUpOutline} /> : <IonIcon slot="end" icon={chevronDownOutline} />}
              </IonButton>
              {networkExpanded ? (
                <div className="dashboard-grid" style={{ padding: '0 10px 10px' }}>
                  <IonCard button className="surface-card" style={{ margin: 0 }} onClick={() => openUpcomingModule('Hopitaux')}>
                    <IonCardContent>
                      <div className="quick-icon quick-icon-red">
                        <IonIcon icon={businessOutline} />
                      </div>
                      <h3>Hopitaux</h3>
                      <p className="muted-note">Consulter les hopitaux partenaires.</p>
                    </IonCardContent>
                  </IonCard>
                  <IonCard button className="surface-card" style={{ margin: 0 }} onClick={() => openUpcomingModule('Laboratoires')}>
                    <IonCardContent>
                      <div className="quick-icon quick-icon-purple">
                        <IonIcon icon={beaker} />
                      </div>
                      <h3>Laboratoires</h3>
                      <p className="muted-note">Consulter les laboratoires disponibles.</p>
                    </IonCardContent>
                  </IonCard>
                  <IonCard button className="surface-card" style={{ margin: 0 }} onClick={() => openUpcomingModule('Pharmacies')}>
                    <IonCardContent>
                      <div className="quick-icon quick-icon-green">
                        <IonIcon icon={storefrontOutline} />
                      </div>
                      <h3>Pharmacies</h3>
                      <p className="muted-note">Consulter les pharmacies disponibles.</p>
                    </IonCardContent>
                  </IonCard>
                  <IonCard button className="surface-card" style={{ margin: 0 }} onClick={() => openUpcomingModule('Medecins')}>
                    <IonCardContent>
                      <div className="quick-icon quick-icon-blue">
                        <IonIcon icon={peopleOutline} />
                      </div>
                      <h3>Medecins</h3>
                      <p className="muted-note">Consulter les medecins du reseau.</p>
                    </IonCardContent>
                  </IonCard>
                </div>
              ) : null}
            </div>

            <div style={{ border: '1px solid #dbe7ef', borderRadius: '12px', overflow: 'hidden' }}>
              <IonButton
                expand="block"
                fill="clear"
                color="dark"
                onClick={() => setAccountExpanded((prev) => !prev)}
                style={{ margin: 0 }}
              >
                Compte
                {accountExpanded ? <IonIcon slot="end" icon={chevronUpOutline} /> : <IonIcon slot="end" icon={chevronDownOutline} />}
              </IonButton>
              {accountExpanded ? (
                <div className="dashboard-grid" style={{ padding: '0 10px 10px' }}>
                  <IonCard button className="surface-card" style={{ margin: 0 }} onClick={() => setProfileCardExpanded(true)}>
                    <IonCardContent>
                      <div className="quick-icon quick-icon-gold">
                        <IonIcon icon={personCircleOutline} />
                      </div>
                      <h3>Mon profil</h3>
                      <p className="muted-note">Modifier les informations du compte.</p>
                    </IonCardContent>
                  </IonCard>
                  <IonCard button className="surface-card" style={{ margin: 0 }} onClick={() => ionRouter.push('/secretaire/access-requests', 'forward', 'push')}>
                    <IonCardContent>
                      <div className="quick-icon quick-icon-gold">
                        <IonIcon icon={shieldCheckmarkOutline} />
                      </div>
                      <h3>Demandes d'acces</h3>
                      <p className="muted-note">Gerer les demandes en attente.</p>
                    </IonCardContent>
                  </IonCard>
                </div>
              ) : null}
            </div>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default SecretaryDashboard;

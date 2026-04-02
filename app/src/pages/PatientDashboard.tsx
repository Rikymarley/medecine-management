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
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
  useIonRouter
} from '@ionic/react';
import {
  callOutline,
  documentTextOutline,
  medkitOutline,
  peopleOutline,
  pulseOutline,
  storefrontOutline
} from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
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
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'' | 'male' | 'female'>('');
  const [allergies, setAllergies] = useState('');
  const [chronicDiseases, setChronicDiseases] = useState('');
  const [bloodType, setBloodType] = useState<
    '' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
  >('');
  const [emergencyNotes, setEmergencyNotes] = useState('');
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
        setName(normalizeText(me.name));
        setPhone(maskHaitiPhone(normalizeText(me.phone)));
        setNinu(normalizeText(me.ninu));
        setWhatsapp(maskHaitiPhone(normalizeText(me.whatsapp)));
        setAddress(normalizeText(me.address));
        setAge(me.age === null || me.age === undefined ? '' : String(me.age));
        setGender((me.gender as '' | 'male' | 'female' | null) ?? '');
        setAllergies(normalizeText(me.allergies));
        setChronicDiseases(normalizeText(me.chronic_diseases));
        setBloodType((me.blood_type as '' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null) ?? '');
        setEmergencyNotes(normalizeText(me.emergency_notes));
      })
      .catch(() => {
        setName(normalizeText(user?.name));
        setPhone(maskHaitiPhone(normalizeText(user?.phone)));
        setNinu(normalizeText(user?.ninu));
        setWhatsapp(maskHaitiPhone(normalizeText(user?.whatsapp)));
        setAddress(normalizeText(user?.address));
        setAge(user?.age === null || user?.age === undefined ? '' : String(user.age));
        setGender((user?.gender as '' | 'male' | 'female' | null) ?? '');
        setAllergies(normalizeText(user?.allergies));
        setChronicDiseases(normalizeText(user?.chronic_diseases));
        setBloodType((user?.blood_type as '' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null) ?? '');
        setEmergencyNotes(normalizeText(user?.emergency_notes));
      });
  }, [
    token,
    user?.address,
    user?.age,
    user?.allergies,
    user?.blood_type,
    user?.chronic_diseases,
    user?.emergency_notes,
    user?.gender,
    user?.name,
    user?.ninu,
    user?.phone,
    user?.whatsapp
  ]);

  const profileMissingFields = useMemo(() => {
    const missing: string[] = [];
    if (!name.trim()) missing.push('nom');
    if (!phone.trim()) missing.push('telephone');
    if (!address.trim()) missing.push('adresse');
    return missing;
  }, [address, name, phone]);
  const profileIncomplete = profileMissingFields.length > 0;

  const saveProfile = async () => {
    if (!token) {
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
        age: age.trim() ? Number(age) : null,
        gender: gender || null,
        allergies: allergies.trim() || null,
        chronic_diseases: chronicDiseases.trim() || null,
        blood_type: bloodType || null,
        emergency_notes: emergencyNotes.trim() || null
      });
      setMessage('Profil mis a jour.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Echec de mise a jour.');
    } finally {
      setSaving(false);
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
            <IonCardTitle>{name || user?.name || 'Profil patient'}</IonCardTitle>
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
                  <IonLabel position="stacked">Nom</IonLabel>
                  <IonInput value={name} onIonInput={(e) => setName(e.detail.value ?? '')} />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">Telephone</IonLabel>
                  <IonInput value={phone} onIonInput={(e) => setPhone(maskHaitiPhone(e.detail.value ?? ''))} />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">NINU</IonLabel>
                  <IonInput value={ninu} onIonInput={(e) => setNinu(e.detail.value ?? '')} />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">WhatsApp</IonLabel>
                  <IonInput value={whatsapp} onIonInput={(e) => setWhatsapp(maskHaitiPhone(e.detail.value ?? ''))} />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">Adresse</IonLabel>
                  <IonInput value={address} onIonInput={(e) => setAddress(e.detail.value ?? '')} />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">Age</IonLabel>
                  <IonInput type="number" value={age} onIonInput={(e) => setAge(e.detail.value ?? '')} />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">Genre</IonLabel>
                  <IonSelect value={gender} onIonChange={(e) => setGender((e.detail.value as '' | 'male' | 'female') ?? '')}>
                    <IonSelectOption value="">Non precise</IonSelectOption>
                    <IonSelectOption value="male">M</IonSelectOption>
                    <IonSelectOption value="female">F</IonSelectOption>
                  </IonSelect>
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">Allergies</IonLabel>
                  <IonInput value={allergies} onIonInput={(e) => setAllergies(e.detail.value ?? '')} />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">Maladies chroniques</IonLabel>
                  <IonInput value={chronicDiseases} onIonInput={(e) => setChronicDiseases(e.detail.value ?? '')} />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">Groupe sanguin</IonLabel>
                  <IonSelect
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
                  <IonLabel position="stacked">Notes d'urgence</IonLabel>
                  <IonInput value={emergencyNotes} onIonInput={(e) => setEmergencyNotes(e.detail.value ?? '')} />
                </IonItem>
                <IonButton expand="block" onClick={() => saveProfile().catch(() => undefined)} disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Mettre a jour le profil'}
                </IonButton>
              </>
            ) : null}
          </IonCardContent>
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

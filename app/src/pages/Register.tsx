import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../state/AuthState';
import InstallBanner from '../components/InstallBanner';
import { maskHaitiPhone } from '../utils/phoneMask';
import {
  buildDoctorSpecialty,
  DOCTOR_SPECIALTY_OPTIONS,
  OTHER_SPECIALTY_VALUE
} from '../constants/doctorSpecialties';
import { api } from '../services/api';

const Register: React.FC = () => {
  const history = useHistory();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [ninu, setNinu] = useState('');
  const [role, setRole] = useState<'doctor' | 'pharmacy' | 'patient' | 'hopital' | 'laboratoire' | 'secretaire'>('patient');
  const [pharmacyName, setPharmacyName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [doctorSpecialty, setDoctorSpecialty] = useState('');
  const [doctorSpecialtyOther, setDoctorSpecialtyOther] = useState('');
  const [specialtyOptions, setSpecialtyOptions] = useState<string[]>([...DOCTOR_SPECIALTY_OPTIONS]);
  const [doctorAddress, setDoctorAddress] = useState('');
  const [doctorLatitude, setDoctorLatitude] = useState('');
  const [doctorLongitude, setDoctorLongitude] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const resolvedDoctorSpecialty = buildDoctorSpecialty(doctorSpecialty, doctorSpecialtyOther);
      if (role === 'doctor' && !resolvedDoctorSpecialty) {
        setError('Veuillez choisir une specialite.');
        setLoading(false);
        return;
      }

      await register({
        name,
        email,
        ninu: role === 'patient' ? ninu.trim() || undefined : undefined,
        phone: role === 'doctor' ? doctorPhone.trim() || undefined : undefined,
        specialty: role === 'doctor' ? resolvedDoctorSpecialty || undefined : undefined,
        address: role === 'doctor' ? doctorAddress.trim() || undefined : undefined,
        latitude: role === 'doctor' && doctorLatitude.trim() ? Number(doctorLatitude) : undefined,
        longitude: role === 'doctor' && doctorLongitude.trim() ? Number(doctorLongitude) : undefined,
        password,
        password_confirmation: confirmPassword,
        role,
        pharmacy_name: role === 'pharmacy' ? pharmacyName : undefined
      });
      history.replace(`/${role}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Echec de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Creer un compte</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="hero-card">
          <IonCardHeader>
            <IonCardTitle>Inscription</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem>
              <IonLabel position="stacked">Nom complet</IonLabel>
              <IonInput value={name} onIonInput={(e) => setName(e.detail.value ?? '')} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Email</IonLabel>
              <IonInput
                value={email}
                type="email"
                onIonInput={(e) => setEmail(e.detail.value ?? '')}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Role</IonLabel>
              <IonSelect value={role} onIonChange={(e) => setRole(e.detail.value)}>
                <IonSelectOption value="patient">Patient</IonSelectOption>
                <IonSelectOption value="doctor">Medecin</IonSelectOption>
                <IonSelectOption value="pharmacy">Pharmacie</IonSelectOption>
                <IonSelectOption value="hopital">Hopital</IonSelectOption>
                <IonSelectOption value="laboratoire">Laboratoire</IonSelectOption>
                <IonSelectOption value="secretaire">Secretaire</IonSelectOption>
              </IonSelect>
            </IonItem>
            {role === 'pharmacy' ? (
              <IonItem>
                <IonLabel position="stacked">Nom de la pharmacie</IonLabel>
                <IonInput
                  value={pharmacyName}
                  placeholder="Pharmacie Centrale"
                  onIonInput={(e) => setPharmacyName(e.detail.value ?? '')}
                />
              </IonItem>
            ) : null}
            {role === 'patient' ? (
              <IonItem>
                <IonLabel position="stacked">NINU (optionnel)</IonLabel>
                <IonInput
                  value={ninu}
                  placeholder="Numero identifiant national unique"
                  onIonInput={(e) => setNinu(e.detail.value ?? '')}
                />
              </IonItem>
            ) : null}
            {role === 'doctor' ? (
              <>
                <IonItem>
                  <IonLabel position="stacked">Specialite</IonLabel>
                  <IonSelect
                    value={doctorSpecialty}
                    placeholder="Selectionner"
                    onIonChange={(e) => setDoctorSpecialty(e.detail.value)}
                  >
                    {specialtyOptions.map((option) => (
                      <IonSelectOption key={option} value={option}>
                        {option}
                      </IonSelectOption>
                    ))}
                    <IonSelectOption value={OTHER_SPECIALTY_VALUE}>Autre (preciser)</IonSelectOption>
                  </IonSelect>
                </IonItem>
                {doctorSpecialty === OTHER_SPECIALTY_VALUE ? (
                  <IonItem>
                    <IonLabel position="stacked">Autre specialite</IonLabel>
                    <IonInput
                      value={doctorSpecialtyOther}
                      placeholder="Ex: Rhumatologie"
                      onIonInput={(e) => setDoctorSpecialtyOther(e.detail.value ?? '')}
                    />
                  </IonItem>
                ) : null}
                <IonItem>
                  <IonLabel position="stacked">Telephone</IonLabel>
                  <IonInput
                    value={doctorPhone}
                    placeholder="+509-xxxx-xxxx"
                    maxlength={14}
                    inputmode="tel"
                    onIonInput={(e) => setDoctorPhone(maskHaitiPhone(e.detail.value ?? ''))}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Adresse</IonLabel>
                  <IonInput
                    value={doctorAddress}
                    placeholder="Adresse du cabinet"
                    onIonInput={(e) => setDoctorAddress(e.detail.value ?? '')}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Latitude</IonLabel>
                  <IonInput
                    value={doctorLatitude}
                    type="number"
                    onIonInput={(e) => setDoctorLatitude(e.detail.value ?? '')}
                  />
                </IonItem>
                <IonItem>
                  <IonLabel position="stacked">Longitude</IonLabel>
                  <IonInput
                    value={doctorLongitude}
                    type="number"
                    onIonInput={(e) => setDoctorLongitude(e.detail.value ?? '')}
                  />
                </IonItem>
              </>
            ) : null}
            <IonItem>
              <IonLabel position="stacked">Mot de passe</IonLabel>
              <IonInput
                value={password}
                type="password"
                onIonInput={(e) => setPassword(e.detail.value ?? '')}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Confirmer le mot de passe</IonLabel>
              <IonInput
                value={confirmPassword}
                type="password"
                onIonInput={(e) => setConfirmPassword(e.detail.value ?? '')}
              />
            </IonItem>
            {error ? (
              <IonText color="danger">
                <p>{error}</p>
              </IonText>
            ) : null}
            <IonButton expand="block" onClick={submit} disabled={loading}>
              Creer le compte
            </IonButton>
            <IonButton
              expand="block"
              fill="clear"
              onClick={() => history.push('/login')}
            >
              J'ai deja un compte
            </IonButton>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default Register;

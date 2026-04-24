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
  IonLoading,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { useState } from 'react';
import { useHistory } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { useAuth } from '../state/AuthState';

const Login: React.FC = () => {
  const history = useHistory();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      history.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Echec de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Reseau de disponibilite des medicaments</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="hero-card">
          <IonCardHeader>
            <IonCardTitle>Connexion</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem>
              <IonLabel position="stacked">Email</IonLabel>
              <IonInput
                type="email"
                value={email}
                disabled={loading}
                onIonInput={(e) => setEmail(e.detail.value ?? '')}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Mot de passe</IonLabel>
              <IonInput
                type="password"
                value={password}
                disabled={loading}
                onIonInput={(e) => setPassword(e.detail.value ?? '')}
              />
            </IonItem>
            {error ? (
              <IonText color="danger">
                <p>{error}</p>
              </IonText>
            ) : null}
            <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
              <IonButton expand="block" onClick={submit} disabled={loading}>
                {loading ? 'Connexion en cours...' : 'Se connecter'}
              </IonButton>
              <IonButton
                expand="block"
                fill="clear"
                onClick={() => history.push('/register')}
              >
                Creer un compte
              </IonButton>
              <IonButton
                expand="block"
                fill="outline"
                color="medium"
                onClick={() => history.push('/claim-account')}
              >
                Reclamer un compte
              </IonButton>
              <IonButton
                expand="block"
                fill="outline"
                color="dark"
                onClick={() => history.push('/password-recovery')}
              >
                Recuperer mot de passe
              </IonButton>
            </div>
            <IonLoading isOpen={loading} message="Connexion en cours..." />
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default Login;

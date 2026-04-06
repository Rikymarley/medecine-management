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
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api } from '../services/api';
import { getPasswordStrength } from '../utils/passwordStrength';

const ResetPasswordPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      if (!token) {
        setError('Lien invalide: token manquant.');
        setTokenValid(false);
        setCheckingToken(false);
        return;
      }
      try {
        await api.resolvePasswordResetToken({ token });
        if (!mounted) return;
        setTokenValid(true);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setTokenValid(false);
        setError(err instanceof Error ? err.message : 'Lien invalide ou expire.');
      } finally {
        if (mounted) setCheckingToken(false);
      }
    };
    void check();
    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (checkingToken || tokenValid) {
      return;
    }
    setRedirectCountdown(5);
    const interval = window.setInterval(() => {
      setRedirectCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    const timer = window.setTimeout(() => {
      history.replace('/login');
    }, 5000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timer);
    };
  }, [checkingToken, tokenValid, history]);

  const submit = async () => {
    if (!token || !tokenValid) {
      setError('Token manquant.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await api.completePasswordReset({
        token,
        password,
        password_confirmation: confirmPassword,
      });
      setMessage(response.message || 'Mot de passe reinitialise.');
      setTimeout(() => history.replace('/login'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Echec de reinitialisation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Reinitialiser mot de passe</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="hero-card">
          {!checkingToken && tokenValid ? (
            <IonCardHeader>
              <IonCardTitle>Nouveau mot de passe</IonCardTitle>
            </IonCardHeader>
          ) : null}
          <IonCardContent>
            {checkingToken ? (
              <IonText color="medium">
                <p>Verification du lien...</p>
              </IonText>
            ) : null}
            {error ? (
              <IonText color="danger">
                <p style={{ textAlign: 'center' }}>
                  {tokenValid ? error : "Ce lien n'est plus valide"}
                </p>
              </IonText>
            ) : null}
            {!checkingToken && !tokenValid ? (
              <IonText color="medium">
                <p style={{ textAlign: 'center' }}>
                  Redirection automatique dans {redirectCountdown} sec...
                </p>
              </IonText>
            ) : null}
            {message ? (
              <IonText color="success">
                <p>{message}</p>
              </IonText>
            ) : null}
            {!checkingToken && tokenValid ? (
              <>
                <IonItem>
                  <IonLabel position="stacked">Nouveau mot de passe</IonLabel>
                  <IonInput type="password" value={password} onIonInput={(e) => setPassword(e.detail.value ?? '')} />
                </IonItem>
                {password ? (
                  <IonText color={strength.color}>
                    <p style={{ marginTop: 8 }}>Force: {strength.label}</p>
                  </IonText>
                ) : null}
                <IonItem>
                  <IonLabel position="stacked">Confirmer mot de passe</IonLabel>
                  <IonInput type="password" value={confirmPassword} onIonInput={(e) => setConfirmPassword(e.detail.value ?? '')} />
                </IonItem>
                <IonButton expand="block" onClick={submit} disabled={loading}>
                  {loading ? 'Validation...' : 'Valider'}
                </IonButton>
              </>
            ) : null}
            <IonButton expand="block" fill="clear" onClick={() => history.replace('/login')}>
              Retour connexion
            </IonButton>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default ResetPasswordPage;

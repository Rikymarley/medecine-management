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
  IonToolbar,
} from '@ionic/react';
import { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api } from '../services/api';
import { maskHaitiPhone } from '../utils/phoneMask';

const RecoveryApprovalPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const token = useMemo(() => new URLSearchParams(location.search).get('token') ?? '', [location.search]);
  const [status, setStatus] = useState<'pending' | 'approved' | 'denied' | 'invalid'>('pending');
  const [userName, setUserName] = useState<string>('');
  const [targetWhatsapp, setTargetWhatsapp] = useState('');
  const [targetMaskedHint, setTargetMaskedHint] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!token) {
        setStatus('invalid');
        setMessage('Lien invalide.');
        setLoading(false);
        return;
      }
      try {
        const response = await api.resolveRecoveryApprovalToken({ token });
        if (!mounted) return;
        setStatus((response.status as 'pending' | 'approved' | 'denied') ?? 'pending');
        setUserName(response.user_name ?? '');
        setTargetMaskedHint(response.target_whatsapp_masked ?? '');
        if (response.status === 'approved') {
          setMessage("Cette demande a deja ete approuvee.");
        } else if (response.status === 'denied') {
          setMessage("Cette demande a deja ete refusee.");
        } else {
          setMessage("Veuillez confirmer si vous autorisez la recuperation du mot de passe.");
        }
      } catch (err) {
        if (!mounted) return;
        setStatus('invalid');
        setMessage(err instanceof Error ? err.message : 'Lien invalide ou expire.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [token]);

  const sendDecision = async (decision: 'approve' | 'deny') => {
    if (!token) return;
    if (decision === 'approve' && !targetWhatsapp.trim()) {
      setMessage('Entrez le numero WhatsApp du compte utilisateur.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await api.decideRecoveryApproval({
        token,
        decision,
        target_whatsapp: decision === 'approve' ? targetWhatsapp.trim() : undefined,
      });
      setStatus(response.status === 'approved' ? 'approved' : 'denied');
      setMessage(response.message);
      if (response.status === 'approved' && response.whatsapp_url) {
        window.open(response.whatsapp_url, '_blank');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Action impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Validation recuperation</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="hero-card">
          <IonCardHeader>
            <IonCardTitle>Autoriser la recuperation</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {userName ? <p style={{ marginTop: 0 }}>Compte concerne: <strong>{userName}</strong></p> : null}
            {loading ? <p>Verification du lien...</p> : null}
            {!loading && message ? (
              <IonText color={status === 'denied' || status === 'invalid' ? 'danger' : 'medium'}>
                <p>{message}</p>
              </IonText>
            ) : null}
            {!loading && status === 'pending' ? (
              <div style={{ display: 'grid', gap: '10px', marginTop: '10px' }}>
                <IonItem>
                  <IonLabel position="stacked">WhatsApp du compte a recuperer</IonLabel>
                  <IonInput
                    value={targetWhatsapp}
                    onIonInput={(e) => setTargetWhatsapp(maskHaitiPhone(e.detail.value ?? ''))}
                    placeholder="+509-xxxx-xxxx"
                    maxlength={14}
                    inputmode="tel"
                  />
                </IonItem>
                {targetMaskedHint ? (
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                    Numero attendu: {targetMaskedHint}
                  </p>
                ) : null}
                <IonButton
                  expand="block"
                  color="success"
                  disabled={submitting}
                  onClick={() => {
                    void sendDecision('approve');
                  }}
                >
                  Approuver
                </IonButton>
                <IonButton
                  expand="block"
                  color="danger"
                  fill="outline"
                  disabled={submitting}
                  onClick={() => {
                    void sendDecision('deny');
                  }}
                >
                  Refuser
                </IonButton>
              </div>
            ) : null}
            <IonButton expand="block" fill="clear" onClick={() => history.replace('/login')} style={{ marginTop: 10 }}>
              Retour connexion
            </IonButton>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default RecoveryApprovalPage;

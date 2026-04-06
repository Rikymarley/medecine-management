import {
  IonBackButton,
  IonButton,
  IonButtons,
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
import { useState } from 'react';
import { api } from '../services/api';
import { maskHaitiPhone } from '../utils/phoneMask';

const PasswordRecoveryRequestPage: React.FC = () => {
  const [whatsapp, setWhatsapp] = useState('');
  const [ninu, setNinu] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    if (!whatsapp.trim()) {
      setMessage('Entrez votre numero de recuperation WhatsApp.');
      return;
    }
    if (!ninu.trim() || !dateOfBirth.trim()) {
      setMessage('Entrez aussi NINU et date de naissance.');
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await api.requestPasswordResetWhatsappLink({
        whatsapp: whatsapp.trim(),
        ninu: ninu.trim(),
        date_of_birth: dateOfBirth.trim(),
      });

      if (response.whatsapp_url) {
        window.open(response.whatsapp_url, '_blank');
      }

      if (response.stage === 'approval_pending') {
        setMessage('Validation deja en attente sur votre numero WhatsApp de recuperation.');
      } else if (response.stage === 'approved_send_reset') {
        setMessage('Validation confirmee. WhatsApp ouvert pour envoyer le lien de reinitialisation.');
      } else if (response.stage === 'approval_requested') {
        setMessage('WhatsApp ouvert. Envoyez le message au numero de recuperation pour approuver.');
      } else {
        setMessage(response.message || 'Demande de recuperation envoyee.');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Echec de la demande de recuperation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/login" />
          </IonButtons>
          <IonTitle>Recuperer mot de passe</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <IonCard className="hero-card">
          <IonCardHeader>
            <IonCardTitle>Mot de passe oublie</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem>
              <IonLabel position="stacked">Numero de recuperation WhatsApp</IonLabel>
              <IonInput
                value={whatsapp}
                onIonInput={(e) => setWhatsapp(maskHaitiPhone(e.detail.value ?? ''))}
                placeholder="+509-xxxx-xxxx"
                maxlength={14}
                inputmode="tel"
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">NINU</IonLabel>
              <IonInput
                value={ninu}
                onIonInput={(e) => setNinu(e.detail.value ?? '')}
                placeholder="Numero identifiant national unique"
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Date de naissance</IonLabel>
              <IonInput
                type="date"
                value={dateOfBirth}
                onIonInput={(e) => setDateOfBirth(e.detail.value ?? '')}
              />
            </IonItem>
            {message ? (
              <IonText color="medium">
                <p>{message}</p>
              </IonText>
            ) : null}
            <IonButton expand="block" onClick={submit} disabled={loading}>
              {loading ? 'Preparation...' : 'Demande de recuperation'}
            </IonButton>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default PasswordRecoveryRequestPage;

import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import InstallBanner from '../components/InstallBanner';
import { useAuth } from '../state/AuthState';

const VerificationPending: React.FC = () => {
  const { user, logout } = useAuth();

  const isRejected = user?.verification_status === 'rejected';

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Verification</IonTitle>
          <IonButton slot="end" fill="clear" onClick={logout}>
            Se deconnecter
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardContent>
            <h2>{isRejected ? 'Verification refusee' : 'Verification en attente'}</h2>
            <p>
              {isRejected
                ? "Votre compte n'a pas encore ete approuve. Veuillez contacter l'administration."
                : 'Votre compte est en attente de verification. Vous pourrez utiliser ce role apres approbation.'}
            </p>
            {user?.verification_notes ? (
              <IonText color="medium">
                <p>Note: {user.verification_notes}</p>
              </IonText>
            ) : null}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default VerificationPending;

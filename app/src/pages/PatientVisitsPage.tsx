import {
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { walkOutline } from 'ionicons/icons';

const PatientVisitsPage: React.FC = () => (
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <IonBackButton defaultHref="/patient" />
        </IonButtons>
        <IonTitle>Mes visites</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent className="ion-padding app-content">
      <IonCard className="surface-card">
        <IonCardHeader>
          <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IonIcon icon={walkOutline} />
            Mes visites
          </IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonText color="medium">
            <p>Module en cours. Vous pourrez suivre toutes vos visites ici.</p>
          </IonText>
        </IonCardContent>
      </IonCard>
    </IonContent>
  </IonPage>
);

export default PatientVisitsPage;

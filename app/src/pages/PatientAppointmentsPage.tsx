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
import { calendarOutline } from 'ionicons/icons';

const PatientAppointmentsPage: React.FC = () => (
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <IonBackButton defaultHref="/patient" />
        </IonButtons>
        <IonTitle>Mes rendez-vous</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent className="ion-padding app-content">
      <IonCard className="surface-card">
        <IonCardHeader>
          <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IonIcon icon={calendarOutline} />
            Mes rendez-vous
          </IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonText color="medium">
            <p>Module en cours. Vous pourrez suivre vos rendez-vous ici.</p>
          </IonText>
        </IonCardContent>
      </IonCard>
    </IonContent>
  </IonPage>
);

export default PatientAppointmentsPage;

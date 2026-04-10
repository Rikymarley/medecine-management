import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { businessOutline } from 'ionicons/icons';
import { useAuth } from '../state/AuthState';

const HospitalDashboard: React.FC = () => {
  const { logout, user } = useAuth();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Tableau de bord hopital</IonTitle>
          <IonButton slot="end" fill="clear" onClick={logout}>
            Deconnexion
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding app-content">
        <IonCard className="surface-card">
          <IonCardContent>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div className="quick-icon quick-icon-red" style={{ margin: 0 }}>
                <IonIcon icon={businessOutline} />
              </div>
              <h3 style={{ margin: 0 }}>Bienvenue {user?.name ?? 'Hopital'}</h3>
            </div>
            <IonText color="medium">
              <p>Role hopital active. Modules avances en preparation.</p>
            </IonText>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default HospitalDashboard;


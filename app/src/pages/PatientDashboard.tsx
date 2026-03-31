import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonRouter
} from '@ionic/react';
import { callOutline, documentTextOutline, medkitOutline, peopleOutline } from 'ionicons/icons';
import InstallBanner from '../components/InstallBanner';
import { useAuth } from '../state/AuthState';

const PatientDashboard: React.FC = () => {
  const ionRouter = useIonRouter();
  const { logout } = useAuth();

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

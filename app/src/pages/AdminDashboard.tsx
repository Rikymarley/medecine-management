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
import { peopleOutline, medkitOutline, storefrontOutline } from 'ionicons/icons';
import InstallBanner from '../components/InstallBanner';
import { useAuth } from '../state/AuthState';

const AdminDashboard: React.FC = () => {
  const ionRouter = useIonRouter();
  const { logout } = useAuth();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Administration</IonTitle>
          <IonButton slot="end" fill="clear" onClick={logout}>
            Se deconnecter
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <div className="dashboard-grid">
          <IonCard button className="surface-card" onClick={() => ionRouter.push('/admin/doctors', 'forward', 'push')}>
            <IonCardContent>
              <div className="quick-icon quick-icon-blue">
                <IonIcon icon={medkitOutline} />
              </div>
              <h3>Medecins</h3>
              <p className="muted-note">Approuver comptes et verifier licences.</p>
            </IonCardContent>
          </IonCard>

          <IonCard button className="surface-card" onClick={() => ionRouter.push('/admin/pharmacies', 'forward', 'push')}>
            <IonCardContent>
              <div className="quick-icon quick-icon-green">
                <IonIcon icon={storefrontOutline} />
              </div>
              <h3>Pharmacies</h3>
              <p className="muted-note">Approuver comptes et verifier licences.</p>
            </IonCardContent>
          </IonCard>

          <IonCard button className="surface-card" onClick={() => ionRouter.push('/admin/patients', 'forward', 'push')}>
            <IonCardContent>
              <div className="quick-icon quick-icon-rose">
                <IonIcon icon={peopleOutline} />
              </div>
              <h3>Patients</h3>
              <p className="muted-note">Approuver les comptes patients.</p>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminDashboard;

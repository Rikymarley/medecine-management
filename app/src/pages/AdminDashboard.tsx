import {
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
  useIonRouter
} from '@ionic/react';
import { peopleOutline, medkitOutline, storefrontOutline, documentTextOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api } from '../services/api';
import { useAuth } from '../state/AuthState';
import { getPasswordStrength } from '../utils/passwordStrength';
import { maskHaitiPhone } from '../utils/phoneMask';

const AdminDashboard: React.FC = () => {
  const ionRouter = useIonRouter();
  const { logout, token, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingRecoveryWhatsapp, setSavingRecoveryWhatsapp] = useState(false);
  const [recoveryWhatsapp, setRecoveryWhatsapp] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

  useEffect(() => {
    setRecoveryWhatsapp(maskHaitiPhone((user as any)?.recovery_whatsapp ?? (user?.whatsapp ?? '')));
    if (!token) return;
    api.me(token)
      .then((me) => {
        setRecoveryWhatsapp(maskHaitiPhone((me as any).recovery_whatsapp ?? me.whatsapp ?? ''));
      })
      .catch(() => undefined);
  }, [token, user]);

  const savePassword = async () => {
    if (!token) return;
    if (!currentPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
      setMessage('Veuillez renseigner tous les champs mot de passe.');
      return;
    }
    setSavingPassword(true);
    setMessage(null);
    try {
      const response = await api.changePassword(token, {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmNewPassword
      });
      setMessage(response.message || 'Mot de passe mis a jour.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Echec de mise a jour du mot de passe.');
    } finally {
      setSavingPassword(false);
    }
  };

  const saveRecoveryWhatsapp = async () => {
    if (!token) return;
    setSavingRecoveryWhatsapp(true);
    setMessage(null);
    try {
      await api.updateRecoveryWhatsapp(token, recoveryWhatsapp.trim() || null);
      setMessage('WhatsApp de recuperation mis a jour.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Echec de mise a jour du WhatsApp de recuperation.');
    } finally {
      setSavingRecoveryWhatsapp(false);
    }
  };

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
        <IonCard className="hero-card">
          <IonCardHeader>
            <IonCardTitle>Profil administrateur</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p style={{ marginTop: 0, marginBottom: '8px' }}>
              <strong>{user?.name ?? 'Administrateur'}</strong><br />
              <span style={{ color: '#64748b' }}>{user?.email ?? ''}</span>
            </p>
            <IonItem>
              <IonLabel position="stacked">WhatsApp de recuperation</IonLabel>
              <IonInput
                value={recoveryWhatsapp}
                maxlength={14}
                inputmode="tel"
                placeholder="+509-xxxx-xxxx"
                onIonInput={(e) => setRecoveryWhatsapp(maskHaitiPhone(e.detail.value ?? ''))}
              />
            </IonItem>
            <IonButton expand="block" fill="outline" onClick={() => saveRecoveryWhatsapp().catch(() => undefined)} disabled={savingRecoveryWhatsapp}>
              {savingRecoveryWhatsapp ? 'Mise a jour...' : 'Enregistrer WhatsApp de recuperation'}
            </IonButton>
            <IonItem>
              <IonLabel position="stacked">Mot de passe actuel</IonLabel>
              <IonInput type="password" value={currentPassword} onIonInput={(e) => setCurrentPassword(e.detail.value ?? '')} />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Nouveau mot de passe</IonLabel>
              <IonInput type="password" value={newPassword} onIonInput={(e) => setNewPassword(e.detail.value ?? '')} />
            </IonItem>
            {newPassword ? (
              <IonText color={passwordStrength.color}>
                <p style={{ marginTop: 6 }}>Force: {passwordStrength.label}</p>
              </IonText>
            ) : null}
            <IonItem>
              <IonLabel position="stacked">Confirmer nouveau mot de passe</IonLabel>
              <IonInput type="password" value={confirmNewPassword} onIonInput={(e) => setConfirmNewPassword(e.detail.value ?? '')} />
            </IonItem>
            {message ? (
              <IonText color="medium">
                <p>{message}</p>
              </IonText>
            ) : null}
            <IonButton expand="block" onClick={() => savePassword().catch(() => undefined)} disabled={savingPassword}>
              {savingPassword ? 'Mise a jour...' : 'Mettre a jour le mot de passe'}
            </IonButton>
          </IonCardContent>
        </IonCard>
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

          <IonCard button className="surface-card" onClick={() => ionRouter.push('/admin/password-reset-logs', 'forward', 'push')}>
            <IonCardContent>
              <div className="quick-icon quick-icon-gold">
                <IonIcon icon={documentTextOutline} />
              </div>
              <h3>Logs reset</h3>
              <p className="muted-note">Voir les tentatives de reinitialisation mot de passe.</p>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminDashboard;

import { IonButton, IonItem, IonLabel } from '@ionic/react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

const InstallBanner: React.FC = () => {
  const { installPrompt, isIos, isStandalone, triggerInstall } = useInstallPrompt();

  if (isStandalone) {
    return null;
  }

  if (!installPrompt && !isIos) {
    return null;
  }

  return (
    <IonItem lines="none" style={{
      '--background': '#f8fafc',
      borderRadius: '12px',
      marginBottom: '12px'
    }}>
      <IonLabel>
        <strong>Installer l'application</strong>
        <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
          {installPrompt
            ? 'Acces plus rapide et prise en charge hors ligne.'
            : "Sur iPhone : touchez Partager, puis \"Sur l'ecran d'accueil\"."}
        </div>
      </IonLabel>
      {installPrompt ? (
        <IonButton size="small" onClick={triggerInstall}>
          Installer
        </IonButton>
      ) : null}
    </IonItem>
  );
};

export default InstallBanner;

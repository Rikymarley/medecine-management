import {
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { callOutline, logoWhatsapp, mailOutline } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api, type ApiSecretaryLookup } from '../services/api';
import { useAuth } from '../state/AuthState';

type RouteParams = {
  secretaryId: string;
};

const toWhatsappPhone = (value: string): string => value.replace(/\D/g, '');

const SecretarySecretaryDetailPage: React.FC = () => {
  const { token } = useAuth();
  const { secretaryId } = useParams<RouteParams>();
  const [secretary, setSecretary] = useState<ApiSecretaryLookup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    if (!token) {
      setSecretary(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    api.getSecretariesDirectoryForSecretary(token)
      .then((rows) => {
        if (!active) {
          return;
        }
        const found = rows.find((row) => row.id === Number(secretaryId)) ?? null;
        setSecretary(found);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setSecretary(null);
      })
      .finally(() => {
        if (!active) {
          return;
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [secretaryId, token]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/secretaire/secretaires" />
          </IonButtons>
          <IonTitle>Detail secretaire</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardContent>
            {loading ? (
              <IonText color="medium">
                <p>Chargement...</p>
              </IonText>
            ) : !secretary ? (
              <IonText color="danger">
                <p>Secretaire introuvable.</p>
              </IonText>
            ) : (
              <IonList>
                <IonItem lines="full">
                  <IonLabel>
                    <h3>Nom</h3>
                    <p>{secretary.name}</p>
                  </IonLabel>
                </IonItem>
                <IonItem lines="full">
                  <IonLabel>
                    <h3>Email</h3>
                    <p>{secretary.email || 'N/D'}</p>
                  </IonLabel>
                  <a
                    href={secretary.email ? `mailto:${secretary.email}` : undefined}
                    style={{ pointerEvents: secretary.email ? 'auto' : 'none', opacity: secretary.email ? 1 : 0.5 }}
                    slot="end"
                  >
                    <IonIcon icon={mailOutline} />
                  </a>
                </IonItem>
                <IonItem lines="full">
                  <IonLabel>
                    <h3>Telephone</h3>
                    <p>{secretary.phone || 'N/D'}</p>
                  </IonLabel>
                  <a
                    href={secretary.phone ? `tel:${secretary.phone}` : undefined}
                    style={{ pointerEvents: secretary.phone ? 'auto' : 'none', opacity: secretary.phone ? 1 : 0.5 }}
                    slot="end"
                  >
                    <IonIcon icon={callOutline} />
                  </a>
                </IonItem>
                <IonItem lines="none">
                  <IonLabel>
                    <h3>WhatsApp</h3>
                    <p>{secretary.whatsapp || 'N/D'}</p>
                  </IonLabel>
                  <a
                    href={secretary.whatsapp ? `https://wa.me/${toWhatsappPhone(secretary.whatsapp)}` : undefined}
                    target="_blank"
                    rel="noreferrer"
                    style={{ pointerEvents: secretary.whatsapp ? 'auto' : 'none', opacity: secretary.whatsapp ? 1 : 0.5 }}
                    slot="end"
                  >
                    <IonIcon icon={logoWhatsapp} />
                  </a>
                </IonItem>
              </IonList>
            )}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default SecretarySecretaryDetailPage;

import {
  IonBackButton,
  IonBadge,
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
import { callOutline, locateOutline, logoWhatsapp, storefrontOutline } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPharmacy } from '../services/api';
import { formatDateTime } from '../utils/time';

type RouteParams = {
  pharmacyId: string;
};

const PatientPharmacyDetailPage: React.FC = () => {
  const { pharmacyId } = useParams<RouteParams>();
  const [pharmacy, setPharmacy] = useState<ApiPharmacy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    api.getPharmacies()
      .then((rows) => {
        if (!active) return;
        const found = rows.find((row) => row.id === Number(pharmacyId)) ?? null;
        setPharmacy(found);
      })
      .catch(() => {
        if (!active) return;
        setPharmacy(null);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [pharmacyId]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient/pharmacies" />
          </IonButtons>
          <IonTitle>Detail pharmacie</IonTitle>
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
            ) : !pharmacy ? (
              <IonText color="danger">
                <p>Pharmacie introuvable.</p>
              </IonText>
            ) : (
              <>
                {pharmacy.storefront_image_url ? (
                  <div style={{ marginBottom: '10px' }}>
                    <img
                      src={pharmacy.storefront_image_url}
                      alt={`Vitrine ${pharmacy.name}`}
                      style={{
                        width: '100%',
                        maxHeight: '170px',
                        objectFit: 'cover',
                        borderRadius: '10px',
                        border: '1px solid #dbe7ef'
                      }}
                    />
                  </div>
                ) : null}
                <IonItem lines="none">
                  {pharmacy.logo_url ? (
                    <img
                      src={pharmacy.logo_url}
                      alt={`Logo ${pharmacy.name}`}
                      style={{
                        width: '44px',
                        height: '44px',
                        objectFit: 'cover',
                        borderRadius: '10px',
                        border: '1px solid #dbe7ef',
                        marginRight: '10px'
                      }}
                    />
                  ) : (
                    <IonIcon icon={storefrontOutline} slot="start" color="primary" />
                  )}
                  <IonLabel>
                    <h2>{pharmacy.name}</h2>
                    <p>{pharmacy.address || 'Adresse non renseignee'}</p>
                  </IonLabel>
                  <div slot="end">
                    <IonBadge color={pharmacy.open_now ? 'success' : 'medium'}>
                      {pharmacy.open_now ? 'Ouverte' : 'Fermee'}
                    </IonBadge>
                  </div>
                </IonItem>
                <div style={{ margin: '4px 0 8px' }} />

                <IonList>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Telephone</h3>
                      <p>{pharmacy.phone || 'N/D'}</p>
                    </IonLabel>
                    {pharmacy.phone ? (
                      <a href={`tel:${pharmacy.phone}`} slot="end">
                        <IonIcon icon={callOutline} />
                      </a>
                    ) : null}
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>WhatsApp</h3>
                      <p>{pharmacy.phone || 'N/D'}</p>
                    </IonLabel>
                    {pharmacy.phone ? (
                      <a href={`https://wa.me/${pharmacy.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" slot="end">
                        <IonIcon icon={logoWhatsapp} />
                      </a>
                    ) : null}
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Numero de licence</h3>
                      <p>
                        {pharmacy.license_number || 'N/D'}{' '}
                        <IonBadge
                          color={pharmacy.license_verified ? 'success' : 'warning'}
                          style={{ float: 'right' }}
                        >
                          {pharmacy.license_verified ? 'Licence verifiee' : 'Licence non verifiee'}
                        </IonBadge>
                      </p>
                      <p>
                        {pharmacy.license_verified
                          ? `Verifiee${pharmacy.license_verified_at ? ` le ${formatDateTime(pharmacy.license_verified_at)}` : ''}`
                          : 'Non verifiee'}
                      </p>
                    </IonLabel>
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Services</h3>
                      <p>{pharmacy.services || 'N/D'}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Paiements</h3>
                      <p>{pharmacy.payment_methods || 'N/D'}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Horaires</h3>
                      <p style={{ whiteSpace: 'pre-line' }}>{pharmacy.opening_hours || 'N/D'}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel>
                      <h3>Localisation</h3>
                      <p>{pharmacy.latitude && pharmacy.longitude ? `${pharmacy.latitude}, ${pharmacy.longitude}` : 'N/D'}</p>
                    </IonLabel>
                    {pharmacy.latitude && pharmacy.longitude ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${pharmacy.latitude},${pharmacy.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        slot="end"
                      >
                        <IonIcon icon={locateOutline} />
                      </a>
                    ) : null}
                  </IonItem>
                </IonList>
              </>
            )}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default PatientPharmacyDetailPage;

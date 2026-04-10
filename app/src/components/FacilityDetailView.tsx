import {
  IonBackButton,
  IonBadge,
  IonButton,
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
  IonToolbar
} from '@ionic/react';
import { callOutline, locateOutline, logoWhatsapp } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import InstallBanner from './InstallBanner';
import { ApiPharmacy } from '../services/api';
import { isFacilityOpenNow } from '../utils/businessHours';
import { formatDateTime } from '../utils/time';

type FacilityDetailViewProps = {
  title: string;
  emptyMessage: string;
  backHref: string;
  icon: string;
  loadPublic: () => Promise<ApiPharmacy[]>;
  loadPrivate?: (token: string) => Promise<ApiPharmacy[]>;
  token?: string | null;
};

type RouteParams = {
  facilityId: string;
};

const toWhatsappPhone = (value: string): string => value.replace(/\D/g, '');

const FacilityDetailView: React.FC<FacilityDetailViewProps> = ({
  title,
  emptyMessage,
  backHref,
  icon,
  loadPublic,
  loadPrivate,
  token
}) => {
  const { facilityId } = useParams<RouteParams>();
  const [facility, setFacility] = useState<ApiPharmacy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const loader = token && loadPrivate ? loadPrivate(token) : loadPublic();

    loader
      .then((rows) => {
        if (!active) {
          return;
        }
        const found = rows.find((row) => row.id === Number(facilityId)) ?? null;
        setFacility(found);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setFacility(null);
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
  }, [facilityId, token, loadPrivate, loadPublic]);

  const mapQuery = facility?.latitude && facility?.longitude
    ? `${facility.latitude},${facility.longitude}`
    : facility?.address
      ? encodeURIComponent(facility.address)
      : null;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={backHref} />
          </IonButtons>
          <IonTitle>{title}</IonTitle>
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
            ) : !facility ? (
              <IonText color="danger">
                <p>{emptyMessage}</p>
              </IonText>
            ) : (
              <>
                {facility.storefront_image_url ? (
                  <div style={{ marginBottom: '10px' }}>
                    <img
                      src={facility.storefront_image_url}
                      alt={`Vitrine ${facility.name}`}
                      style={{ width: '100%', maxHeight: '170px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #dbe7ef' }}
                    />
                  </div>
                ) : null}

                <IonItem lines="none">
                  {facility.logo_url ? (
                    <img
                      src={facility.logo_url}
                      alt={`Logo ${facility.name}`}
                      style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #dbe7ef', marginRight: '10px' }}
                    />
                  ) : (
                    <IonIcon icon={icon} slot="start" color="primary" />
                  )}
                  <IonLabel>
                    <h2>{facility.name}</h2>
                    <p>{facility.address || 'Adresse non renseignee'}</p>
                  </IonLabel>
                </IonItem>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '6px 0 12px' }}>
                  <IonBadge color={facility.temporary_closed ? 'danger' : isFacilityOpenNow(facility) ? 'success' : 'medium'}>
                    {facility.temporary_closed ? 'Fermeture temporaire' : isFacilityOpenNow(facility) ? 'Ouvert' : 'Ferme'}
                  </IonBadge>
                  <IonBadge color={facility.license_verified ? 'success' : 'warning'}>
                    {facility.license_verified ? 'Licence verifiee' : 'Licence non verifiee'}
                  </IonBadge>
                  {facility.emergency_available ? <IonBadge color="warning">Urgence</IonBadge> : null}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <IonButton size="small" fill="outline" disabled={!facility.phone} href={facility.phone ? `tel:${facility.phone}` : undefined}>
                    <IonIcon icon={callOutline} slot="start" />
                    Appeler
                  </IonButton>
                  <IonButton
                    size="small"
                    fill="outline"
                    disabled={!facility.phone}
                    href={facility.phone ? `https://wa.me/${toWhatsappPhone(facility.phone)}` : undefined}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <IonIcon icon={logoWhatsapp} slot="start" />
                    WhatsApp
                  </IonButton>
                  <IonButton
                    size="small"
                    fill="outline"
                    disabled={!mapQuery}
                    href={mapQuery ? `https://www.google.com/maps/search/?api=1&query=${mapQuery}` : undefined}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <IonIcon icon={locateOutline} slot="start" />
                    Localisation
                  </IonButton>
                </div>

                <IonList>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Telephone</h3>
                      <p>{facility.phone || 'N/D'}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Numero de licence</h3>
                      <p>{facility.license_number || 'N/D'}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Statut compte</h3>
                      <p>{facility.account_verification_status ?? 'N/D'}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Services</h3>
                      <p>{facility.services || 'N/D'}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Paiements</h3>
                      <p>{facility.payment_methods || 'N/D'}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Horaires</h3>
                      <p style={{ whiteSpace: 'pre-line' }}>{facility.opening_hours || 'N/D'}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel>
                      <h3>Localisation</h3>
                      <p>{facility.latitude && facility.longitude ? `${facility.latitude}, ${facility.longitude}` : facility.address || 'N/D'}</p>
                      <p>
                        {facility.license_verified
                          ? `Licence verifiee${facility.license_verified_at ? ` le ${formatDateTime(facility.license_verified_at)}` : ''}`
                          : 'Licence non verifiee'}
                      </p>
                    </IonLabel>
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

export default FacilityDetailView;

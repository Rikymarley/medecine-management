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
  IonToolbar,
} from '@ionic/react';
import { businessOutline, callOutline, locateOutline, logoWhatsapp } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPharmacy } from '../services/api';
import { useAuth } from '../state/AuthState';
import { isFacilityOpenNow } from '../utils/businessHours';
import { formatDateTime } from '../utils/time';

type RouteParams = {
  facilityId: string;
};

const PatientHospitalDetailPage: React.FC = () => {
  const { facilityId } = useParams<RouteParams>();
  const { token } = useAuth();
  const [hospital, setHospital] = useState<ApiPharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingEmergencyContact, setSavingEmergencyContact] = useState(false);
  const [emergencyContactMessage, setEmergencyContactMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    api.getHospitals()
      .then((rows) => {
        if (!active) return;
        const found = rows.find((row) => row.id === Number(facilityId)) ?? null;
        setHospital(found);
      })
      .catch(() => {
        if (!active) return;
        setHospital(null);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [facilityId]);

  const addToEmergencyContacts = async () => {
    if (!token || !hospital || savingEmergencyContact) {
      return;
    }

    setSavingEmergencyContact(true);
    setEmergencyContactMessage(null);
    try {
      const response = await api.createPatientEmergencyContactFromProfile(token, {
        source_type: 'hospital',
        source_id: hospital.id,
      });
      setEmergencyContactMessage(response.message);
    } catch (err) {
      setEmergencyContactMessage(err instanceof Error ? err.message : 'Action impossible.');
    } finally {
      setSavingEmergencyContact(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient/hospitals" />
          </IonButtons>
          <IonTitle>Detail hopital</IonTitle>
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
            ) : !hospital ? (
              <IonText color="danger">
                <p>Hopital introuvable.</p>
              </IonText>
            ) : (
              <>
                {hospital.storefront_image_url ? (
                  <div style={{ marginBottom: '10px' }}>
                    <img
                      src={hospital.storefront_image_url}
                      alt={`Vitrine ${hospital.name}`}
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
                  {hospital.logo_url ? (
                    <img
                      src={hospital.logo_url}
                      alt={`Logo ${hospital.name}`}
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
                    <IonIcon icon={businessOutline} slot="start" color="primary" />
                  )}
                  <IonLabel>
                    <h2>{hospital.name}</h2>
                    <p>{hospital.address || 'Adresse non renseignee'}</p>
                  </IonLabel>
                  <div slot="end">
                    <IonBadge color={isFacilityOpenNow(hospital) ? 'success' : 'medium'}>
                      {isFacilityOpenNow(hospital) ? 'Ouvert' : 'Ferme'}
                    </IonBadge>
                  </div>
                </IonItem>
                <div style={{ margin: '4px 0 8px' }} />
                <IonButton
                  expand="block"
                  fill="outline"
                  color="warning"
                  disabled={!token || savingEmergencyContact}
                  onClick={() => {
                    void addToEmergencyContacts();
                  }}
                >
                  {savingEmergencyContact ? 'Ajout...' : "Ajouter aux contacts d'urgence"}
                </IonButton>
                {emergencyContactMessage ? (
                  <IonText color="medium">
                    <p style={{ marginTop: '8px' }}>{emergencyContactMessage}</p>
                  </IonText>
                ) : null}

                <IonList>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Telephone</h3>
                      <p>{hospital.phone || 'N/D'}</p>
                    </IonLabel>
                    {hospital.phone ? (
                      <a href={`tel:${hospital.phone}`} slot="end">
                        <IonIcon icon={callOutline} />
                      </a>
                    ) : null}
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>WhatsApp</h3>
                      <p>{hospital.phone || 'N/D'}</p>
                    </IonLabel>
                    {hospital.phone ? (
                      <a href={`https://wa.me/${hospital.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" slot="end">
                        <IonIcon icon={logoWhatsapp} />
                      </a>
                    ) : null}
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Numero de licence</h3>
                      <p>
                        {hospital.license_number || 'N/D'}{' '}
                        <IonBadge
                          color={hospital.license_verified ? 'success' : 'warning'}
                          style={{ float: 'right' }}
                        >
                          {hospital.license_verified ? 'Licence verifiee' : 'Licence non verifiee'}
                        </IonBadge>
                      </p>
                      <p>
                        {hospital.license_verified
                          ? `Verifiee${hospital.license_verified_at ? ` le ${formatDateTime(hospital.license_verified_at)}` : ''}`
                          : 'Non verifiee'}
                      </p>
                    </IonLabel>
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Services</h3>
                      <p>{hospital.services || 'N/D'}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Paiements</h3>
                      <p>{hospital.payment_methods || 'N/D'}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Horaires d'ouverture</h3>
                      <p style={{ whiteSpace: 'pre-line' }}>{hospital.opening_hours || 'N/D'}</p>
                      {hospital.closes_at ? <p>Ferme a {hospital.closes_at}</p> : null}
                    </IonLabel>
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel>
                      <h3>Localisation</h3>
                      <p>{hospital.latitude && hospital.longitude ? `${hospital.latitude}, ${hospital.longitude}` : 'N/D'}</p>
                    </IonLabel>
                    {hospital.latitude && hospital.longitude ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${hospital.latitude},${hospital.longitude}`}
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

export default PatientHospitalDetailPage;

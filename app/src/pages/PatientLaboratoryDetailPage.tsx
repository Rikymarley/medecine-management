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
import { beaker, callOutline, locateOutline, logoWhatsapp } from 'ionicons/icons';
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

const PatientLaboratoryDetailPage: React.FC = () => {
  const { facilityId } = useParams<RouteParams>();
  const { token } = useAuth();
  const [laboratory, setLaboratory] = useState<ApiPharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingEmergencyContact, setSavingEmergencyContact] = useState(false);
  const [emergencyContactMessage, setEmergencyContactMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    api.getLaboratories()
      .then((rows) => {
        if (!active) return;
        const found = rows.find((row) => row.id === Number(facilityId)) ?? null;
        setLaboratory(found);
      })
      .catch(() => {
        if (!active) return;
        setLaboratory(null);
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
    if (!token || !laboratory || savingEmergencyContact) {
      return;
    }

    setSavingEmergencyContact(true);
    setEmergencyContactMessage(null);
    try {
      const response = await api.createPatientEmergencyContactFromProfile(token, {
        source_type: 'laboratory',
        source_id: laboratory.id,
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
            <IonBackButton defaultHref="/patient/laboratories" />
          </IonButtons>
          <IonTitle>Detail laboratoire</IonTitle>
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
            ) : !laboratory ? (
              <IonText color="danger">
                <p>Laboratoire introuvable.</p>
              </IonText>
            ) : (
              <>
                {laboratory.storefront_image_url ? (
                  <div style={{ marginBottom: '10px' }}>
                    <img
                      src={laboratory.storefront_image_url}
                      alt={`Vitrine ${laboratory.name}`}
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
                  {laboratory.logo_url ? (
                    <img
                      src={laboratory.logo_url}
                      alt={`Logo ${laboratory.name}`}
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
                    <IonIcon icon={beaker} slot="start" color="primary" />
                  )}
                  <IonLabel>
                    <h2>{laboratory.name}</h2>
                    <p>{laboratory.address || 'Adresse non renseignee'}</p>
                  </IonLabel>
                  <div slot="end">
                    <IonBadge color={isFacilityOpenNow(laboratory) ? 'success' : 'medium'}>
                      {isFacilityOpenNow(laboratory) ? 'Ouvert' : 'Ferme'}
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
                      <p>{laboratory.phone || 'N/D'}</p>
                    </IonLabel>
                    {laboratory.phone ? (
                      <a href={`tel:${laboratory.phone}`} slot="end">
                        <IonIcon icon={callOutline} />
                      </a>
                    ) : null}
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>WhatsApp</h3>
                      <p>{laboratory.phone || 'N/D'}</p>
                    </IonLabel>
                    {laboratory.phone ? (
                      <a href={`https://wa.me/${laboratory.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" slot="end">
                        <IonIcon icon={logoWhatsapp} />
                      </a>
                    ) : null}
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Numero de licence</h3>
                      <p>
                        {laboratory.license_number || 'N/D'}{' '}
                        <IonBadge
                          color={laboratory.license_verified ? 'success' : 'warning'}
                          style={{ float: 'right' }}
                        >
                          {laboratory.license_verified ? 'Licence verifiee' : 'Licence non verifiee'}
                        </IonBadge>
                      </p>
                      <p>
                        {laboratory.license_verified
                          ? `Verifiee${laboratory.license_verified_at ? ` le ${formatDateTime(laboratory.license_verified_at)}` : ''}`
                          : 'Non verifiee'}
                      </p>
                    </IonLabel>
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Services</h3>
                      <p>{laboratory.services || 'N/D'}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Paiements</h3>
                      <p>{laboratory.payment_methods || 'N/D'}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Horaires d'ouverture</h3>
                      <p style={{ whiteSpace: 'pre-line' }}>{laboratory.opening_hours || 'N/D'}</p>
                      {laboratory.closes_at ? <p>Ferme a {laboratory.closes_at}</p> : null}
                    </IonLabel>
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel>
                      <h3>Localisation</h3>
                      <p>{laboratory.latitude && laboratory.longitude ? `${laboratory.latitude}, ${laboratory.longitude}` : 'N/D'}</p>
                    </IonLabel>
                    {laboratory.latitude && laboratory.longitude ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${laboratory.latitude},${laboratory.longitude}`}
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

export default PatientLaboratoryDetailPage;

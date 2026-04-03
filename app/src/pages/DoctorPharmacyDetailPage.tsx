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
import { callOutline, locateOutline, logoWhatsapp, storefrontOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPharmacy } from '../services/api';

type RouteParams = {
  pharmacyId: string;
};

const DoctorPharmacyDetailPage: React.FC = () => {
  const { pharmacyId } = useParams<RouteParams>();
  const [pharmacy, setPharmacy] = useState<ApiPharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [canVerify, setCanVerify] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [approvingAccount, setApprovingAccount] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      const user = raw ? JSON.parse(raw) : null;
      setCanVerify(!!user?.can_verify_accounts);
      setToken(localStorage.getItem('token'));
    } catch {
      setCanVerify(false);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const loader = token ? api.getPharmaciesForDoctor(token) : api.getPharmacies();

    loader
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
  }, [pharmacyId, token]);

  const canVerifyThisPharmacy = useMemo(
    () => canVerify && !!pharmacy && !pharmacy.license_verified,
    [canVerify, pharmacy]
  );

  const verifyPharmacy = async () => {
    if (!token || !pharmacy) return;

    try {
      setUpdating(true);
      const updated = await api.verifyPharmacyLicense(token, pharmacy.id, { verified: true });
      setPharmacy(updated);
    } catch (error) {
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const unverifyPharmacy = async () => {
    if (!token || !pharmacy) return;

    try {
      setUpdating(true);
      const updated = await api.verifyPharmacyLicense(token, pharmacy.id, { verified: false });
      setPharmacy(updated);
    } catch (error) {
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const approveAccount = async () => {
    if (!token || !pharmacy?.pharmacy_user_id) return;
    try {
      setApprovingAccount(true);
      await api.approvePharmacyAccount(token, pharmacy.pharmacy_user_id);
      const rows = await api.getPharmaciesForDoctor(token);
      const refreshed = rows.find((row) => row.id === pharmacy.id) ?? pharmacy;
      setPharmacy(refreshed);
    } catch (error) {
      console.error(error);
    } finally {
      setApprovingAccount(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/doctor/pharmacies" />
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
                <IonItem lines="none">
                  <IonIcon icon={storefrontOutline} slot="start" color="primary" />
                  <IonLabel>
                    <h2>{pharmacy.name}</h2>
                    <p>{pharmacy.address || 'Adresse non renseignee'}</p>
                  </IonLabel>
                </IonItem>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '8px 0 12px' }}>
                  {pharmacy.account_verification_status !== 'approved' ? (
                    <IonBadge color="warning">Compte en attente</IonBadge>
                  ) : null}
                  <IonBadge color={pharmacy.license_verified ? 'success' : 'warning'}>
                    {pharmacy.license_verified ? 'Licence verifiee' : 'Licence non verifiee'}
                  </IonBadge>
                  <IonBadge color={pharmacy.open_now ? 'success' : 'medium'}>
                    {pharmacy.open_now ? 'Ouverte' : 'Fermee'}
                  </IonBadge>
                  {pharmacy.license_verified && pharmacy.license_verified_by_doctor_name ? (
                    <IonBadge color="light">Verifiee par {pharmacy.license_verified_by_doctor_name}</IonBadge>
                  ) : null}
                  {pharmacy.account_verification_status === 'approved' && pharmacy.account_verified_by_name ? (
                    <IonBadge color="light">Approuvee par {pharmacy.account_verified_by_name}</IonBadge>
                  ) : null}
                </div>

                {canVerify && pharmacy.account_verification_status !== 'approved' && pharmacy.pharmacy_user_id ? (
                  <IonButton size="small" color="tertiary" fill="outline" disabled={approvingAccount} onClick={approveAccount}>
                    Approuver le compte
                  </IonButton>
                ) : null}
                {canVerifyThisPharmacy ? (
                  <IonButton size="small" color="success" fill="outline" disabled={updating} onClick={verifyPharmacy}>
                    Verifier la licence
                  </IonButton>
                ) : null}
                {canVerify && pharmacy.license_verified ? (
                  <IonButton size="small" color="warning" fill="outline" disabled={updating} onClick={unverifyPharmacy}>
                    Retirer verification licence
                  </IonButton>
                ) : null}

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
                      <p>{pharmacy.license_number || 'N/D'}</p>
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

export default DoctorPharmacyDetailPage;

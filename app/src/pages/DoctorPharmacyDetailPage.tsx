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
  IonToggle,
  IonToolbar,
} from '@ionic/react';
import { callOutline, locateOutline, logoWhatsapp, storefrontOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPharmacy } from '../services/api';
import { useAuth } from '../state/AuthState';
import { formatDateTime } from '../utils/time';

type RouteParams = {
  pharmacyId: string;
};

const DoctorPharmacyDetailPage: React.FC = () => {
  const { token, user, loading: authLoading } = useAuth();
  const { pharmacyId } = useParams<RouteParams>();
  const [pharmacy, setPharmacy] = useState<ApiPharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [canVerify, setCanVerify] = useState(false);
  const [permissionLoaded, setPermissionLoaded] = useState(false);
  const [approvingAccount, setApprovingAccount] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    setCanVerify(!!user?.can_verify_accounts);
    setPermissionLoaded(true);
  }, [authLoading, user]);

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

  const canManageLicense = useMemo(() => {
    if (!permissionLoaded || !pharmacy) {
      return false;
    }
    return !!user?.can_verify_accounts;
  }, [permissionLoaded, pharmacy, user]);

  const verifyPharmacy = async () => {
    if (!token || !pharmacy) return;

    try {
      setUpdating(true);
      setActionMessage(null);
      const updated = await api.verifyPharmacyLicense(token, pharmacy.id, { verified: true });
      setPharmacy((prev) => (prev ? { ...prev, ...updated } : updated));
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Verification impossible.');
    } finally {
      setUpdating(false);
    }
  };

  const unverifyPharmacy = async () => {
    if (!token || !pharmacy) return;

    try {
      setUpdating(true);
      setActionMessage(null);
      const updated = await api.verifyPharmacyLicense(token, pharmacy.id, { verified: false });
      setPharmacy((prev) => (prev ? { ...prev, ...updated } : updated));
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Action impossible.');
    } finally {
      setUpdating(false);
    }
  };

  const approveAccount = async () => {
    if (!token || !pharmacy?.pharmacy_user_id) return;
    try {
      setApprovingAccount(true);
      setActionMessage(null);
      await api.approvePharmacyAccount(token, pharmacy.pharmacy_user_id);
      const rows = await api.getPharmaciesForDoctor(token);
      const refreshed = rows.find((row) => row.id === pharmacy.id) ?? pharmacy;
      setPharmacy(refreshed);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Action impossible.');
    } finally {
      setApprovingAccount(false);
    }
  };

  const unapproveAccount = async () => {
    if (!token || !pharmacy?.pharmacy_user_id) return;
    try {
      setApprovingAccount(true);
      setActionMessage(null);
      await api.unapprovePharmacyAccount(token, pharmacy.pharmacy_user_id);
      const rows = await api.getPharmaciesForDoctor(token);
      const refreshed = rows.find((row) => row.id === pharmacy.id) ?? pharmacy;
      setPharmacy(refreshed);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Action impossible.');
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
                  <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#475569' }}>Approbation :</span>
                    <IonToggle
                      checked={pharmacy.account_verification_status === 'approved'}
                      disabled={!canVerify || approvingAccount || updating || !pharmacy.pharmacy_user_id}
                      onIonChange={(event) => {
                        const enabled = !!event.detail.checked;
                        if (enabled) {
                          void approveAccount();
                        } else {
                          void unapproveAccount();
                        }
                      }}
                    />
                  </div>
                </IonItem>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '4px 0 8px' }}>
                  <IonBadge color={pharmacy.account_verification_status === 'approved' ? 'success' : 'warning'}>
                    {pharmacy.account_verification_status === 'approved' ? 'Compte approuve' : 'Compte en attente'}
                  </IonBadge>
                  <IonBadge color={pharmacy.license_verified ? 'success' : 'warning'}>
                    {pharmacy.license_verified ? 'Licence verifiee' : 'Licence non verifiee'}
                  </IonBadge>
                  <IonBadge color={pharmacy.open_now ? 'success' : 'medium'}>
                    {pharmacy.open_now ? 'Ouverte' : 'Fermee'}
                  </IonBadge>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '8px 0 12px' }}>
                  {pharmacy.account_verification_status === 'approved' && pharmacy.approved_by ? (
                    <IonBadge color="light">
                      Approuvee par {pharmacy.approved_by}
                      {pharmacy.approved_at ? `, Le ${formatDateTime(pharmacy.approved_at)}` : ''}
                    </IonBadge>
                  ) : null}
                  {pharmacy.license_verified && pharmacy.license_verified_by_doctor_name ? (
                    <IonBadge color="light">
                      Verifiee par {pharmacy.license_verified_by_doctor_name}
                      {pharmacy.license_verified_at ? `, Le ${formatDateTime(pharmacy.license_verified_at)}` : ''}
                    </IonBadge>
                  ) : null}
                </div>
                {actionMessage ? (
                  <IonText color="danger">
                    <p>{actionMessage}</p>
                  </IonText>
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
                    {pharmacy.license_number && canManageLicense ? (
                      <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.9rem', color: '#475569' }}>Verification</span>
                        <IonToggle
                          checked={!!pharmacy.license_verified}
                          disabled={updating}
                          onIonChange={(event) => {
                            const enabled = !!event.detail.checked;
                            if (enabled) {
                              void verifyPharmacy();
                            } else {
                              void unverifyPharmacy();
                            }
                          }}
                        />
                      </div>
                    ) : pharmacy.license_number ? (
                      <div
                        slot="end"
                        style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '220px', textAlign: 'right', width: '50%' }}
                      >
                        {!permissionLoaded
                          ? 'Verification des permissions en cours...'
                          : 'Delegation requise pour verifier/deverifier la licence.'}
                      </div>
                    ) : null}
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

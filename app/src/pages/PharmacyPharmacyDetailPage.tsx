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
  IonToggle,
  IonTitle,
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

const PharmacyPharmacyDetailPage: React.FC = () => {
  const { token, user, loading: authLoading } = useAuth();
  const { pharmacyId } = useParams<RouteParams>();
  const [pharmacy, setPharmacy] = useState<ApiPharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [canVerify, setCanVerify] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentPharmacyId, setCurrentPharmacyId] = useState<number | null>(null);
  const [permissionLoaded, setPermissionLoaded] = useState(false);
  const [approvingAccount, setApprovingAccount] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!token || !user) {
      setCanVerify(false);
      setCurrentUserId(null);
      setCurrentPharmacyId(null);
      setPermissionLoaded(true);
      return;
    }
    setCanVerify(!!user.can_verify_accounts);
    setCurrentUserId(user.id ? Number(user.id) : null);
    setCurrentPharmacyId(user.pharmacy_id ? Number(user.pharmacy_id) : null);
    setPermissionLoaded(true);
  }, [authLoading, token, user]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const loader = token ? api.getPharmaciesForPharmacy(token) : api.getPharmacies();

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
    if (!permissionLoaded || !canVerify || !pharmacy) {
      return false;
    }
    if (!currentPharmacyId || !currentUserId) {
      return false;
    }
    if (pharmacy.id === currentPharmacyId) {
      return false;
    }
    if (pharmacy.pharmacy_user_id && pharmacy.pharmacy_user_id === currentUserId) {
      return false;
    }
    return true;
  }, [permissionLoaded, canVerify, currentPharmacyId, currentUserId, pharmacy]);

  const isOwnPharmacy = useMemo(() => {
    if (!pharmacy) {
      return false;
    }
    if (currentPharmacyId && pharmacy.id === currentPharmacyId) {
      return true;
    }
    if (currentUserId && pharmacy.pharmacy_user_id && pharmacy.pharmacy_user_id === currentUserId) {
      return true;
    }
    return false;
  }, [currentPharmacyId, currentUserId, pharmacy]);

  const verifyPharmacy = async () => {
    if (!token || !pharmacy) return;

    try {
      setUpdating(true);
      setActionMessage(null);
      const updated = await api.pharmacyVerifyPharmacyLicense(token, pharmacy.id, { verified: true });
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
      const updated = await api.pharmacyVerifyPharmacyLicense(token, pharmacy.id, { verified: false });
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
      await api.pharmacyApprovePharmacyAccount(token, pharmacy.pharmacy_user_id);
      const rows = await api.getPharmaciesForPharmacy(token);
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
      await api.pharmacyUnapprovePharmacyAccount(token, pharmacy.pharmacy_user_id);
      const rows = await api.getPharmaciesForPharmacy(token);
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
            <IonBackButton defaultHref="/pharmacy/pharmacies" />
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
                  {!isOwnPharmacy ? (
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
                  ) : null}
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
                <div style={{ display: 'grid', gap: '10px', marginTop: '8px', marginBottom: '8px' }}>
                  <div>
                    {pharmacy.storefront_image_url ? (
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <img
                          src={pharmacy.storefront_image_url}
                          alt={`Vitrine ${pharmacy.name}`}
                          style={{ width: '100%', maxWidth: '300px', height: '140px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #dbe7ef' }}
                        />
                      </div>
                    ) : (
                      <IonText color="medium">Aucune photo vitrine</IonText>
                    )}
                  </div>
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
                    {!pharmacy.license_number ? null : isOwnPharmacy ? (
                      <div
                        slot="end"
                        style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '220px', textAlign: 'right', width: '50%' }}
                      >
                        Vous ne pouvez pas verifier votre propre pharmacie.
                      </div>
                    ) : (
                      <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.9rem', color: '#475569' }}>Verification</span>
                        <IonToggle
                          checked={!!pharmacy.license_verified}
                          disabled={!canManageLicense || updating}
                          onIonChange={(event) => {
                            if (!canManageLicense) {
                              setActionMessage('Delegation requise pour verifier/deverifier la licence.');
                              return;
                            }
                            setActionMessage(null);
                            const enabled = !!event.detail.checked;
                            if (enabled) {
                              void verifyPharmacy();
                            } else {
                              void unverifyPharmacy();
                            }
                          }}
                        />
                      </div>
                    )}
                  </IonItem>
                  {!canManageLicense && !isOwnPharmacy ? (
                    <IonText color="medium">
                      <p style={{ margin: '4px 12px 8px' }}>
                        {!permissionLoaded
                          ? 'Verification des permissions en cours...'
                          : 'Delegation requise pour verifier/deverifier la licence.'}
                      </p>
                    </IonText>
                  ) : null}
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

export default PharmacyPharmacyDetailPage;

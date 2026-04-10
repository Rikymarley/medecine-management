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
  IonToggle,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { businessOutline, callOutline, chevronDownOutline, chevronUpOutline, locateOutline } from 'ionicons/icons';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPharmacy } from '../services/api';
import { useAuth } from '../state/AuthState';
import { formatDateTime } from '../utils/time';

type RouteParams = {
  pharmacyId: string;
};

const AdminPharmacyDetailPage: React.FC = () => {
  const { token } = useAuth();
  const { pharmacyId } = useParams<RouteParams>();
  const [pharmacy, setPharmacy] = useState<ApiPharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [auditExpanded, setAuditExpanded] = useState(false);

  const loadPharmacy = useCallback(async () => {
    if (!token) {
      setPharmacy(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setMessage(null);
      const rows = await api.getAdminPharmacies(token);
      setPharmacy(rows.find((row) => row.id === Number(pharmacyId)) ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Chargement impossible.');
      setPharmacy(null);
    } finally {
      setLoading(false);
    }
  }, [pharmacyId, token]);

  useEffect(() => {
    void loadPharmacy();
  }, [loadPharmacy]);

  const runAction = async (action: () => Promise<unknown>) => {
    try {
      setUpdating(true);
      setMessage(null);
      await action();
      await loadPharmacy();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Action impossible.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/pharmacies" />
          </IonButtons>
          <IonTitle>Admin · Detail pharmacie</IonTitle>
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
                      alt={pharmacy.name}
                      style={{
                        width: '34px',
                        height: '34px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid rgb(219, 231, 239)',
                        marginRight: '10px'
                      }}
                    />
                  ) : (
                    <IonIcon icon={businessOutline} slot="start" color="primary" />
                  )}
                  <IonLabel>
                    <h2>{pharmacy.name}</h2>
                  </IonLabel>
                  {pharmacy.pharmacy_user_id ? (
                    <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.9rem', color: '#475569' }}>Approbation</span>
                      <IonToggle
                        checked={pharmacy.account_verification_status === 'approved'}
                        disabled={updating || pharmacy.account_status === 'blocked'}
                        onIonChange={(event) => {
                          const enabled = !!event.detail.checked;
                          if (enabled) {
                            void runAction(() => api.adminApproveUser(token!, pharmacy.pharmacy_user_id!));
                          } else {
                            void runAction(() => api.adminUnapproveUser(token!, pharmacy.pharmacy_user_id!));
                          }
                        }}
                      />
                    </div>
                  ) : null}
                </IonItem>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '4px 0 8px' }}>
                  {pharmacy.account_status === 'blocked' ? <IonBadge color="danger">Bloque</IonBadge> : null}
                  <IonBadge color={pharmacy.account_verification_status === 'approved' ? 'success' : 'warning'}>
                    {pharmacy.account_verification_status === 'approved' ? 'Compte approuve' : 'Compte en attente'}
                  </IonBadge>
                  <IonBadge color={pharmacy.license_verified ? 'success' : 'warning'}>
                    {pharmacy.license_verified ? 'Licence verifiee' : 'Licence non verifiee'}
                  </IonBadge>
                  <IonBadge color={pharmacy.account_can_verify_accounts ? 'tertiary' : 'medium'}>
                    {pharmacy.account_can_verify_accounts ? 'Peut verifier' : 'Sans delegation'}
                  </IonBadge>
                </div>

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
                      <h3>Adresse</h3>
                      <p>{pharmacy.address || 'N/D'}</p>
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
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Numero de licence</h3>
                      <p>{pharmacy.license_number || 'N/D'}</p>
                    </IonLabel>
                    {pharmacy.license_number ? (
                      <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.9rem', color: '#475569' }}>Verification</span>
                        <IonToggle
                          checked={!!pharmacy.license_verified}
                          disabled={updating || pharmacy.account_status === 'blocked'}
                          onIonChange={(event) =>
                            void runAction(() =>
                              api.adminVerifyPharmacyLicense(token!, pharmacy.id, { verified: !!event.detail.checked })
                            )
                          }
                        />
                      </div>
                    ) : null}
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Email compte</h3>
                      <p>{pharmacy.pharmacy_user_email || 'N/D'}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel>
                      <h3>Mode</h3>
                      <p>{pharmacy.pharmacy_mode === 'pos_integrated' ? 'POS integre' : 'Rapide manuel'}</p>
                    </IonLabel>
                  </IonItem>
                </IonList>

                {message ? (
                  <IonText color="danger">
                    <p>{message}</p>
                  </IonText>
                ) : null}

                <div style={{ display: 'grid', gap: '6px', marginTop: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '8px' }}>
                    <span>Delegation de verification</span>
                    <IonToggle
                      checked={!!pharmacy.account_can_verify_accounts}
                      disabled={updating || pharmacy.account_status === 'blocked' || !pharmacy.pharmacy_user_id}
                      onIonChange={(event) =>
                        void runAction(() =>
                          api.adminSetPharmacyVerifierPermission(token!, pharmacy.pharmacy_user_id!, !!event.detail.checked)
                        )
                      }
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '8px' }}>
                    <span>Bloquer</span>
                    <IonToggle
                      checked={pharmacy.account_status === 'blocked'}
                      disabled={updating || !pharmacy.pharmacy_user_id}
                      color="danger"
                      onIonChange={(event) => {
                        const enabled = !!event.detail.checked;
                        if (enabled) {
                          void runAction(() => api.adminBlockUser(token!, pharmacy.pharmacy_user_id!));
                        } else {
                          void runAction(() => api.adminUnblockUser(token!, pharmacy.pharmacy_user_id!));
                        }
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <IonButton
                    size="small"
                    fill="clear"
                    color="medium"
                    style={{ width: '100%', justifyContent: 'space-between' }}
                    onClick={() => setAuditExpanded((prev) => !prev)}
                  >
                    Journal d'audit
                    <IonIcon slot="end" icon={auditExpanded ? chevronUpOutline : chevronDownOutline} />
                  </IonButton>
                  {auditExpanded ? (
                    <div style={{ border: '1px solid #dbe7ef', borderRadius: '10px', padding: '8px' }}>
                      <div>
                        Approuve par: {pharmacy.approved_by || 'N/D'}
                        {pharmacy.approved_at ? ` · ${formatDateTime(pharmacy.approved_at)}` : ''}
                      </div>
                      <div>
                        Verifie par: {pharmacy.verified_by || 'N/D'}
                        {pharmacy.verified_at ? ` · ${formatDateTime(pharmacy.verified_at)}` : ''}
                      </div>
                      <div>
                        Delegue par: {pharmacy.delegated_by_name || 'N/D'}
                        {pharmacy.delegated_at ? ` · ${formatDateTime(pharmacy.delegated_at)}` : ''}
                      </div>
                      <div>
                        Bloque par: {pharmacy.blocked_by_name || 'N/D'}
                        {pharmacy.blocked_at ? ` · ${formatDateTime(pharmacy.blocked_at)}` : ''}
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default AdminPharmacyDetailPage;

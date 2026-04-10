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
  IonButton,
} from '@ionic/react';
import { businessOutline, callOutline, chevronDownOutline, chevronUpOutline, locateOutline } from 'ionicons/icons';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPharmacy } from '../services/api';
import { useAuth } from '../state/AuthState';
import { formatDateTime } from '../utils/time';

type RouteParams = {
  hospitalId: string;
};

const AdminHospitalDetailPage: React.FC = () => {
  const { token } = useAuth();
  const { hospitalId } = useParams<RouteParams>();
  const [hospital, setHospital] = useState<ApiPharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [auditExpanded, setAuditExpanded] = useState(false);

  const loadHospital = useCallback(async () => {
    if (!token) {
      setHospital(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setMessage(null);
      const rows = await api.getAdminHospitals(token);
      setHospital(rows.find((row) => row.id === Number(hospitalId)) ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Chargement impossible.');
      setHospital(null);
    } finally {
      setLoading(false);
    }
  }, [hospitalId, token]);

  useEffect(() => {
    void loadHospital();
  }, [loadHospital]);

  const runAction = async (action: () => Promise<unknown>) => {
    try {
      setUpdating(true);
      setMessage(null);
      await action();
      await loadHospital();
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
            <IonBackButton defaultHref="/admin/hopitaux" />
          </IonButtons>
          <IonTitle>Admin · Detail hopital</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardContent>
            {loading ? (
              <IonText color="medium"><p>Chargement...</p></IonText>
            ) : !hospital ? (
              <IonText color="danger"><p>Hopital introuvable.</p></IonText>
            ) : (
              <>
                <IonItem lines="none">
                  {hospital.logo_url ? (
                    <img
                      src={hospital.logo_url}
                      alt={hospital.name}
                      style={{ width: '34px', height: '34px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgb(219, 231, 239)', marginRight: '10px' }}
                    />
                  ) : (
                    <IonIcon icon={businessOutline} slot="start" color="primary" />
                  )}
                  <IonLabel><h2>{hospital.name}</h2></IonLabel>
                  <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#475569' }}>Approbation</span>
                    <IonToggle
                      checked={hospital.account_verification_status === 'approved'}
                      disabled={updating || hospital.account_status === 'blocked'}
                      onIonChange={(event) => {
                        if (event.detail.checked) {
                          void runAction(() => api.adminApproveHospital(token!, hospital.id));
                        } else {
                          void runAction(() => api.adminUnapproveHospital(token!, hospital.id));
                        }
                      }}
                    />
                  </div>
                </IonItem>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '4px 0 8px' }}>
                  {hospital.account_status === 'blocked' ? <IonBadge color="danger">Bloque</IonBadge> : null}
                  <IonBadge color={hospital.account_verification_status === 'approved' ? 'success' : 'warning'}>
                    {hospital.account_verification_status === 'approved' ? 'Compte approuve' : 'Compte en attente'}
                  </IonBadge>
                  <IonBadge color={hospital.license_verified ? 'success' : 'warning'}>
                    {hospital.license_verified ? 'Licence verifiee' : 'Licence non verifiee'}
                  </IonBadge>
                  <IonBadge color={hospital.account_can_verify_accounts ? 'tertiary' : 'medium'}>
                    {hospital.account_can_verify_accounts ? 'Peut verifier' : 'Sans delegation'}
                  </IonBadge>
                </div>

                <IonList>
                  <IonItem lines="full">
                    <IonLabel><h3>Telephone</h3><p>{hospital.phone || 'N/D'}</p></IonLabel>
                    {hospital.phone ? <a href={`tel:${hospital.phone}`} slot="end"><IonIcon icon={callOutline} /></a> : null}
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel><h3>Adresse</h3><p>{hospital.address || 'N/D'}</p></IonLabel>
                    {hospital.latitude && hospital.longitude ? (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${hospital.latitude},${hospital.longitude}`} target="_blank" rel="noreferrer" slot="end">
                        <IonIcon icon={locateOutline} />
                      </a>
                    ) : null}
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel><h3>Numero de licence</h3><p>{hospital.license_number || 'N/D'}</p></IonLabel>
                    {hospital.license_number ? (
                      <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.9rem', color: '#475569' }}>Verification</span>
                        <IonToggle
                          checked={!!hospital.license_verified}
                          disabled={updating || hospital.account_status === 'blocked'}
                          onIonChange={(event) =>
                            void runAction(() => api.adminVerifyHospitalLicense(token!, hospital.id, { verified: !!event.detail.checked }))
                          }
                        />
                      </div>
                    ) : null}
                  </IonItem>
                </IonList>

                {message ? <IonText color="danger"><p>{message}</p></IonText> : null}

                <div style={{ display: 'grid', gap: '6px', marginTop: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '8px' }}>
                    <span>Delegation de verification</span>
                    <IonToggle
                      checked={!!hospital.account_can_verify_accounts}
                      disabled={updating || hospital.account_status === 'blocked'}
                      onIonChange={(event) =>
                        void runAction(() => api.adminSetHospitalVerifierPermission(token!, hospital.id, !!event.detail.checked))
                      }
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '8px' }}>
                    <span>Bloquer</span>
                    <IonToggle
                      checked={hospital.account_status === 'blocked'}
                      disabled={updating}
                      color="danger"
                      onIonChange={(event) => {
                        if (event.detail.checked) {
                          void runAction(() => api.adminBlockHospital(token!, hospital.id));
                        } else {
                          void runAction(() => api.adminUnblockHospital(token!, hospital.id));
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
                        Approuve par: {hospital.approved_by || 'N/D'}
                        {hospital.approved_at ? ` · ${formatDateTime(hospital.approved_at)}` : ''}
                      </div>
                      <div>
                        Verifie par: {hospital.verified_by || 'N/D'}
                        {hospital.verified_at ? ` · ${formatDateTime(hospital.verified_at)}` : ''}
                      </div>
                      <div>
                        Delegue par: {hospital.delegated_by_name || 'N/D'}
                        {hospital.delegated_at ? ` · ${formatDateTime(hospital.delegated_at)}` : ''}
                      </div>
                      <div>
                        Bloque par: {hospital.blocked_by_name || 'N/D'}
                        {hospital.blocked_at ? ` · ${formatDateTime(hospital.blocked_at)}` : ''}
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

export default AdminHospitalDetailPage;


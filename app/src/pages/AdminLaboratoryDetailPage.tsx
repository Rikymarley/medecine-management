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
import { beaker, callOutline, chevronDownOutline, chevronUpOutline, locateOutline } from 'ionicons/icons';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPharmacy } from '../services/api';
import { useAuth } from '../state/AuthState';
import { formatDateTime } from '../utils/time';

type RouteParams = {
  laboratoryId: string;
};

const AdminLaboratoryDetailPage: React.FC = () => {
  const { token } = useAuth();
  const { laboratoryId } = useParams<RouteParams>();
  const [laboratory, setLaboratory] = useState<ApiPharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [auditExpanded, setAuditExpanded] = useState(false);

  const loadLaboratory = useCallback(async () => {
    if (!token) {
      setLaboratory(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setMessage(null);
      const rows = await api.getAdminLaboratories(token);
      setLaboratory(rows.find((row) => row.id === Number(laboratoryId)) ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Chargement impossible.');
      setLaboratory(null);
    } finally {
      setLoading(false);
    }
  }, [laboratoryId, token]);

  useEffect(() => {
    void loadLaboratory();
  }, [loadLaboratory]);

  const runAction = async (action: () => Promise<unknown>) => {
    try {
      setUpdating(true);
      setMessage(null);
      await action();
      await loadLaboratory();
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
            <IonBackButton defaultHref="/admin/laboratoires" />
          </IonButtons>
          <IonTitle>Admin · Detail laboratoire</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardContent>
            {loading ? (
              <IonText color="medium"><p>Chargement...</p></IonText>
            ) : !laboratory ? (
              <IonText color="danger"><p>Laboratoire introuvable.</p></IonText>
            ) : (
              <>
                <IonItem lines="none">
                  {laboratory.logo_url ? (
                    <img
                      src={laboratory.logo_url}
                      alt={laboratory.name}
                      style={{ width: '34px', height: '34px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgb(219, 231, 239)', marginRight: '10px' }}
                    />
                  ) : (
                    <IonIcon icon={beaker} slot="start" color="primary" />
                  )}
                  <IonLabel><h2>{laboratory.name}</h2></IonLabel>
                  <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#475569' }}>Approbation</span>
                    <IonToggle
                      checked={laboratory.account_verification_status === 'approved'}
                      disabled={updating || laboratory.account_status === 'blocked'}
                      onIonChange={(event) => {
                        if (event.detail.checked) {
                          void runAction(() => api.adminApproveLaboratory(token!, laboratory.id));
                        } else {
                          void runAction(() => api.adminUnapproveLaboratory(token!, laboratory.id));
                        }
                      }}
                    />
                  </div>
                </IonItem>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '4px 0 8px' }}>
                  {laboratory.account_status === 'blocked' ? <IonBadge color="danger">Bloque</IonBadge> : null}
                  <IonBadge color={laboratory.account_verification_status === 'approved' ? 'success' : 'warning'}>
                    {laboratory.account_verification_status === 'approved' ? 'Compte approuve' : 'Compte en attente'}
                  </IonBadge>
                  <IonBadge color={laboratory.license_verified ? 'success' : 'warning'}>
                    {laboratory.license_verified ? 'Licence verifiee' : 'Licence non verifiee'}
                  </IonBadge>
                  <IonBadge color={laboratory.account_can_verify_accounts ? 'tertiary' : 'medium'}>
                    {laboratory.account_can_verify_accounts ? 'Peut verifier' : 'Sans delegation'}
                  </IonBadge>
                </div>

                <IonList>
                  <IonItem lines="full">
                    <IonLabel><h3>Telephone</h3><p>{laboratory.phone || 'N/D'}</p></IonLabel>
                    {laboratory.phone ? <a href={`tel:${laboratory.phone}`} slot="end"><IonIcon icon={callOutline} /></a> : null}
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel><h3>Adresse</h3><p>{laboratory.address || 'N/D'}</p></IonLabel>
                    {laboratory.latitude && laboratory.longitude ? (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${laboratory.latitude},${laboratory.longitude}`} target="_blank" rel="noreferrer" slot="end">
                        <IonIcon icon={locateOutline} />
                      </a>
                    ) : null}
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel><h3>Numero de licence</h3><p>{laboratory.license_number || 'N/D'}</p></IonLabel>
                    {laboratory.license_number ? (
                      <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.9rem', color: '#475569' }}>Verification</span>
                        <IonToggle
                          checked={!!laboratory.license_verified}
                          disabled={updating || laboratory.account_status === 'blocked'}
                          onIonChange={(event) =>
                            void runAction(() => api.adminVerifyLaboratoryLicense(token!, laboratory.id, { verified: !!event.detail.checked }))
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
                      checked={!!laboratory.account_can_verify_accounts}
                      disabled={updating || laboratory.account_status === 'blocked'}
                      onIonChange={(event) =>
                        void runAction(() => api.adminSetLaboratoryVerifierPermission(token!, laboratory.id, !!event.detail.checked))
                      }
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '8px' }}>
                    <span>Bloquer</span>
                    <IonToggle
                      checked={laboratory.account_status === 'blocked'}
                      disabled={updating}
                      color="danger"
                      onIonChange={(event) => {
                        if (event.detail.checked) {
                          void runAction(() => api.adminBlockLaboratory(token!, laboratory.id));
                        } else {
                          void runAction(() => api.adminUnblockLaboratory(token!, laboratory.id));
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
                        Approuve par: {laboratory.approved_by || 'N/D'}
                        {laboratory.approved_at ? ` · ${formatDateTime(laboratory.approved_at)}` : ''}
                      </div>
                      <div>
                        Verifie par: {laboratory.verified_by || 'N/D'}
                        {laboratory.verified_at ? ` · ${formatDateTime(laboratory.verified_at)}` : ''}
                      </div>
                      <div>
                        Delegue par: {laboratory.delegated_by_name || 'N/D'}
                        {laboratory.delegated_at ? ` · ${formatDateTime(laboratory.delegated_at)}` : ''}
                      </div>
                      <div>
                        Bloque par: {laboratory.blocked_by_name || 'N/D'}
                        {laboratory.blocked_at ? ` · ${formatDateTime(laboratory.blocked_at)}` : ''}
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

export default AdminLaboratoryDetailPage;


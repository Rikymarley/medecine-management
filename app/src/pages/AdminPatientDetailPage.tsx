import {
  IonBackButton,
  IonBadge,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonPage,
  IonText,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/react';
import { chevronDownOutline, chevronUpOutline, documentTextOutline, personOutline } from 'ionicons/icons';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api, ApiUser } from '../services/api';
import { useAuth } from '../state/AuthState';
import { formatDateHaiti, formatDateTime } from '../utils/time';

type RouteParams = {
  patientId: string;
};

const AdminPatientDetailPage: React.FC = () => {
  const { token } = useAuth();
  const { patientId } = useParams<RouteParams>();
  const [patient, setPatient] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isIdentityCollapsed, setIsIdentityCollapsed] = useState(false);
  const [isContactCollapsed, setIsContactCollapsed] = useState(false);
  const [isAuditCollapsed, setIsAuditCollapsed] = useState(false);
  const isIdDocumentImage = !!patient?.id_document_url && /\.(jpg|jpeg|png|webp)$/i.test(patient.id_document_url);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      setLoading(true);
      const rows = await api.getAdminUsers(token, 'patient');
      setPatient(rows.find((row) => row.id === Number(patientId)) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Echec de chargement.');
    } finally {
      setLoading(false);
    }
  }, [patientId, token]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const runAction = async (fn: () => Promise<unknown>) => {
    try {
      setUpdating(true);
      await fn();
      await load();
    } finally {
      setUpdating(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/patients" />
          </IonButtons>
          <IonTitle>Detail patient</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardContent>
            {loading ? (
              <IonText color="medium"><p>Chargement...</p></IonText>
            ) : !patient ? (
              <IonText color="danger"><p>Patient introuvable.</p></IonText>
            ) : (
              <>
                <IonItem lines="none">
                  {patient.profile_photo_url ? (
                    <img
                      src={patient.profile_photo_url}
                      alt={patient.name}
                      style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #dbe7ef', marginRight: '8px' }}
                    />
                  ) : (
                    <IonIcon icon={personOutline} slot="start" color="primary" />
                  )}
                  <IonLabel>
                    <h2>{patient.name}</h2>
                    <p>{patient.phone || 'Telephone N/D'}</p>
                  </IonLabel>
                </IonItem>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '6px 0 10px' }}>
                  {patient.account_status === 'blocked' ? <IonBadge color="danger">Bloque</IonBadge> : null}
                  <IonBadge color={patient.verification_status === 'approved' ? 'success' : 'warning'}>
                    {patient.verification_status === 'approved' ? 'Compte approuve' : 'Compte en attente'}
                  </IonBadge>
                </div>

                <div style={{ marginTop: '8px', display: 'grid', gap: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '8px' }}>
                    <span>Approbation du compte</span>
                    <IonToggle
                      checked={patient.verification_status === 'approved'}
                      disabled={updating || patient.account_status === 'blocked'}
                      onIonChange={(event) => {
                        const enabled = !!event.detail.checked;
                        if (!token) return;
                        if (enabled) {
                          void runAction(() => api.adminApproveUser(token, patient.id));
                        } else {
                          void runAction(() => api.adminUnapproveUser(token, patient.id));
                        }
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '8px' }}>
                    <span>Bloquer</span>
                    <IonToggle
                      checked={patient.account_status === 'blocked'}
                      disabled={updating}
                      color="danger"
                      onIonChange={(event) => {
                        const enabled = !!event.detail.checked;
                        if (!token) return;
                        if (enabled) {
                          void runAction(() => api.adminBlockUser(token, patient.id));
                        } else {
                          void runAction(() => api.adminUnblockUser(token, patient.id));
                        }
                      }}
                    />
                  </div>
                </div>

                <IonCard className="surface-card" style={{ margin: '12px 0 0 0' }}>
                  <IonCardHeader>
                    <IonCardTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span>Identite</span>
                      <IonIcon icon={isIdentityCollapsed ? chevronDownOutline : chevronUpOutline} onClick={() => setIsIdentityCollapsed((prev) => !prev)} />
                    </IonCardTitle>
                  </IonCardHeader>
                  {!isIdentityCollapsed ? (
                    <IonCardContent>
                      <p><strong>NINU:</strong> {patient.ninu || 'N/D'}</p>
                      <p><strong>Date de naissance:</strong> {patient.date_of_birth ? formatDateHaiti(patient.date_of_birth) : 'N/D'}</p>
                      <p><strong>Genre:</strong> {patient.gender === 'male' ? 'M' : patient.gender === 'female' ? 'F' : 'N/D'}</p>
                      <p><strong>Adresse:</strong> {patient.address || 'N/D'}</p>
                      <p>
                        <strong>Piece d'identite:</strong>{' '}
                        {patient.id_document_url ? (
                          <a href={patient.id_document_url} target="_blank" rel="noreferrer">Voir fichier</a>
                        ) : 'N/D'}
                      </p>
                      {patient.id_document_url ? (
                        <div
                          style={{
                            marginTop: '8px',
                            border: '1px solid #dbe7ef',
                            borderRadius: '10px',
                            padding: '8px',
                            background: '#f8fbff'
                          }}
                        >
                          {isIdDocumentImage ? (
                            <img
                              src={patient.id_document_url}
                              alt="Piece d'identite"
                              style={{ width: '100%', maxHeight: '220px', objectFit: 'contain', borderRadius: '8px' }}
                            />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                              <IonIcon icon={documentTextOutline} />
                              <span>Fichier non-image (PDF/document)</span>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </IonCardContent>
                  ) : null}
                </IonCard>

                <IonCard className="surface-card" style={{ margin: '8px 0 0 0' }}>
                  <IonCardHeader>
                    <IonCardTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span>Contact</span>
                      <IonIcon icon={isContactCollapsed ? chevronDownOutline : chevronUpOutline} onClick={() => setIsContactCollapsed((prev) => !prev)} />
                    </IonCardTitle>
                  </IonCardHeader>
                  {!isContactCollapsed ? (
                    <IonCardContent>
                      <p><strong>Email:</strong> {patient.email || 'N/D'}</p>
                      <p><strong>Telephone:</strong> {patient.phone || 'N/D'}</p>
                      <p><strong>WhatsApp:</strong> {patient.whatsapp || 'N/D'}</p>
                    </IonCardContent>
                  ) : null}
                </IonCard>

                <IonCard className="surface-card" style={{ margin: '8px 0 0 0' }}>
                  <IonCardHeader>
                    <IonCardTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span>Audit</span>
                      <IonIcon icon={isAuditCollapsed ? chevronDownOutline : chevronUpOutline} onClick={() => setIsAuditCollapsed((prev) => !prev)} />
                    </IonCardTitle>
                  </IonCardHeader>
                  {!isAuditCollapsed ? (
                    <IonCardContent>
                      <p><strong>Approuve par:</strong> {patient.approved_by || 'N/D'}</p>
                      <p><strong>Date approbation:</strong> {patient.approved_at ? formatDateTime(patient.approved_at) : 'N/D'}</p>
                      <p><strong>Bloque par:</strong> {patient.blocked_by_name || 'N/D'}</p>
                      <p><strong>Date blocage:</strong> {patient.blocked_at ? formatDateTime(patient.blocked_at) : 'N/D'}</p>
                    </IonCardContent>
                  ) : null}
                </IonCard>
              </>
            )}
            {error ? <IonText color="danger"><p>{error}</p></IonText> : null}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default AdminPatientDetailPage;

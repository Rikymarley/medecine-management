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
import { callOutline, chevronDownOutline, chevronUpOutline, locateOutline, logoWhatsapp, medkitOutline } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api, ApiUser } from '../services/api';
import { useAuth } from '../state/AuthState';
import { formatDateTime } from '../utils/time';

type RouteParams = {
  doctorId: string;
};

const AdminDoctorDetailPage: React.FC = () => {
  const { token } = useAuth();
  const { doctorId } = useParams<RouteParams>();
  const [doctor, setDoctor] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [auditExpanded, setAuditExpanded] = useState(false);

  const loadDoctor = async () => {
    if (!token) {
      setDoctor(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      const rows = await api.getAdminUsers(token, 'doctor');
      setDoctor(rows.find((row) => row.id === Number(doctorId)) ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Chargement impossible.');
      setDoctor(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDoctor();
  }, [token, doctorId]);

  const runAction = async (action: () => Promise<unknown>) => {
    try {
      setUpdating(true);
      setMessage(null);
      await action();
      await loadDoctor();
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
            <IonBackButton defaultHref="/admin/doctors" />
          </IonButtons>
          <IonTitle>Admin · Detail medecin</IonTitle>
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
            ) : !doctor ? (
              <IonText color="danger">
                <p>Medecin introuvable.</p>
              </IonText>
            ) : (
              <>
                <IonItem lines="none">
                  <IonIcon icon={medkitOutline} slot="start" color="success" />
                  <IonLabel>
                    <h2>{doctor.name}</h2>
                    <p>{doctor.specialty || 'Specialite non renseignee'}</p>
                  </IonLabel>
                  <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#475569' }}>Approbation</span>
                    <IonToggle
                      checked={doctor.verification_status === 'approved'}
                      disabled={updating || doctor.account_status === 'blocked'}
                      onIonChange={(event) => {
                        const enabled = !!event.detail.checked;
                        if (enabled) {
                          void runAction(() => api.adminApproveUser(token!, doctor.id));
                        } else {
                          void runAction(() => api.adminUnapproveUser(token!, doctor.id));
                        }
                      }}
                    />
                  </div>
                </IonItem>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '4px 0 8px' }}>
                  {doctor.account_status === 'blocked' ? <IonBadge color="danger">Bloque</IonBadge> : null}
                  <IonBadge color={doctor.verification_status === 'approved' ? 'success' : 'warning'}>
                    {doctor.verification_status === 'approved' ? 'Compte approuve' : 'Compte en attente'}
                  </IonBadge>
                  <IonBadge color={doctor.license_verified ? 'success' : 'warning'}>
                    {doctor.license_verified ? 'Licence verifiee' : 'Licence non verifiee'}
                  </IonBadge>
                  <IonBadge color={doctor.can_verify_accounts ? 'tertiary' : 'medium'}>
                    {doctor.can_verify_accounts ? 'Peut verifier' : 'Sans delegation'}
                  </IonBadge>
                </div>

                <IonList>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Telephone</h3>
                      <p>{doctor.phone || 'N/D'}</p>
                    </IonLabel>
                    {doctor.phone ? (
                      <a href={`tel:${doctor.phone}`} slot="end">
                        <IonIcon icon={callOutline} />
                      </a>
                    ) : null}
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>WhatsApp</h3>
                      <p>{doctor.whatsapp || 'N/D'}</p>
                    </IonLabel>
                    {doctor.whatsapp ? (
                      <a href={`https://wa.me/${doctor.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" slot="end">
                        <IonIcon icon={logoWhatsapp} />
                      </a>
                    ) : null}
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Adresse</h3>
                      <p>{doctor.address || 'N/D'}</p>
                      <p>
                        {doctor.city || 'N/D'}
                        {doctor.department ? ` (${doctor.department})` : ''}
                      </p>
                    </IonLabel>
                    {doctor.latitude && doctor.longitude ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${doctor.latitude},${doctor.longitude}`}
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
                      <p>{doctor.license_number || 'N/D'}</p>
                    </IonLabel>
                    {doctor.license_number ? (
                      <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.9rem', color: '#475569' }}>Verification</span>
                        <IonToggle
                          checked={!!doctor.license_verified}
                          disabled={updating || doctor.account_status === 'blocked'}
                          onIonChange={(event) =>
                            void runAction(() =>
                              api.adminVerifyDoctorLicense(token!, doctor.id, { verified: !!event.detail.checked })
                            )
                          }
                        />
                      </div>
                    ) : null}
                  </IonItem>
                  <IonItem lines="full">
                    <IonLabel>
                      <h3>Experience</h3>
                      <p>{doctor.years_experience ? `${doctor.years_experience} ans` : 'N/D'}</p>
                    </IonLabel>
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel>
                      <h3>Bio</h3>
                      <p>{doctor.bio || 'N/D'}</p>
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
                      checked={!!doctor.can_verify_accounts}
                      disabled={updating || doctor.account_status === 'blocked'}
                      onIonChange={(event) =>
                        void runAction(() =>
                          api.adminSetDoctorVerifierPermission(token!, doctor.id, !!event.detail.checked)
                        )
                      }
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '8px' }}>
                    <span>Bloquer</span>
                    <IonToggle
                      checked={doctor.account_status === 'blocked'}
                      disabled={updating}
                      color="danger"
                      onIonChange={(event) => {
                        const enabled = !!event.detail.checked;
                        if (enabled) {
                          void runAction(() => api.adminBlockUser(token!, doctor.id));
                        } else {
                          void runAction(() => api.adminUnblockUser(token!, doctor.id));
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
                        Approuve par: {doctor.approved_by || 'N/D'}
                        {doctor.approved_at ? ` · ${formatDateTime(doctor.approved_at)}` : ''}
                      </div>
                      <div>
                        Verifie par: {doctor.license_verified_by_doctor_name || 'N/D'}
                        {doctor.license_verified_at ? ` · ${formatDateTime(doctor.license_verified_at)}` : ''}
                      </div>
                      <div>
                        Delegue par: {doctor.delegated_by_name || 'N/D'}
                        {doctor.delegated_at ? ` · ${formatDateTime(doctor.delegated_at)}` : ''}
                      </div>
                      <div>
                        Bloque par: {doctor.blocked_by_name || 'N/D'}
                        {doctor.blocked_at ? ` · ${formatDateTime(doctor.blocked_at)}` : ''}
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

export default AdminDoctorDetailPage;

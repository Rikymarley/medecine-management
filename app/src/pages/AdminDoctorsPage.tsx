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
  IonPage,
  IonSearchbar,
  IonText,
  IonToggle,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { chevronDownOutline, chevronUpOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiUser } from '../services/api';
import { useAuth } from '../state/AuthState';

const formatDate = (value?: string | null) => {
  if (!value) return 'N/D';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'N/D' : d.toLocaleString('fr-HT');
};

type FilterKey = 'all' | 'pending_account' | 'unverified_license' | 'blocked' | 'can_verify';

const AdminDoctorsPage: React.FC = () => {
  const { token } = useAuth();
  const [rows, setRows] = useState<ApiUser[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [auditExpanded, setAuditExpanded] = useState<Record<number, boolean>>({});

  const load = async () => {
    if (!token) return;
    try {
      setError(null);
      const data = await api.getAdminUsers(token, 'doctor');
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Echec de chargement.');
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [token]);

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => `${row.name} ${row.email} ${row.specialty ?? ''}`.toLowerCase().includes(q));
  }, [rows, query]);

  const filtered = useMemo(() => {
    if (filter === 'all') return searched;
    if (filter === 'pending_account') return searched.filter((row) => row.verification_status !== 'approved');
    if (filter === 'unverified_license') return searched.filter((row) => !row.license_verified);
    if (filter === 'blocked') return searched.filter((row) => row.account_status === 'blocked');
    return searched.filter((row) => row.can_verify_accounts);
  }, [searched, filter]);

  const kpis = useMemo(() => ({
    total: rows.length,
    pendingAccount: rows.filter((row) => row.verification_status !== 'approved').length,
    unverifiedLicense: rows.filter((row) => !row.license_verified).length,
    blocked: rows.filter((row) => row.account_status === 'blocked').length,
    canVerify: rows.filter((row) => !!row.can_verify_accounts).length
  }), [rows]);

  const priorityRows = useMemo(
    () => filtered.filter((row) => row.account_status === 'blocked' || row.verification_status !== 'approved' || !row.license_verified),
    [filtered]
  );
  const compliantRows = useMemo(
    () => filtered.filter((row) => row.account_status !== 'blocked' && row.verification_status === 'approved' && row.license_verified),
    [filtered]
  );

  const approve = async (userId: number) => {
    if (!token) return;
    try {
      setBusyId(userId);
      await api.adminApproveUser(token, userId);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const unapprove = async (userId: number) => {
    if (!token) return;
    try {
      setBusyId(userId);
      await api.adminUnapproveUser(token, userId);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const block = async (userId: number) => {
    if (!token) return;
    try {
      setBusyId(userId);
      await api.adminBlockUser(token, userId);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const unblock = async (userId: number) => {
    if (!token) return;
    try {
      setBusyId(userId);
      await api.adminUnblockUser(token, userId);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const verifyLicense = async (userId: number) => {
    if (!token) return;
    try {
      setBusyId(userId);
      await api.adminVerifyDoctorLicense(token, userId, { verified: true });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const unverifyLicense = async (userId: number) => {
    if (!token) return;
    try {
      setBusyId(userId);
      await api.adminVerifyDoctorLicense(token, userId, { verified: false });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const setVerifierPermission = async (userId: number, enabled: boolean) => {
    if (!token) return;
    try {
      setBusyId(userId);
      await api.adminSetDoctorVerifierPermission(token, userId, enabled);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const renderDoctorCard = (doctor: ApiUser) => (
    <IonCard key={doctor.id} className="surface-card" style={{ margin: '8px 0' }}>
      <IonCardContent>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
          <div>
            <h3>{doctor.name}</h3>
            <p>{doctor.email}</p>
            <p>{doctor.specialty || 'Specialite N/D'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
          {doctor.account_status === 'blocked' ? <IonBadge color="danger">Bloque</IonBadge> : null}
          <IonBadge color={doctor.verification_status === 'approved' ? 'success' : 'warning'}>
            {doctor.verification_status === 'approved' ? 'Compte OK' : 'Compte attente'}
          </IonBadge>
          <IonBadge color={doctor.license_verified ? 'success' : 'warning'}>
            {doctor.license_verified ? 'Licence OK' : 'Licence attente'}
          </IonBadge>
          <IonBadge color={doctor.can_verify_accounts ? 'tertiary' : 'medium'}>
            {doctor.can_verify_accounts ? 'Delegue verif' : 'Sans delegation'}
          </IonBadge>
        </div>

        <div style={{ marginTop: '10px', display: 'grid', gap: '6px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '8px' }}>
            <span>Approbation du compte</span>
            <IonToggle
              checked={doctor.verification_status === 'approved'}
              disabled={busyId === doctor.id || doctor.account_status === 'blocked'}
              onIonChange={(event) => {
                const enabled = !!event.detail.checked;
                if (enabled) {
                  void approve(doctor.id);
                } else {
                  void unapprove(doctor.id);
                }
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '8px' }}>
            <span>Verification de la licence</span>
            <IonToggle
              checked={!!doctor.license_verified}
              disabled={busyId === doctor.id || doctor.account_status === 'blocked'}
              onIonChange={(event) => {
                const enabled = !!event.detail.checked;
                if (enabled) {
                  void verifyLicense(doctor.id);
                } else {
                  void unverifyLicense(doctor.id);
                }
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '8px' }}>
            <span>Delegation de verification</span>
            <IonToggle
              checked={!!doctor.can_verify_accounts}
              disabled={busyId === doctor.id || doctor.account_status === 'blocked'}
              onIonChange={(event) => void setVerifierPermission(doctor.id, !!event.detail.checked)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '8px' }}>
            <span>Bloquer</span>
            <IonToggle
              checked={doctor.account_status === 'blocked'}
              disabled={busyId === doctor.id}
              color="danger"
              onIonChange={(event) => {
                const enabled = !!event.detail.checked;
                if (enabled) {
                  void block(doctor.id);
                } else {
                  void unblock(doctor.id);
                }
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: '10px' }}>
          <IonButton
            size="small"
            fill="clear"
            color="medium"
            style={{ width: '100%', justifyContent: 'space-between' }}
            onClick={() => setAuditExpanded((prev) => ({ ...prev, [doctor.id]: !prev[doctor.id] }))}
          >
            Journal d'audit
            <IonIcon slot="end" icon={auditExpanded[doctor.id] ? chevronUpOutline : chevronDownOutline} />
          </IonButton>
          {auditExpanded[doctor.id] ? (
            <div style={{ border: '1px solid #dbe7ef', borderRadius: '10px', padding: '8px' }}>
              <div>Approuve par: {doctor.approved_by || 'N/D'} · {formatDate(doctor.approved_at)}</div>
              <div>Verifie par: {doctor.license_verified_by_doctor_name || 'N/D'} · {formatDate(doctor.license_verified_at)}</div>
              <div>Delegue par: {doctor.delegated_by_name || 'N/D'} · {formatDate(doctor.delegated_at)}</div>
              <div>Bloque par: {doctor.blocked_by_name || 'N/D'} · {formatDate(doctor.blocked_at)}</div>
            </div>
          ) : null}
        </div>
      </IonCardContent>
    </IonCard>
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin" />
          </IonButtons>
          <IonTitle>Admin · Medecins</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardContent>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '8px', marginBottom: '10px' }}>
              <IonBadge
                color={filter === 'all' ? 'primary' : 'light'}
                style={{ width: '100%', gridColumn: '1 / -1', padding: '10px', justifyContent: 'center', cursor: 'pointer' }}
                onClick={() => setFilter('all')}
              >
                Total: {kpis.total}
              </IonBadge>
              <IonBadge
                color={filter === 'pending_account' ? 'primary' : 'warning'}
                style={{ padding: '10px', justifyContent: 'center', cursor: 'pointer' }}
                onClick={() => setFilter('pending_account')}
              >
                En attente: {kpis.pendingAccount}
              </IonBadge>
              <IonBadge
                color={filter === 'unverified_license' ? 'primary' : 'warning'}
                style={{ padding: '10px', justifyContent: 'center', cursor: 'pointer' }}
                onClick={() => setFilter('unverified_license')}
              >
                Licences non verifiees: {kpis.unverifiedLicense}
              </IonBadge>
              <IonBadge
                color={filter === 'blocked' ? 'primary' : 'danger'}
                style={{ padding: '10px', justifyContent: 'center', cursor: 'pointer' }}
                onClick={() => setFilter('blocked')}
              >
                Bloques: {kpis.blocked}
              </IonBadge>
              <IonBadge
                color={filter === 'can_verify' ? 'primary' : 'tertiary'}
                style={{ padding: '10px', justifyContent: 'center', cursor: 'pointer' }}
                onClick={() => setFilter('can_verify')}
              >
                Peut verifier: {kpis.canVerify}
              </IonBadge>
            </div>
            <IonSearchbar
              value={query}
              placeholder="Rechercher nom, email, specialite..."
              onIonInput={(event) => setQuery(event.detail.value ?? '')}
            />
            <div style={{ marginBottom: '8px' }}>
              {filter !== 'all' ? (
                <IonButton size="small" fill="clear" color="medium" onClick={() => setFilter('all')}>
                  Reinitialiser
                </IonButton>
              ) : null}
            </div>
            {error ? (
              <IonText color="danger"><p>{error}</p></IonText>
            ) : null}
            {priorityRows.length > 0 ? (
              <IonText color="dark"><p style={{ fontWeight: 700 }}>A traiter maintenant ({priorityRows.length})</p></IonText>
            ) : null}
            <div>{priorityRows.map((doctor) => renderDoctorCard(doctor))}</div>
            {compliantRows.length > 0 ? (
              <IonText color="medium"><p style={{ fontWeight: 700, marginTop: '12px' }}>Deja conformes ({compliantRows.length})</p></IonText>
            ) : null}
            <div>{compliantRows.map((doctor) => renderDoctorCard(doctor))}</div>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default AdminDoctorsPage;

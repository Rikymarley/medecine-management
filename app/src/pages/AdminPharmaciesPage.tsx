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
import { api, ApiPharmacy } from '../services/api';
import { useAuth } from '../state/AuthState';

const formatDate = (value?: string | null) => {
  if (!value) return 'N/D';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'N/D' : d.toLocaleString('fr-HT');
};

type FilterKey = 'all' | 'pending_account' | 'unverified_license' | 'blocked' | 'can_verify';

const AdminPharmaciesPage: React.FC = () => {
  const { token } = useAuth();
  const [rows, setRows] = useState<ApiPharmacy[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [auditExpanded, setAuditExpanded] = useState<Record<number, boolean>>({});

  const load = async () => {
    if (!token) return;
    try {
      setError(null);
      const data = await api.getAdminPharmacies(token);
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
    return rows.filter((row) => `${row.name} ${row.address ?? ''} ${row.pharmacy_user_email ?? ''}`.toLowerCase().includes(q));
  }, [rows, query]);

  const filtered = useMemo(() => {
    if (filter === 'all') return searched;
    if (filter === 'pending_account') return searched.filter((row) => row.account_verification_status !== 'approved');
    if (filter === 'unverified_license') return searched.filter((row) => !row.license_verified);
    if (filter === 'blocked') return searched.filter((row) => row.account_status === 'blocked');
    return searched.filter((row) => !!row.account_can_verify_accounts);
  }, [searched, filter]);

  const kpis = useMemo(() => ({
    total: rows.length,
    pendingAccount: rows.filter((row) => row.account_verification_status !== 'approved').length,
    unverifiedLicense: rows.filter((row) => !row.license_verified).length,
    blocked: rows.filter((row) => row.account_status === 'blocked').length,
    canVerify: rows.filter((row) => !!row.account_can_verify_accounts).length
  }), [rows]);

  const priorityRows = useMemo(
    () => filtered.filter((row) => row.account_status === 'blocked' || row.account_verification_status !== 'approved' || !row.license_verified),
    [filtered]
  );
  const compliantRows = useMemo(
    () => filtered.filter((row) => row.account_status !== 'blocked' && row.account_verification_status === 'approved' && row.license_verified),
    [filtered]
  );

  const approveAccount = async (row: ApiPharmacy) => {
    if (!token || !row.pharmacy_user_id) return;
    try {
      setBusyId(row.id);
      await api.adminApproveUser(token, row.pharmacy_user_id);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const unapproveAccount = async (row: ApiPharmacy) => {
    if (!token || !row.pharmacy_user_id) return;
    try {
      setBusyId(row.id);
      await api.adminUnapproveUser(token, row.pharmacy_user_id);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const blockAccount = async (row: ApiPharmacy) => {
    if (!token || !row.pharmacy_user_id) return;
    try {
      setBusyId(row.id);
      await api.adminBlockUser(token, row.pharmacy_user_id);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const unblockAccount = async (row: ApiPharmacy) => {
    if (!token || !row.pharmacy_user_id) return;
    try {
      setBusyId(row.id);
      await api.adminUnblockUser(token, row.pharmacy_user_id);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const verifyLicense = async (pharmacyId: number) => {
    if (!token) return;
    try {
      setBusyId(pharmacyId);
      await api.adminVerifyPharmacyLicense(token, pharmacyId, { verified: true });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const unverifyLicense = async (pharmacyId: number) => {
    if (!token) return;
    try {
      setBusyId(pharmacyId);
      await api.adminVerifyPharmacyLicense(token, pharmacyId, { verified: false });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const setDelegation = async (row: ApiPharmacy, enabled: boolean) => {
    if (!token || !row.pharmacy_user_id) return;
    try {
      setBusyId(row.id);
      await api.adminSetPharmacyVerifierPermission(token, row.pharmacy_user_id, enabled);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const renderPharmacyCard = (pharmacy: ApiPharmacy) => (
    <IonCard key={pharmacy.id} className="surface-card" style={{ margin: '8px 0' }}>
      <IonCardContent>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
          <div>
            <h3>{pharmacy.name}</h3>
            <p>{pharmacy.address || 'Adresse N/D'}</p>
            <p>Compte: {pharmacy.pharmacy_user_email || 'N/D'}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
          {pharmacy.account_status === 'blocked' ? (
            <IonBadge color="danger">Bloque</IonBadge>
          ) : null}
          <IonBadge color={pharmacy.account_verification_status === 'approved' ? 'success' : 'warning'}>
            {pharmacy.account_verification_status === 'approved' ? 'Compte OK' : 'Compte attente'}
          </IonBadge>
          <IonBadge color={pharmacy.license_verified ? 'success' : 'warning'}>
            {pharmacy.license_verified ? 'Licence OK' : 'Licence attente'}
          </IonBadge>
          <IonBadge color={pharmacy.account_can_verify_accounts ? 'tertiary' : 'medium'}>
            {pharmacy.account_can_verify_accounts ? 'Delegue verif' : 'Sans delegation'}
          </IonBadge>
        </div>

        <div style={{ marginTop: '10px', display: 'grid', gap: '6px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '8px' }}>
            <span>Approbation du compte</span>
            <IonToggle
              checked={pharmacy.account_verification_status === 'approved'}
              disabled={busyId === pharmacy.id || pharmacy.account_status === 'blocked' || !pharmacy.pharmacy_user_id}
              onIonChange={(event) => {
                const enabled = !!event.detail.checked;
                if (enabled) {
                  void approveAccount(pharmacy);
                } else {
                  void unapproveAccount(pharmacy);
                }
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '8px' }}>
            <span>Verification de la licence</span>
            <IonToggle
              checked={!!pharmacy.license_verified}
              disabled={busyId === pharmacy.id || pharmacy.account_status === 'blocked'}
              onIonChange={(event) => {
                const enabled = !!event.detail.checked;
                if (enabled) {
                  void verifyLicense(pharmacy.id);
                } else {
                  void unverifyLicense(pharmacy.id);
                }
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '8px' }}>
            <span>Delegation de verification</span>
            <IonToggle
              checked={!!pharmacy.account_can_verify_accounts}
              disabled={busyId === pharmacy.id || pharmacy.account_status === 'blocked' || !pharmacy.pharmacy_user_id}
              onIonChange={(event) => void setDelegation(pharmacy, !!event.detail.checked)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '8px' }}>
            <span>Bloquer</span>
            <IonToggle
              checked={pharmacy.account_status === 'blocked'}
              disabled={busyId === pharmacy.id || !pharmacy.pharmacy_user_id}
              color="danger"
              onIonChange={(event) => {
                const enabled = !!event.detail.checked;
                if (enabled) {
                  void blockAccount(pharmacy);
                } else {
                  void unblockAccount(pharmacy);
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
            onClick={() => setAuditExpanded((prev) => ({ ...prev, [pharmacy.id]: !prev[pharmacy.id] }))}
          >
            Journal d'audit
            <IonIcon slot="end" icon={auditExpanded[pharmacy.id] ? chevronUpOutline : chevronDownOutline} />
          </IonButton>
          {auditExpanded[pharmacy.id] ? (
            <div style={{ border: '1px solid #dbe7ef', borderRadius: '10px', padding: '8px' }}>
              <div>Approuve par: {pharmacy.approved_by || 'N/D'} · {formatDate(pharmacy.approved_at)}</div>
              <div>Verifie par: {pharmacy.verified_by || 'N/D'} · {formatDate(pharmacy.verified_at)}</div>
              <div>Bloque par: {pharmacy.blocked_by_name || 'N/D'} · {formatDate(pharmacy.blocked_at)}</div>
              <div>Delegue par: {pharmacy.delegated_by_name || 'N/D'} · {formatDate(pharmacy.delegated_at)}</div>
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
          <IonTitle>Admin · Pharmacies</IonTitle>
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
              placeholder="Rechercher nom, adresse, email..."
              onIonInput={(event) => setQuery(event.detail.value ?? '')}
            />
            {filter !== 'all' ? (
              <div style={{ marginBottom: '8px' }}>
                <IonBadge color="medium" style={{ padding: '8px', cursor: 'pointer' }} onClick={() => setFilter('all')}>
                  Reinitialiser filtre
                </IonBadge>
              </div>
            ) : null}
            {error ? <IonText color="danger"><p>{error}</p></IonText> : null}
            {priorityRows.length > 0 ? (
              <IonText color="dark"><p style={{ fontWeight: 700 }}>A traiter maintenant ({priorityRows.length})</p></IonText>
            ) : null}
            <div>{priorityRows.map((pharmacy) => renderPharmacyCard(pharmacy))}</div>
            {compliantRows.length > 0 ? (
              <IonText color="medium"><p style={{ fontWeight: 700, marginTop: '12px' }}>Deja conformes ({compliantRows.length})</p></IonText>
            ) : null}
            <div>{compliantRows.map((pharmacy) => renderPharmacyCard(pharmacy))}</div>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default AdminPharmaciesPage;

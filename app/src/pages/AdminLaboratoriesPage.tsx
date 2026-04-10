import {
  IonBackButton,
  IonBadge,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSearchbar,
  IonText,
  IonTitle,
  IonToolbar,
  useIonRouter,
  useIonViewWillEnter
} from '@ionic/react';
import { beaker } from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPharmacy } from '../services/api';
import { useAuth } from '../state/AuthState';

type FilterKey = 'all' | 'pending_account' | 'unverified_license' | 'blocked' | 'can_verify';

const AdminLaboratoriesPage: React.FC = () => {
  const ionRouter = useIonRouter();
  const { token } = useAuth();
  const [rows, setRows] = useState<ApiPharmacy[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      const data = await api.getAdminLaboratories(token);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Echec de chargement.');
    }
  }, [token]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  useIonViewWillEnter(() => {
    load().catch(() => undefined);
  });

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

  const renderLabCard = (lab: ApiPharmacy) => (
    <IonCard
      key={lab.id}
      className="surface-card"
      style={{ margin: '8px 0', cursor: 'pointer' }}
      button
      onClick={() => ionRouter.push(`/admin/laboratoires/${lab.id}`, 'forward', 'push')}
    >
      <IonCardContent>
        <div style={{ display: 'block' }}>
          <div>
            {lab.logo_url ? (
              <img
                src={lab.logo_url}
                alt={lab.name}
                style={{
                  width: '34px',
                  height: '34px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  border: '1px solid rgb(219, 231, 239)',
                  marginRight: '10px',
                  float: 'left'
                }}
              />
            ) : (
              <IonIcon icon={beaker} color="primary" style={{ marginRight: '10px', float: 'left', fontSize: '26px' }} />
            )}
            <h3>{lab.name}</h3>
            <p>{lab.address || 'Adresse N/D'}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
          {lab.account_status === 'blocked' ? <IonBadge color="danger">Bloque</IonBadge> : null}
          <IonBadge color={lab.license_verified ? 'success' : 'warning'}>
            {lab.license_verified ? 'Licence OK' : 'Licence attente'}
          </IonBadge>
          <IonBadge color={lab.account_can_verify_accounts ? 'tertiary' : 'medium'}>
            {lab.account_can_verify_accounts ? 'Delegue verif' : 'Sans delegation'}
          </IonBadge>
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
          <IonTitle>Admin · Laboratoires</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardContent>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '8px', marginBottom: '10px' }}>
              <IonBadge color={filter === 'all' ? 'primary' : 'light'} style={{ width: '100%', gridColumn: '1 / -1', padding: '10px', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setFilter('all')}>
                Total: {kpis.total}
              </IonBadge>
              <IonBadge color={filter === 'pending_account' ? 'primary' : 'warning'} style={{ padding: '10px', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setFilter('pending_account')}>
                En attente: {kpis.pendingAccount}
              </IonBadge>
              <IonBadge color={filter === 'unverified_license' ? 'primary' : 'warning'} style={{ padding: '10px', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setFilter('unverified_license')}>
                Licences non verifiees: {kpis.unverifiedLicense}
              </IonBadge>
              <IonBadge color={filter === 'blocked' ? 'primary' : 'danger'} style={{ padding: '10px', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setFilter('blocked')}>
                Bloques: {kpis.blocked}
              </IonBadge>
              <IonBadge color={filter === 'can_verify' ? 'primary' : 'tertiary'} style={{ padding: '10px', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setFilter('can_verify')}>
                Peut verifier: {kpis.canVerify}
              </IonBadge>
            </div>
            <IonSearchbar value={query} placeholder="Rechercher nom, adresse..." onIonInput={(event) => setQuery(event.detail.value ?? '')} />
            {filter !== 'all' ? (
              <div style={{ marginBottom: '8px' }}>
                <IonBadge color="medium" style={{ padding: '8px', cursor: 'pointer' }} onClick={() => setFilter('all')}>
                  Reinitialiser filtre
                </IonBadge>
              </div>
            ) : null}
            {error ? <IonText color="danger"><p>{error}</p></IonText> : null}
            {priorityRows.length > 0 ? <IonText color="dark"><p style={{ fontWeight: 700 }}>A traiter maintenant ({priorityRows.length})</p></IonText> : null}
            <div>{priorityRows.map((lab) => renderLabCard(lab))}</div>
            {compliantRows.length > 0 ? <IonText color="medium"><p style={{ fontWeight: 700, marginTop: '12px' }}>Deja conformes ({compliantRows.length})</p></IonText> : null}
            <div>{compliantRows.map((lab) => renderLabCard(lab))}</div>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default AdminLaboratoriesPage;

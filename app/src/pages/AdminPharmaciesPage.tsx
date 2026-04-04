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
  useIonViewWillEnter
} from '@ionic/react';
import { businessOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPharmacy } from '../services/api';
import { useAuth } from '../state/AuthState';

type FilterKey = 'all' | 'pending_account' | 'unverified_license' | 'blocked' | 'can_verify';

const AdminPharmaciesPage: React.FC = () => {
  const history = useHistory();
  const { token } = useAuth();
  const [rows, setRows] = useState<ApiPharmacy[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [error, setError] = useState<string | null>(null);

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

  const renderPharmacyCard = (pharmacy: ApiPharmacy) => (
    <IonCard
      key={pharmacy.id}
      className="surface-card"
      style={{ margin: '8px 0', cursor: 'pointer' }}
      onClick={() => history.push(`/admin/pharmacies/${pharmacy.id}`)}
    >
      <IonCardContent>
        <div style={{ display: 'block' }}>
          <div>
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
                  marginRight: '10px',
                  float: 'left'
                }}
              />
            ) : (
              <IonIcon icon={businessOutline} color="primary" style={{ marginRight: '10px', float: 'left', fontSize: '26px' }} />
            )}
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

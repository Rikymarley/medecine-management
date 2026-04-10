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
  IonTitle,
  IonToolbar,
  useIonViewWillEnter
} from '@ionic/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiUser } from '../services/api';
import { useAuth } from '../state/AuthState';

type ManagedRole = 'hopital' | 'laboratoire' | 'secretaire';

type Props = {
  role: ManagedRole;
  title: string;
  icon: string;
};

const AdminRoleAccountsPage: React.FC<Props> = ({ role, title, icon }) => {
  const { token } = useAuth();
  const [rows, setRows] = useState<ApiUser[]>([]);
  const [query, setQuery] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      const data = await api.getAdminUsers(token, role);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Echec de chargement.');
    }
  }, [role, token]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  useIonViewWillEnter(() => {
    load().catch(() => undefined);
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => `${row.name} ${row.email} ${row.phone ?? ''}`.toLowerCase().includes(q));
  }, [rows, query]);

  const kpis = useMemo(() => ({
    total: rows.length,
    approved: rows.filter((row) => row.verification_status === 'approved').length,
    pending: rows.filter((row) => row.verification_status !== 'approved').length,
    blocked: rows.filter((row) => row.account_status === 'blocked').length
  }), [rows]);

  const setApproval = async (row: ApiUser, approved: boolean) => {
    if (!token) return;
    setSavingId(row.id);
    setError(null);
    setMessage(null);
    try {
      if (approved) {
        await api.adminApproveUser(token, row.id);
      } else {
        await api.adminUnapproveUser(token, row.id);
      }
      setRows((prev) =>
        prev.map((u) =>
          u.id === row.id
            ? { ...u, verification_status: approved ? 'approved' : 'pending' }
            : u
        )
      );
      setMessage(approved ? 'Compte approuve.' : 'Compte remis en attente.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operation impossible.');
    } finally {
      setSavingId(null);
    }
  };

  const setBlocked = async (row: ApiUser, blocked: boolean) => {
    if (!token) return;
    setSavingId(row.id);
    setError(null);
    setMessage(null);
    try {
      if (blocked) {
        await api.adminBlockUser(token, row.id);
      } else {
        await api.adminUnblockUser(token, row.id);
      }
      setRows((prev) =>
        prev.map((u) =>
          u.id === row.id
            ? { ...u, account_status: blocked ? 'blocked' : 'active' }
            : u
        )
      );
      setMessage(blocked ? 'Compte bloque.' : 'Compte debloque.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operation impossible.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin" />
          </IonButtons>
          <IonTitle>Admin · {title}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardContent>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '8px', marginBottom: '10px' }}>
              <IonBadge color="primary" style={{ width: '100%', gridColumn: '1 / -1', padding: '10px', justifyContent: 'center' }}>
                Total: {kpis.total}
              </IonBadge>
              <IonBadge color="success" style={{ padding: '10px', justifyContent: 'center' }}>
                Approuves: {kpis.approved}
              </IonBadge>
              <IonBadge color="warning" style={{ padding: '10px', justifyContent: 'center' }}>
                En attente: {kpis.pending}
              </IonBadge>
              <IonBadge color="danger" style={{ padding: '10px', justifyContent: 'center' }}>
                Bloques: {kpis.blocked}
              </IonBadge>
            </div>
            <IonSearchbar
              value={query}
              placeholder="Rechercher nom, email, telephone..."
              onIonInput={(event) => setQuery(event.detail.value ?? '')}
            />
            {message ? <IonText color="success"><p>{message}</p></IonText> : null}
            {error ? <IonText color="danger"><p>{error}</p></IonText> : null}
            <div style={{ display: 'grid', gap: '8px' }}>
              {filtered.map((row) => {
                const loading = savingId === row.id;
                const isApproved = row.verification_status === 'approved';
                const isBlocked = row.account_status === 'blocked';
                return (
                  <IonCard key={row.id} className="surface-card" style={{ margin: 0 }}>
                    <IonCardContent>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <IonIcon icon={icon} style={{ fontSize: '24px', color: '#64748b' }} />
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: 0 }}>{row.name}</h3>
                          <p style={{ margin: '2px 0 0 0' }}>{row.email}</p>
                          <p style={{ margin: '2px 0 0 0' }}>{row.phone || 'Telephone N/D'}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                        <IonBadge color={isApproved ? 'success' : 'warning'}>
                          {isApproved ? 'Approuve' : 'En attente'}
                        </IonBadge>
                        {isBlocked ? <IonBadge color="danger">Bloque</IonBadge> : null}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                        <IonButton
                          size="small"
                          fill="outline"
                          color={isApproved ? 'warning' : 'success'}
                          disabled={loading}
                          onClick={() => setApproval(row, !isApproved)}
                        >
                          {isApproved ? 'Remettre en attente' : 'Approuver'}
                        </IonButton>
                        <IonButton
                          size="small"
                          fill="outline"
                          color={isBlocked ? 'success' : 'danger'}
                          disabled={loading}
                          onClick={() => setBlocked(row, !isBlocked)}
                        >
                          {isBlocked ? 'Debloquer' : 'Bloquer'}
                        </IonButton>
                      </div>
                    </IonCardContent>
                  </IonCard>
                );
              })}
            </div>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default AdminRoleAccountsPage;


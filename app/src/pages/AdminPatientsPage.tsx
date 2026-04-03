import {
  IonBackButton,
  IonBadge,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSearchbar,
  IonText,
  IonToggle,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiUser } from '../services/api';
import { useAuth } from '../state/AuthState';

const formatDate = (value?: string | null) => {
  if (!value) return 'N/D';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'N/D' : d.toLocaleString('fr-HT');
};

const AdminPatientsPage: React.FC = () => {
  const { token } = useAuth();
  const [rows, setRows] = useState<ApiUser[]>([]);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    try {
      setError(null);
      const data = await api.getAdminUsers(token, 'patient');
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Echec de chargement.');
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [token]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => `${row.name} ${row.email} ${row.phone ?? ''}`.toLowerCase().includes(q));
  }, [rows, query]);

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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin" />
          </IonButtons>
          <IonTitle>Admin · Patients</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardContent>
            <IonSearchbar
              value={query}
              placeholder="Rechercher nom, email, telephone..."
              onIonInput={(event) => setQuery(event.detail.value ?? '')}
            />
            {error ? <IonText color="danger"><p>{error}</p></IonText> : null}
            <IonList>
              {filtered.map((patient) => (
                <IonItem key={patient.id} lines="full">
                  <IonLabel>
                    <h3>{patient.name}</h3>
                    <p>{patient.email}</p>
                    <p>{patient.phone || 'Telephone N/D'}</p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {patient.account_status === 'blocked' ? (
                        <IonBadge color="danger">Compte bloque</IonBadge>
                      ) : null}
                      <IonBadge color={patient.verification_status === 'approved' ? 'success' : 'warning'}>
                        {patient.verification_status === 'approved' ? 'Compte approuve' : 'Compte en attente'}
                      </IonBadge>
                    </div>
                    <p>Approuve par: {patient.approved_by || 'N/D'} · {formatDate(patient.approved_at)}</p>
                    <div style={{ marginTop: '10px', display: 'grid', gap: '6px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '8px' }}>
                        <span>Approbation du compte</span>
                        <IonToggle
                          checked={patient.verification_status === 'approved'}
                          disabled={busyId === patient.id || patient.account_status === 'blocked'}
                          onIonChange={(event) => {
                            const enabled = !!event.detail.checked;
                            if (enabled) {
                              void approve(patient.id);
                            } else {
                              void unapprove(patient.id);
                            }
                          }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '8px' }}>
                        <span>Bloquer</span>
                        <IonToggle
                          checked={patient.account_status === 'blocked'}
                          disabled={busyId === patient.id}
                          color="danger"
                          onIonChange={(event) => {
                            const enabled = !!event.detail.checked;
                            if (enabled) {
                              void block(patient.id);
                            } else {
                              void unblock(patient.id);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default AdminPatientsPage;

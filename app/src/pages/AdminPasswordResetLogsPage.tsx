import {
  IonBackButton,
  IonBadge,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPasswordResetEvent } from '../services/api';
import { useAuth } from '../state/AuthState';
import { formatDateTime } from '../utils/time';

const AdminPasswordResetLogsPage: React.FC = () => {
  const { token } = useAuth();
  const [rows, setRows] = useState<ApiPasswordResetEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [action, setAction] = useState<'all' | 'request' | 'complete'>('all');
  const [result, setResult] = useState<'all' | '1' | '0'>('all');

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminPasswordResetEvents(token, {
        action: action === 'all' ? undefined : action,
        success: result === 'all' ? undefined : result,
        q: q.trim() || undefined,
        limit: 250,
      });
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, action, result]);

  const summary = useMemo(() => {
    const total = rows.length;
    const success = rows.filter((r) => r.success).length;
    const failed = total - success;
    return { total, success, failed };
  }, [rows]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin" />
          </IonButtons>
          <IonTitle>Logs reset mot de passe</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardContent>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <IonBadge color="medium">Total: {summary.total}</IonBadge>
              <IonBadge color="success">Succes: {summary.success}</IonBadge>
              <IonBadge color="danger">Echecs: {summary.failed}</IonBadge>
            </div>
            <IonItem lines="none">
              <IonLabel position="stacked">Recherche</IonLabel>
              <IonInput
                value={q}
                placeholder="nom, email, raison..."
                onIonInput={(e) => setQ(e.detail.value ?? '')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    load().catch(() => undefined);
                  }
                }}
              />
            </IonItem>
            <IonSegment value={action} onIonChange={(e) => setAction((e.detail.value as 'all' | 'request' | 'complete') ?? 'all')}>
              <IonSegmentButton value="all">
                <IonLabel>Toutes actions</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="request">
                <IonLabel>Demandes</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="complete">
                <IonLabel>Resets</IonLabel>
              </IonSegmentButton>
            </IonSegment>
            <IonSegment value={result} onIonChange={(e) => setResult((e.detail.value as 'all' | '1' | '0') ?? 'all')}>
              <IonSegmentButton value="all">
                <IonLabel>Tous resultats</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="1">
                <IonLabel>Succes</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="0">
                <IonLabel>Echecs</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          </IonCardContent>
        </IonCard>

        {loading ? <IonText color="medium"><p>Chargement...</p></IonText> : null}
        {error ? <IonText color="danger"><p>{error}</p></IonText> : null}

        {rows.map((row) => (
          <IonCard key={row.id} className="surface-card">
            <IonCardContent>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <strong>{row.action === 'request' ? 'Demande reset' : 'Reset complete'}</strong>
                <IonBadge color={row.success ? 'success' : 'danger'}>
                  {row.success ? 'Succes' : 'Echec'}
                </IonBadge>
              </div>
              <p style={{ margin: '6px 0 0 0' }}>
                Utilisateur: {row.user_name || 'N/D'} {row.user_role ? `(${row.user_role})` : ''}
              </p>
              <p style={{ margin: '2px 0 0 0' }}>Email: {row.user_email || 'N/D'}</p>
              <p style={{ margin: '2px 0 0 0' }}>Numero: {row.identifier_masked || 'N/D'}</p>
              <p style={{ margin: '2px 0 0 0' }}>Raison: {row.reason || 'N/D'}</p>
              <p style={{ margin: '2px 0 0 0' }}>IP: {row.ip_address || 'N/D'}</p>
              <p style={{ margin: '2px 0 0 0' }}>Date: {formatDateTime(row.created_at)}</p>
            </IonCardContent>
          </IonCard>
        ))}
      </IonContent>
    </IonPage>
  );
};

export default AdminPasswordResetLogsPage;


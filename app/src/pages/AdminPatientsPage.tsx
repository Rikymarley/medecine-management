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
  IonToolbar
} from '@ionic/react';
import { personOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api, ApiUser } from '../services/api';
import { useAuth } from '../state/AuthState';

const AdminPatientsPage: React.FC = () => {
  const history = useHistory();
  const { token } = useAuth();
  const [rows, setRows] = useState<ApiUser[]>([]);
  const [query, setQuery] = useState('');
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
            <div style={{ display: 'grid', gap: '8px' }}>
              {filtered.map((patient) => (
                <IonCard
                  key={patient.id}
                  className="surface-card"
                  button
                  onClick={() => history.push(`/admin/patients/${patient.id}`)}
                  style={{ margin: 0 }}
                >
                  <IonCardContent>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {patient.profile_photo_url ? (
                        <img
                          src={patient.profile_photo_url}
                          alt={patient.name}
                          style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #dbe7ef' }}
                        />
                      ) : (
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#dbeafe', color: '#1e40af' }}>
                          <IonIcon icon={personOutline} />
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0 }}>{patient.name}</h3>
                        <p style={{ margin: '2px 0 0 0' }}>{patient.phone || 'Telephone N/D'}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {patient.account_status === 'blocked' ? <IonBadge color="danger">Bloque</IonBadge> : null}
                      <IonBadge color={patient.verification_status === 'approved' ? 'success' : 'warning'}>
                        {patient.verification_status === 'approved' ? 'Approuve' : 'En attente'}
                      </IonBadge>
                    </div>
                  </IonCardContent>
                </IonCard>
              ))}
            </div>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default AdminPatientsPage;

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
  IonInput,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/react';
import { walkOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { api, type ApiVisit } from '../services/api';
import { useAuth } from '../state/AuthState';
import { formatDateTime } from '../utils/time';

const DoctorMyVisitsPage: React.FC = () => {
  const { token } = useAuth();
  const ionRouter = useIonRouter();
  const [visits, setVisits] = useState<ApiVisit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    api.getDoctorVisits(token)
      .then(setVisits)
      .catch((err) => setError(err instanceof Error ? err.message : 'Impossible de charger les visites.'))
      .finally(() => setLoading(false));
  }, [token]);

  const filteredVisits = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return visits;
    return visits.filter((visit) => {
      const haystack = [
        visit.visit_code ?? '',
        visit.patient_name ?? '',
        visit.family_member_name ?? '',
        visit.visit_type ?? '',
        visit.diagnosis ?? '',
        visit.status ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, visits]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/doctor" />
          </IonButtons>
          <IonTitle>Mes visites</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <IonCard className="surface-card">
          <IonCardHeader>
            <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IonIcon icon={walkOutline} />
              Mes visites
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonInput
              value={query}
              placeholder="Rechercher par patient, code visite, type..."
              onIonInput={(e) => setQuery(e.detail.value ?? '')}
            />
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <IonBadge color="primary">{filteredVisits.length} resultat(s)</IonBadge>
              <IonBadge color="medium">{visits.length} visite(s) totale(s)</IonBadge>
            </div>
          </IonCardContent>
        </IonCard>

        {error ? (
          <IonText color="danger">
            <p>{error}</p>
          </IonText>
        ) : loading ? (
          <IonText color="medium">
            <p>Chargement...</p>
          </IonText>
        ) : filteredVisits.length === 0 ? (
          <IonCard className="surface-card">
            <IonCardContent>
              <IonText color="medium">
                <p>Aucune visite trouvee.</p>
              </IonText>
            </IonCardContent>
          </IonCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredVisits.map((visit) => (
              <IonCard
                key={visit.id}
                button
                className="surface-card"
                style={{ margin: 0 }}
                onClick={() => ionRouter.push(`/doctor/visits/${visit.id}`, 'forward', 'push')}
              >
                <IonCardContent>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>
                        {visit.visit_code ?? `VIS-${visit.id}`} · {visit.patient_name ?? 'Patient'}
                      </div>
                      <div style={{ fontSize: '0.88rem', color: '#64748b' }}>
                        {visit.family_member_name ? `${visit.family_member_name} · ` : ''}
                        {visit.visit_type ?? 'Consultation'}
                      </div>
                    </div>
                    <IonBadge color={visit.status === 'open' ? 'warning' : visit.status === 'completed' ? 'success' : 'medium'}>
                      {visit.status}
                    </IonBadge>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#64748b' }}>
                    Date: {visit.visit_date ? formatDateTime(visit.visit_date) : 'N/D'}
                  </div>
                  <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <IonBadge color="light">Ordonnances {visit.linked_prescriptions_count ?? 0}</IonBadge>
                    <IonBadge color="light">Historique {visit.linked_medical_history_count ?? 0}</IonBadge>
                    <IonBadge color="light">Rehab {visit.linked_rehab_entries_count ?? 0}</IonBadge>
                  </div>
                </IonCardContent>
              </IonCard>
            ))}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default DoctorMyVisitsPage;

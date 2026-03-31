import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPharmacy, ApiPrescription, ApiPharmacyResponse } from '../services/api';
import { useAuth } from '../state/AuthState';
import { minutesAgo, minutesUntil } from '../utils/time';

const STATUS_ACTIONS: { key: ApiPharmacyResponse['status']; label: string; color: string }[] = [
  { key: 'out_of_stock', label: '❌ 0 - Rupture', color: 'danger' },
  { key: 'very_low', label: '🔴 1-10 - Tres bas', color: 'danger' },
  { key: 'low', label: '🟠 11-30 - Bas', color: 'warning' },
  { key: 'available', label: '🟡 31-100 - Disponible', color: 'tertiary' },
  { key: 'high', label: '🟢 100+ - Eleve', color: 'success' },
  { key: 'equivalent', label: '🔄 Equivalent', color: 'medium' }
];

const statusLabel = (status: ApiPharmacyResponse['status']) => {
  switch (status) {
    case 'out_of_stock':
    case 'not_available':
      return '❌ Rupture';
    case 'very_low':
      return '🔴 Tres bas (1-10)';
    case 'low':
      return '🟠 Bas (11-30)';
    case 'available':
      return '🟡 Disponible (31-100)';
    case 'high':
      return '🟢 Eleve (100+)';
    case 'equivalent':
      return '🔄 Equivalent disponible';
    default:
      return '❌ Rupture';
  }
};

const PharmacyDashboard: React.FC = () => {
  const { token, user, logout } = useAuth();
  const [pharmacies, setPharmacies] = useState<ApiPharmacy[]>([]);
  const [prescriptions, setPrescriptions] = useState<ApiPrescription[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedPrescriptions, setExpandedPrescriptions] = useState<Record<number, boolean>>({});

  const loadData = async () => {
    const [pharmacyData, prescriptionData] = await Promise.all([
      api.getPharmacies(),
      api.getPrescriptions()
    ]);
    setPharmacies(pharmacyData);
    setPrescriptions(prescriptionData);
  };

  useEffect(() => {
    loadData().catch(() => undefined);
  }, []);

  const pharmacy = pharmacies.find((item) => item.id === user?.pharmacy_id) ?? null;

  const togglePrescription = (prescriptionId: number) => {
    setExpandedPrescriptions((prev) => ({
      ...prev,
      [prescriptionId]: !(prev[prescriptionId] ?? false)
    }));
  };

  const responsesByKey = useMemo(() => {
    const map: Record<string, ApiPharmacyResponse> = {};
    prescriptions.forEach((prescription) => {
      prescription.responses.forEach((response) => {
        const key = `${response.prescription_id}-${response.medicine_request_id}-${response.pharmacy_id}`;
        map[key] = response;
      });
    });
    return map;
  }, [prescriptions]);

  const handleRespond = async (payload: {
    prescription_id: number;
    medicine_request_id: number;
    status: ApiPharmacyResponse['status'];
  }) => {
    if (!token || !pharmacy) {
      setError('Veuillez vous reconnecter.');
      return;
    }
    setError(null);
    try {
      await api.createPharmacyResponse(token, {
        pharmacy_id: pharmacy.id,
        prescription_id: payload.prescription_id,
        medicine_request_id: payload.medicine_request_id,
        status: payload.status,
        expires_at_minutes: 60
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Echec de l'enregistrement de la reponse");
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Tableau de bord</IonTitle>
          <IonButton slot="end" fill="clear" onClick={logout}>
            Se deconnecter
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        {!pharmacy ? (
          <IonCard className="surface-card">
            <IonCardContent>
              <IonText color="danger">Aucune pharmacie liee a ce compte.</IonText>
            </IonCardContent>
          </IonCard>
        ) : (
          <IonCard className="hero-card">
            <IonCardHeader>
              <IonCardTitle>{pharmacy.name}</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonText>
                Score de fiabilite : {pharmacy.reliability_score} · Distance{' '}
                {pharmacy.latitude && pharmacy.longitude ? 'suivie' : 'inconnue'}
              </IonText>
              <IonBadge color={pharmacy.open_now ? 'success' : 'medium'} style={{ marginLeft: '8px' }}>
                {pharmacy.open_now ? 'Ouverte' : 'Fermee'}
              </IonBadge>
            </IonCardContent>
          </IonCard>
        )}

        {error ? (
          <IonText color="danger">
            <p>{error}</p>
          </IonText>
        ) : null}

        {pharmacy
          ? prescriptions.map((prescription) => (
              <IonCard key={prescription.id} className="surface-card" style={{ marginTop: '16px' }}>
                <IonCardHeader>
                  <IonCardTitle>Demande pour {prescription.patient_name}</IonCardTitle>
                  <IonBadge color="primary" style={{ width: 'fit-content', marginTop: '8px' }}>
                    {prescription.medicine_requests.length} medicament
                    {prescription.medicine_requests.length > 1 ? 's' : ''}
                  </IonBadge>
                  <IonButton
                    fill="outline"
                    size="small"
                    onClick={() => togglePrescription(prescription.id)}
                    style={{ marginTop: '8px', width: 'fit-content', marginLeft: 'auto' }}
                  >
                    {expandedPrescriptions[prescription.id] ?? false ? 'Masquer' : 'Afficher'}
                  </IonButton>
                </IonCardHeader>
                <IonCardContent style={{ display: (expandedPrescriptions[prescription.id] ?? false) ? 'block' : 'none' }}>
                  <IonList>
                    {prescription.medicine_requests.map((med) => {
                      const key = `${prescription.id}-${med.id}-${pharmacy.id}`;
                      const latestResponse = responsesByKey[key];
                      const isActive = latestResponse
                        ? new Date(latestResponse.expires_at).getTime() > Date.now()
                        : false;

                      return (
                        <IonItem key={med.id} lines="full">
                          <IonLabel>
                            <strong>{med.name}</strong> {med.strength} {med.form}
                            <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                              Generique autorise : {med.generic_allowed ? 'Oui' : 'Non'} · Conversion :{' '}
                              {med.conversion_allowed ? 'Oui' : 'Non'}
                            </div>
                            {latestResponse ? (
                              <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                                Derniere reponse : {statusLabel(latestResponse.status)} · il y a {minutesAgo(
                                  latestResponse.responded_at
                                )}{' '}
                                min ·{isActive
                                  ? ` expire dans ${minutesUntil(latestResponse.expires_at)} min`
                                  : ' expiree'}
                              </div>
                            ) : null}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                              {STATUS_ACTIONS.map((action) => (
                                <IonButton
                                  key={action.key}
                                  size="small"
                                  color={action.color}
                                  fill={latestResponse?.status === action.key ? 'solid' : 'outline'}
                                  onClick={() =>
                                    handleRespond({
                                      prescription_id: prescription.id,
                                      medicine_request_id: med.id,
                                      status: action.key
                                    })
                                  }
                                >
                                  {action.label}
                                </IonButton>
                              ))}
                            </div>
                          </IonLabel>
                        </IonItem>
                      );
                    })}
                  </IonList>
                </IonCardContent>
              </IonCard>
            ))
          : null}
      </IonContent>
    </IonPage>
  );
};

export default PharmacyDashboard;

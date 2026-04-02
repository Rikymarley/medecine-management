import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonText,
  IonToggle,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonCheckbox,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPharmacy, ApiPrescription, ApiPharmacyResponse } from '../services/api';
import { useAuth } from '../state/AuthState';
import { maskHaitiPhone } from '../utils/phoneMask';
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

type DaySchedule = {
  day: string;
  open: boolean;
  from: string;
  to: string;
};

const WEEK_DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const PAYMENT_OPTIONS = ['Cash', 'MonCash', 'NatCash', 'Carte', 'Virement'];
const normalizePaymentMethod = (value: string) => {
  const key = value.trim().toLowerCase();
  const match = PAYMENT_OPTIONS.find((option) => option.toLowerCase() === key);
  return match ?? value.trim();
};
const SERVICE_OPTIONS = [
  'Vaccination',
  'Prise de tension',
  'Test glycemie',
  'Livraison',
  'Conseil pharmaceutique',
  'Preparation ordonnance',
  'Renouvellement traitement',
  'Service de nuit'
];

const defaultSchedule = (): DaySchedule[] =>
  WEEK_DAYS.map((day) => ({ day, open: false, from: '08:00', to: '18:00' }));

const parseOpeningHours = (value: string | null): DaySchedule[] => {
  const schedule = defaultSchedule();
  if (!value) {
    return schedule;
  }

  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  lines.forEach((line) => {
    const match = line.match(/^([^:]+):\s*(Ferme|(\d{2}:\d{2})-(\d{2}:\d{2}))$/i);
    if (!match) {
      return;
    }
    const day = match[1]?.trim();
    const index = schedule.findIndex((item) => item.day.toLowerCase() === day.toLowerCase());
    if (index < 0) {
      return;
    }

    if (match[2]?.toLowerCase() === 'ferme') {
      schedule[index] = { ...schedule[index], open: false };
      return;
    }

    schedule[index] = {
      ...schedule[index],
      open: true,
      from: match[3] || schedule[index].from,
      to: match[4] || schedule[index].to
    };
  });

  return schedule;
};

const serializeOpeningHours = (schedule: DaySchedule[]): string =>
  schedule
    .map((item) => `${item.day}: ${item.open ? `${item.from}-${item.to}` : 'Ferme'}`)
    .join('\n');

const PharmacyDashboard: React.FC = () => {
  const { token, user, logout } = useAuth();
  const [pharmacies, setPharmacies] = useState<ApiPharmacy[]>([]);
  const [myPharmacy, setMyPharmacy] = useState<ApiPharmacy | null>(null);
  const [prescriptions, setPrescriptions] = useState<ApiPrescription[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [expandedPrescriptions, setExpandedPrescriptions] = useState<Record<number, boolean>>({});
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>(defaultSchedule());
  const [profileForm, setProfileForm] = useState({
    pharmacy_mode: 'quick_manual' as 'quick_manual' | 'pos_integrated',
    phone: '',
    open_now: false,
    closes_at: '',
    opening_hours: '',
    temporary_closed: false,
    emergency_available: false,
    address: '',
    latitude: '',
    longitude: '',
    services: '',
    payment_methods: '',
    price_range: '' as '' | 'low' | 'medium' | 'high',
    average_wait_time: '',
    delivery_available: false,
    delivery_radius_km: '',
    night_service: false,
    license_number: '',
    license_verified: false,
    logo_url: '',
    storefront_image_url: '',
    notes_for_patients: ''
  });
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const loadData = async () => {
    const calls: [Promise<ApiPharmacy[]>, Promise<ApiPrescription[]>, Promise<ApiPharmacy | null>] = [
      api.getPharmacies(),
      api.getPrescriptions(),
      token ? api.getMyPharmacy(token).then((data) => data).catch(() => null) : Promise.resolve(null)
    ];
    const [pharmacyData, prescriptionData, meData] = await Promise.all(calls);
    setPharmacies(pharmacyData);
    setPrescriptions(prescriptionData);
    setMyPharmacy(meData);
    if (meData) {
      setProfileForm({
        pharmacy_mode: meData.pharmacy_mode ?? 'quick_manual',
        phone: maskHaitiPhone(meData.phone ?? ''),
        open_now: !!meData.open_now,
        closes_at: meData.closes_at ?? '',
        opening_hours: meData.opening_hours ?? '',
        temporary_closed: !!meData.temporary_closed,
        emergency_available: !!meData.emergency_available,
        address: meData.address ?? '',
        latitude: meData.latitude ?? '',
        longitude: meData.longitude ?? '',
        services: meData.services ?? '',
        payment_methods: meData.payment_methods ?? '',
        price_range: meData.price_range ?? '',
        average_wait_time:
          meData.average_wait_time === null || meData.average_wait_time === undefined
            ? ''
            : String(meData.average_wait_time),
        delivery_available: !!meData.delivery_available,
        delivery_radius_km: meData.delivery_radius_km ?? '',
        night_service: !!meData.night_service,
        license_number: meData.license_number ?? '',
        license_verified: !!meData.license_verified,
        logo_url: meData.logo_url ?? '',
        storefront_image_url: meData.storefront_image_url ?? '',
        notes_for_patients: meData.notes_for_patients ?? ''
      });
      setSelectedPaymentMethods(
        (meData.payment_methods ?? '')
          .split(',')
          .map((item) => normalizePaymentMethod(item))
          .filter(Boolean)
      );
      setSelectedServices(
        (meData.services ?? '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      );
      setWeeklySchedule(parseOpeningHours(meData.opening_hours));
    }
  };

  useEffect(() => {
    loadData().catch(() => undefined);
  }, [token]);

  const pharmacy = myPharmacy ?? pharmacies.find((item) => item.id === user?.pharmacy_id) ?? null;
  const profileMissingFields = useMemo(() => {
    if (!pharmacy) {
      return [] as string[];
    }
    const missing: string[] = [];
    if (!pharmacy.phone) missing.push('telephone');
    if (!pharmacy.address) missing.push('adresse');
    if (!pharmacy.opening_hours) missing.push('horaires');
    if (!pharmacy.latitude || !pharmacy.longitude) missing.push('gps');
    return missing;
  }, [pharmacy]);
  const profileIncomplete = profileMissingFields.length > 0;

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

  const saveProfile = async () => {
    if (!token || !pharmacy) {
      setError('Veuillez vous reconnecter.');
      return;
    }
    setProfileSaving(true);
    setError(null);
    try {
      const updated = await api.updateMyPharmacy(token, {
        pharmacy_mode: profileForm.pharmacy_mode,
        phone: profileForm.phone.trim() || null,
        open_now: profileForm.open_now,
        closes_at: profileForm.closes_at.trim() || null,
        opening_hours: serializeOpeningHours(weeklySchedule),
        temporary_closed: profileForm.temporary_closed,
        emergency_available: profileForm.emergency_available,
        address: profileForm.address.trim() || null,
        latitude: profileForm.latitude.trim() || null,
        longitude: profileForm.longitude.trim() || null,
        services: selectedServices.length > 0 ? selectedServices.join(', ') : null,
        payment_methods: selectedPaymentMethods.length > 0 ? selectedPaymentMethods.join(', ') : null,
        price_range: profileForm.price_range || null,
        average_wait_time: profileForm.average_wait_time.trim() ? Number(profileForm.average_wait_time) : null,
        delivery_available: profileForm.delivery_available,
        delivery_radius_km: profileForm.delivery_radius_km.trim() ? Number(profileForm.delivery_radius_km) : null,
        night_service: profileForm.night_service,
        license_number: profileForm.license_number.trim() || null,
        license_verified: profileForm.license_verified,
        logo_url: profileForm.logo_url.trim() || null,
        storefront_image_url: profileForm.storefront_image_url.trim() || null,
        notes_for_patients: profileForm.notes_for_patients.trim() || null
      });
      setMyPharmacy(updated);
      setPharmacies((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Echec de mise a jour du profil pharmacie');
    } finally {
      setProfileSaving(false);
    }
  };

  const fillGpsFromDevice = () => {
    if (!navigator.geolocation) {
      setError("La geolocalisation n'est pas supportee sur cet appareil.");
      return;
    }

    setIsLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setProfileForm((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng
        }));
        setIsLocating(false);
      },
      () => {
        setError('Impossible de recuperer la position GPS.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
              <p>
                Fiabilite : {pharmacy.reliability_score}
                {' ||| '}
                {pharmacy.last_status_updated_at
                  ? `Mise a jour il y a ${minutesAgo(pharmacy.last_status_updated_at)} min`
                  : 'Mise a jour inconnue'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <IonBadge color={pharmacy.temporary_closed ? 'danger' : pharmacy.open_now ? 'success' : 'medium'}>
                  {pharmacy.temporary_closed ? 'Fermeture temporaire' : pharmacy.open_now ? 'Ouverte' : 'Fermee'}
                </IonBadge>
                <IonBadge color={profileIncomplete ? 'warning' : 'success'}>
                  {profileIncomplete ? `Infos incompletes (${profileMissingFields.length})` : 'Infos completes'}
                </IonBadge>
                <IonBadge color={pharmacy.pharmacy_mode === 'pos_integrated' ? 'tertiary' : 'medium'}>
                  Mode: {pharmacy.pharmacy_mode === 'pos_integrated' ? 'POS integre' : 'Rapide manuel'}
                </IonBadge>
                {pharmacy.closes_at ? <IonText>Ferme a {pharmacy.closes_at}</IonText> : null}
                <IonButton
                  size="small"
                  fill="outline"
                  onClick={() => setProfileExpanded((prev) => !prev)}
                >
                  {profileExpanded ? 'Masquer infos' : 'Afficher infos'}
                </IonButton>
              </div>
              {profileIncomplete ? (
                <IonText color="warning">
                  Champs manquants: {profileMissingFields.join(', ')}.
                </IonText>
              ) : null}
              {profileExpanded ? (
                <>
              <IonItem lines="none">
                <IonLabel position="stacked">Mode disponibilite</IonLabel>
                <IonSelect
                  value={profileForm.pharmacy_mode}
                  onIonChange={(event) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      pharmacy_mode: (event.detail.value as 'quick_manual' | 'pos_integrated') ?? 'quick_manual'
                    }))
                  }
                >
                  <IonSelectOption value="quick_manual">Rapide manuel (boutons)</IonSelectOption>
                  <IonSelectOption value="pos_integrated">POS integre (automatique)</IonSelectOption>
                </IonSelect>
              </IonItem>
              <IonItem lines="none">
                <IonLabel position="stacked">Telephone</IonLabel>
                <IonInput
                  value={profileForm.phone}
                  placeholder="+509-xxxx-xxxx"
                  onIonInput={(event) =>
                    setProfileForm((prev) => ({ ...prev, phone: maskHaitiPhone(event.detail.value ?? '') }))
                  }
                />
              </IonItem>
              <IonItem lines="none">
                <IonLabel>Ouvert maintenant</IonLabel>
                <IonToggle
                  checked={profileForm.open_now}
                  onIonChange={(event) => setProfileForm((prev) => ({ ...prev, open_now: event.detail.checked }))}
                />
              </IonItem>
              <IonItem lines="none">
                <IonLabel>Fermeture temporaire</IonLabel>
                <IonToggle
                  checked={profileForm.temporary_closed}
                  onIonChange={(event) => setProfileForm((prev) => ({ ...prev, temporary_closed: event.detail.checked }))}
                />
              </IonItem>
              <IonItem lines="none">
                <IonLabel>Disponibilite urgence</IonLabel>
                <IonToggle
                  checked={profileForm.emergency_available}
                  onIonChange={(event) => setProfileForm((prev) => ({ ...prev, emergency_available: event.detail.checked }))}
                />
              </IonItem>
              <IonItem lines="none">
                <IonLabel position="stacked">Heures d'ouverture</IonLabel>
              </IonItem>
              <div style={{ display: 'grid', gap: '8px', marginBottom: '10px' }}>
                {weeklySchedule.map((row, index) => (
                  <div
                    key={row.day}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '90px auto 1fr 1fr',
                      gap: '8px',
                      alignItems: 'center'
                    }}
                  >
                    <strong style={{ fontSize: '0.9rem' }}>{row.day}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IonToggle
                        checked={row.open}
                        onIonChange={(event) =>
                          setWeeklySchedule((prev) =>
                            prev.map((item, i) => (i === index ? { ...item, open: event.detail.checked } : item))
                          )
                        }
                      />
                      <span style={{ fontSize: '0.85rem' }}>{row.open ? 'Ouvert' : 'Ferme'}</span>
                    </div>
                    <IonInput
                      type="time"
                      value={row.from}
                      disabled={!row.open}
                      onIonInput={(event) =>
                        setWeeklySchedule((prev) =>
                          prev.map((item, i) => (i === index ? { ...item, from: event.detail.value ?? item.from } : item))
                        )
                      }
                    />
                    <IonInput
                      type="time"
                      value={row.to}
                      disabled={!row.open}
                      onIonInput={(event) =>
                        setWeeklySchedule((prev) =>
                          prev.map((item, i) => (i === index ? { ...item, to: event.detail.value ?? item.to } : item))
                        )
                      }
                    />
                  </div>
                ))}
              </div>
              <IonItem lines="none">
                <IonLabel position="stacked">Adresse</IonLabel>
                <IonInput
                  value={profileForm.address}
                  placeholder="Adresse"
                  onIonInput={(event) => setProfileForm((prev) => ({ ...prev, address: event.detail.value ?? '' }))}
                />
              </IonItem>
              <IonItem lines="none">
                <IonLabel position="stacked">Services</IonLabel>
              </IonItem>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                {SERVICE_OPTIONS.map((option) => (
                  <IonItem key={option} lines="none">
                    <IonCheckbox
                      slot="start"
                      checked={selectedServices.includes(option)}
                      onIonChange={(event) =>
                        setSelectedServices((prev) =>
                          event.detail.checked
                            ? Array.from(new Set([...prev, option]))
                            : prev.filter((item) => item !== option)
                        )
                      }
                    />
                    <IonLabel>{option}</IonLabel>
                  </IonItem>
                ))}
              </div>
              <IonItem lines="none">
                <IonLabel position="stacked">Moyens de paiement</IonLabel>
              </IonItem>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                {PAYMENT_OPTIONS.map((option) => (
                  <IonItem key={option} lines="none">
                    <IonCheckbox
                      slot="start"
                      checked={selectedPaymentMethods.includes(option)}
                      onIonChange={(event) =>
                        setSelectedPaymentMethods((prev) =>
                          event.detail.checked
                            ? Array.from(new Set([...prev, option]))
                            : prev.filter((item) => item !== option)
                        )
                      }
                    />
                    <IonLabel>{option}</IonLabel>
                  </IonItem>
                ))}
              </div>
              <IonItem lines="none">
                <IonLabel position="stacked">Niveau de prix</IonLabel>
                <IonSelect
                  value={profileForm.price_range}
                  placeholder="Selectionner"
                  onIonChange={(event) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      price_range: (event.detail.value as '' | 'low' | 'medium' | 'high') ?? ''
                    }))
                  }
                >
                  <IonSelectOption value="">Non renseigne</IonSelectOption>
                  <IonSelectOption value="low">Bas</IonSelectOption>
                  <IonSelectOption value="medium">Moyen</IonSelectOption>
                  <IonSelectOption value="high">Eleve</IonSelectOption>
                </IonSelect>
              </IonItem>
              <IonItem lines="none">
                <IonLabel position="stacked">Temps d'attente moyen (minutes)</IonLabel>
                <IonInput
                  type="number"
                  value={profileForm.average_wait_time}
                  onIonInput={(event) =>
                    setProfileForm((prev) => ({ ...prev, average_wait_time: event.detail.value ?? '' }))
                  }
                />
              </IonItem>
              <IonItem lines="none">
                <IonLabel>Livraison disponible</IonLabel>
                <IonToggle
                  checked={profileForm.delivery_available}
                  onIonChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, delivery_available: event.detail.checked }))
                  }
                />
              </IonItem>
              <IonItem lines="none">
                <IonLabel position="stacked">Rayon de livraison (km)</IonLabel>
                <IonInput
                  type="number"
                  value={profileForm.delivery_radius_km}
                  onIonInput={(event) =>
                    setProfileForm((prev) => ({ ...prev, delivery_radius_km: event.detail.value ?? '' }))
                  }
                />
              </IonItem>
              <IonItem lines="none">
                <IonLabel>Service de nuit</IonLabel>
                <IonToggle
                  checked={profileForm.night_service}
                  onIonChange={(event) => setProfileForm((prev) => ({ ...prev, night_service: event.detail.checked }))}
                />
              </IonItem>
              <IonItem lines="none">
                <IonLabel position="stacked">Numero de licence</IonLabel>
                <IonInput
                  value={profileForm.license_number}
                  onIonInput={(event) =>
                    setProfileForm((prev) => ({ ...prev, license_number: event.detail.value ?? '' }))
                  }
                />
              </IonItem>
              <IonItem lines="none">
                <IonLabel>Licence verifiee</IonLabel>
                <IonToggle
                  checked={profileForm.license_verified}
                  onIonChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, license_verified: event.detail.checked }))
                  }
                />
              </IonItem>
              <IonItem lines="none">
                <IonLabel position="stacked">URL logo</IonLabel>
                <IonInput
                  value={profileForm.logo_url}
                  onIonInput={(event) => setProfileForm((prev) => ({ ...prev, logo_url: event.detail.value ?? '' }))}
                />
              </IonItem>
              <IonItem lines="none">
                <IonLabel position="stacked">URL photo vitrine</IonLabel>
                <IonInput
                  value={profileForm.storefront_image_url}
                  onIonInput={(event) =>
                    setProfileForm((prev) => ({ ...prev, storefront_image_url: event.detail.value ?? '' }))
                  }
                />
              </IonItem>
              <IonItem lines="none">
                <IonLabel position="stacked">Notes pour patients</IonLabel>
                <IonTextarea
                  autoGrow
                  value={profileForm.notes_for_patients}
                  onIonInput={(event) =>
                    setProfileForm((prev) => ({ ...prev, notes_for_patients: event.detail.value ?? '' }))
                  }
                />
              </IonItem>
              <IonItem lines="none">
                <IonLabel position="stacked">Latitude</IonLabel>
                <IonInput
                  value={profileForm.latitude}
                  placeholder="19.7510"
                  onIonInput={(event) => setProfileForm((prev) => ({ ...prev, latitude: event.detail.value ?? '' }))}
                />
              </IonItem>
              <IonItem lines="none">
                <IonLabel position="stacked">Longitude</IonLabel>
                <IonInput
                  value={profileForm.longitude}
                  placeholder="-72.2014"
                  onIonInput={(event) => setProfileForm((prev) => ({ ...prev, longitude: event.detail.value ?? '' }))}
                />
              </IonItem>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  position: 'absolute',
                  marginTop: '-85px',
                  right: '10px',
                  zIndex: 1
                }}
              >
                <IonButton size="small" fill="outline" onClick={fillGpsFromDevice} disabled={isLocating}>
                  {isLocating ? 'GPS...' : 'Obtenir GPS'}
                </IonButton>
              </div>
              <IonButton expand="block" onClick={saveProfile} disabled={profileSaving}>
                {profileSaving ? 'Enregistrement...' : 'Mettre a jour le profil'}
              </IonButton>
                </>
              ) : null}
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
                              Quantite: {med.quantity ?? 1}
                              {med.duration_days ? ` · Duree: ${med.duration_days}j` : ''}
                              {med.daily_dosage ? ` · ${med.daily_dosage}x/j` : ''}
                            </div>
                            {med.notes ? (
                              <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>Notes: {med.notes}</div>
                            ) : null}
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

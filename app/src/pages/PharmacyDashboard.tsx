import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
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
  IonToolbar,
  useIonRouter
} from '@ionic/react';
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  chevronDownOutline,
  chevronUpOutline,
  closeCircleOutline,
  documentTextOutline,
  medkitOutline,
  starOutline,
  storefrontOutline
} from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiPharmacy, ApiPrescription, ApiPharmacyResponse } from '../services/api';
import {
  enqueuePharmacyResponse,
  flushPharmacyResponsesOutbox,
  getPendingPharmacyResponseCount
} from '../services/offlineQueue';
import { useAuth } from '../state/AuthState';
import { maskHaitiPhone } from '../utils/phoneMask';
import { getPrescriptionCode } from '../utils/prescriptionCode';
import { getPrescriptionStatusClassName, getPrescriptionStatusLabel } from '../utils/prescriptionStatus';
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
const ALL_PRESCRIPTION_STATUSES = [
  'sent_to_pharmacies',
  'partially_available',
  'available',
  'expired'
];

const getStatusTimeDiffLabel = (requestedAt: string) => {
  const diffMinutes = Math.max(0, Math.round((Date.now() - new Date(requestedAt).getTime()) / 60000));
  return `il y a ${diffMinutes} min`;
};

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
  const ionRouter = useIonRouter();
  const { token, user, logout } = useAuth();
  const [pharmacies, setPharmacies] = useState<ApiPharmacy[]>([]);
  const [myPharmacy, setMyPharmacy] = useState<ApiPharmacy | null>(null);
  const [prescriptions, setPrescriptions] = useState<ApiPrescription[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingOutboxCount, setPendingOutboxCount] = useState<number>(getPendingPharmacyResponseCount());
  const [profileSaving, setProfileSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingStorefront, setUploadingStorefront] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [storefrontPreviewUrl, setStorefrontPreviewUrl] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profileCardExpanded, setProfileCardExpanded] = useState(false);
  const [identitySectionExpanded, setIdentitySectionExpanded] = useState(true);
  const [hoursSectionExpanded, setHoursSectionExpanded] = useState(false);
  const [servicesSectionExpanded, setServicesSectionExpanded] = useState(false);
  const [businessSectionExpanded, setBusinessSectionExpanded] = useState(false);
  const [gpsSectionExpanded, setGpsSectionExpanded] = useState(false);
  const [expandedPrescriptions, setExpandedPrescriptions] = useState<Record<number, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<string>('sent_to_pharmacies');
  const [reactivatingPrescriptionId, setReactivatingPrescriptionId] = useState<number | null>(null);
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
  const dashboardCacheKey = user ? `pharmacy-dashboard-cache-${user.id}` : null;

  const applyMyPharmacyToForm = (meData: ApiPharmacy | null) => {
    if (!meData) {
      return;
    }
    setProfileForm({
      pharmacy_mode: 'quick_manual',
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
  };

  const loadData = async () => {
    try {
      const calls: [Promise<ApiPharmacy[]>, Promise<ApiPrescription[]>, Promise<ApiPharmacy | null>] = [
        api.getPharmacies(),
        api.getPrescriptions(),
        token ? api.getMyPharmacy(token).then((data) => data).catch(() => null) : Promise.resolve(null)
      ];
      const [pharmacyData, prescriptionData, meData] = await Promise.all(calls);
      setPharmacies(pharmacyData);
      setPrescriptions(prescriptionData);
      setMyPharmacy(meData);
      applyMyPharmacyToForm(meData);

      if (dashboardCacheKey) {
        localStorage.setItem(
          dashboardCacheKey,
          JSON.stringify({
            pharmacies: pharmacyData,
            prescriptions: prescriptionData,
            myPharmacy: meData
          })
        );
      }
    } catch {
      if (!dashboardCacheKey) {
        return;
      }
      const raw = localStorage.getItem(dashboardCacheKey);
      if (!raw) {
        return;
      }
      try {
        const parsed = JSON.parse(raw) as {
          pharmacies?: ApiPharmacy[];
          prescriptions?: ApiPrescription[];
          myPharmacy?: ApiPharmacy | null;
        };
        setPharmacies(Array.isArray(parsed.pharmacies) ? parsed.pharmacies : []);
        setPrescriptions(Array.isArray(parsed.prescriptions) ? parsed.prescriptions : []);
        setMyPharmacy(parsed.myPharmacy ?? null);
        applyMyPharmacyToForm(parsed.myPharmacy ?? null);
        setSyncMessage('Hors ligne: donnees locales chargees.');
      } catch {
        localStorage.removeItem(dashboardCacheKey);
      }
    }
  };

  useEffect(() => {
    loadData().catch(() => undefined);
  }, [token]);

  useEffect(() => {
    if (!dashboardCacheKey) {
      return;
    }
    localStorage.setItem(
      dashboardCacheKey,
      JSON.stringify({
        pharmacies,
        prescriptions,
        myPharmacy
      })
    );
  }, [dashboardCacheKey, myPharmacy, pharmacies, prescriptions]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline && editMode) {
      setEditMode(false);
      setSyncMessage("Hors ligne: la modification du profil est desactivee.");
    }
  }, [editMode, isOnline]);

  useEffect(() => {
    if (!token || !isOnline) {
      setPendingOutboxCount(getPendingPharmacyResponseCount());
      return;
    }

    flushPharmacyResponsesOutbox(token)
      .then((remaining) => {
        setPendingOutboxCount(remaining);
        if (remaining === 0) {
          setSyncMessage('Synchronisation terminee.');
        } else {
          setSyncMessage(`${remaining} action(s) en attente.`);
        }
        return loadData();
      })
      .catch(() => {
        setPendingOutboxCount(getPendingPharmacyResponseCount());
      });
  }, [isOnline, token]);

  const pharmacy = myPharmacy ?? pharmacies.find((item) => item.id === user?.pharmacy_id) ?? null;
  const pharmacyHasGps = Boolean(
    String(pharmacy?.latitude ?? '').trim() && String(pharmacy?.longitude ?? '').trim()
  );
  const profileChecks = useMemo(
    () => [
      { key: 'telephone', label: 'telephone', filled: profileForm.phone.trim().length > 0 },
      { key: 'adresse', label: 'adresse', filled: profileForm.address.trim().length > 0 },
      {
        key: 'horaires',
        label: 'horaires',
        filled: (profileForm.opening_hours.trim() || serializeOpeningHours(weeklySchedule).trim()).length > 0
      },
      { key: 'latitude', label: 'latitude', filled: profileForm.latitude.trim().length > 0 },
      { key: 'longitude', label: 'longitude', filled: profileForm.longitude.trim().length > 0 },
      {
        key: 'paiements',
        label: 'paiements',
        filled: (profileForm.payment_methods.trim() || selectedPaymentMethods.join(', ').trim()).length > 0
      },
      {
        key: 'services',
        label: 'services',
        filled: (profileForm.services.trim() || selectedServices.join(', ').trim()).length > 0
      },
      { key: 'numero licence', label: 'numero licence', filled: profileForm.license_number.trim().length > 0 }
    ],
    [profileForm, selectedPaymentMethods, selectedServices, weeklySchedule]
  );

  const profileMissingFields = useMemo(
    () => profileChecks.filter((item) => !item.filled).map((item) => item.label),
    [profileChecks]
  );
  const profileIncomplete = profileMissingFields.length > 0;
  const profileCompletion = useMemo(() => {
    const done = profileChecks.filter((item) => item.filled).length;
    return Math.round((done / profileChecks.length) * 100);
  }, [profileChecks]);

  const requiredLabel = (label: string, isFilled: boolean) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span>* {label}</span>
      <IonIcon icon={isFilled ? checkmarkCircleOutline : alertCircleOutline} color={isFilled ? 'success' : 'warning'} />
    </span>
  );

  const focusMissingField = (field: string) => {
    setProfileCardExpanded(true);
    setEditMode(true);
    setIdentitySectionExpanded(['telephone', 'adresse'].includes(field));
    setHoursSectionExpanded(field === 'horaires');
    setServicesSectionExpanded(['paiements', 'services'].includes(field));
    setBusinessSectionExpanded(field === 'numero licence');
    setGpsSectionExpanded(['latitude', 'longitude'].includes(field));
  };

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

  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter((p) => p.status === statusFilter);
  }, [prescriptions, statusFilter]);

  const handleRespond = async (payload: {
    prescription_id: number;
    medicine_request_id: number;
    status: ApiPharmacyResponse['status'];
  }) => {
    const currentPharmacyId = pharmacy?.id ?? user?.pharmacy_id ?? null;
    if (!token || !currentPharmacyId) {
      setError('Veuillez vous reconnecter.');
      return;
    }
    if (!pharmacyHasGps) {
      setError('GPS requis: renseignez latitude et longitude de la pharmacie avant de confirmer une disponibilite.');
      return;
    }
    setError(null);
    setSyncMessage(null);
    const queuePayload = {
      pharmacy_id: currentPharmacyId,
      prescription_id: payload.prescription_id,
      medicine_request_id: payload.medicine_request_id,
      status: payload.status,
      expires_at_minutes: 60
    } as const;
    const applyOptimisticResponse = () => {
      const nowIso = new Date().toISOString();
      const expiresAtIso = new Date(Date.now() + queuePayload.expires_at_minutes * 60_000).toISOString();
      setPrescriptions((prev) =>
        prev.map((rx) => {
          if (rx.id !== queuePayload.prescription_id) {
            return rx;
          }
          const nextResponses = rx.responses.filter(
            (r) =>
              !(
                r.pharmacy_id === queuePayload.pharmacy_id &&
                r.medicine_request_id === queuePayload.medicine_request_id
              )
          );
          const nextResponse: ApiPharmacyResponse = {
            id: -Date.now(),
            pharmacy_id: queuePayload.pharmacy_id,
            prescription_id: queuePayload.prescription_id,
            medicine_request_id: queuePayload.medicine_request_id,
            status: queuePayload.status,
            responded_at: nowIso,
            expires_at: expiresAtIso
          };
          nextResponses.push(nextResponse);
          return { ...rx, responses: nextResponses };
        })
      );
    };

    // Always update UI immediately so button switches even if network signal is flaky.
    applyOptimisticResponse();

    if (!isOnline) {
      const queued = enqueuePharmacyResponse(queuePayload);
      setPendingOutboxCount(queued);
      setSyncMessage(`Hors ligne: reponse en file d'attente (${queued}).`);
      return;
    }

    try {
      await api.createPharmacyResponse(token, queuePayload);
      await loadData();
    } catch (err) {
      const queued = enqueuePharmacyResponse(queuePayload);
      setPendingOutboxCount(queued);
      setSyncMessage(`Reseau indisponible: reponse en file d'attente (${queued}).`);
      setError(err instanceof Error ? err.message : "Echec de l'enregistrement de la reponse");
    }
  };

  const handleReactivatePrescription = async (prescriptionId: number) => {
    if (!token) {
      setError('Veuillez vous reconnecter.');
      return;
    }
    setError(null);
    setReactivatingPrescriptionId(prescriptionId);
    try {
      await api.reactivatePharmacyPrescription(token, prescriptionId);
      await loadData();
      setStatusFilter('sent_to_pharmacies');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Echec de la reactivation.");
    } finally {
      setReactivatingPrescriptionId(null);
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
        pharmacy_mode: 'quick_manual',
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
        logo_url: profileForm.logo_url.trim() || null,
        storefront_image_url: profileForm.storefront_image_url.trim() || null,
        notes_for_patients: profileForm.notes_for_patients.trim() || null
      });
      applyUpdatedPharmacy(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Echec de mise a jour du profil pharmacie');
    } finally {
      setProfileSaving(false);
    }
  };

  const applyUpdatedPharmacy = (updated: ApiPharmacy) => {
    setMyPharmacy(updated);
    setPharmacies((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
    setProfileForm((prev) => ({
      ...prev,
      logo_url: updated.logo_url ?? '',
      storefront_image_url: updated.storefront_image_url ?? ''
    }));
  };

  const handleLogoUpload = async (file: File | null) => {
    if (!token || !file) {
      return;
    }
    setUploadingLogo(true);
    setError(null);
    try {
      const updated = await api.uploadMyPharmacyLogo(token, file);
      applyUpdatedPharmacy(updated);
      setLogoPreviewUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Echec de l'upload du logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleStorefrontUpload = async (file: File | null) => {
    if (!token || !file) {
      return;
    }
    setUploadingStorefront(true);
    setError(null);
    try {
      const updated = await api.uploadMyPharmacyStorefrontImage(token, file);
      applyUpdatedPharmacy(updated);
      setStorefrontPreviewUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Echec de l'upload de la vitrine.");
    } finally {
      setUploadingStorefront(false);
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

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
      if (storefrontPreviewUrl) URL.revokeObjectURL(storefrontPreviewUrl);
    };
  }, [logoPreviewUrl, storefrontPreviewUrl]);

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
        <IonCard className="surface-card">
          <IonCardContent>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <IonBadge color={isOnline ? 'success' : 'warning'}>
                {isOnline ? 'En ligne' : 'Hors ligne'}
              </IonBadge>
              <IonBadge color={pendingOutboxCount > 0 ? 'warning' : 'success'}>
                Actions en attente: {pendingOutboxCount}
              </IonBadge>
            </div>
            {syncMessage ? (
              <IonText color="medium">
                <p style={{ marginBottom: 0 }}>{syncMessage}</p>
              </IonText>
            ) : null}
          </IonCardContent>
        </IonCard>
        {!pharmacy ? (
          <IonCard className="surface-card">
            <IonCardContent>
              <IonText color="danger">Aucune pharmacie liee a ce compte.</IonText>
            </IonCardContent>
          </IonCard>
        ) : (
          <IonCard className="hero-card">
            <IonCardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <IonCardTitle>Profil pharmacie</IonCardTitle>
                  <IonBadge color={profileCompletion === 100 ? 'success' : 'warning'}>
                    Completion du profil : {profileCompletion}%
                  </IonBadge>
                  <IonBadge color={pharmacy.temporary_closed ? 'danger' : pharmacy.open_now ? 'success' : 'medium'}>
                    {pharmacy.temporary_closed ? 'Fermeture temporaire' : pharmacy.open_now ? 'Ouverte' : 'Fermee'}
                  </IonBadge>
                </div>
                <IonButton fill="clear" size="small" onClick={() => setProfileCardExpanded((prev) => !prev)}>
                  <IonIcon icon={profileCardExpanded ? chevronUpOutline : chevronDownOutline} />
                </IonButton>
              </div>
            </IonCardHeader>
            {profileCardExpanded ? <IonCardContent>
              <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr auto', gap: '10px', alignItems: 'center' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    display: 'grid',
                    placeItems: 'center',
                    background: '#dbeafe'
                  }}
                >
                  {profileForm.logo_url ? (
                    <img
                      src={profileForm.logo_url}
                      alt="Logo pharmacie"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }}
                    />
                  ) : (
                    <IonIcon icon={storefrontOutline} style={{ fontSize: '32px', color: '#1d4ed8' }} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{pharmacy.name}</div>
                  <div style={{ color: '#64748b', fontSize: '0.95rem' }}>
                    {profileForm.address || 'Adresse non renseignee'}
                  </div>
                </div>
                <IonButton
                  size="small"
                  fill={editMode ? 'solid' : 'outline'}
                  color={isOnline ? 'primary' : 'warning'}
                  onClick={() => setEditMode((prev) => !prev)}
                  disabled={!isOnline}
                >
                  {editMode ? 'Lecture' : 'Modifier'}
                </IonButton>
              </div>
              <p>
                Fiabilite : {pharmacy.reliability_score}
                {' ||| '}
                {pharmacy.last_status_updated_at
                  ? `Mise a jour il y a ${minutesAgo(pharmacy.last_status_updated_at)} min`
                  : 'Mise a jour inconnue'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {pharmacy.closes_at ? <IonText>Ferme a {pharmacy.closes_at}</IonText> : null}
              </div>
              {profileIncomplete ? (
                <div
                  style={{
                    marginTop: '10px',
                    border: '1px solid #fde68a',
                    background: '#fffbeb',
                    borderRadius: '12px',
                    padding: '10px'
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>Profil incomplet</div>
                  <div style={{ color: '#92400e', fontSize: '0.92rem', marginBottom: '8px' }}>
                    Il manque {profileMissingFields.length} champ(s) obligatoire(s).
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {profileMissingFields.map((field) => (
                      <IonButton key={field} size="small" fill="outline" color="warning" onClick={() => focusMissingField(field)}>
                        {field}
                      </IonButton>
                    ))}
                  </div>
                </div>
              ) : null}
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '999px',
                  background: '#e2e8f0',
                  overflow: 'hidden',
                  marginBottom: '8px'
                }}
              >
                <div
                  style={{
                    width: `${profileCompletion}%`,
                    height: '100%',
                    background: profileCompletion >= 80 ? '#16a34a' : profileCompletion >= 50 ? '#d97706' : '#dc2626'
                  }}
                />
              </div>
              <>
              <div style={{ marginTop: '8px', border: '1px solid #dbe7ef', borderRadius: '12px', overflow: 'hidden' }}>
                <IonButton expand="block" fill="clear" color="dark" onClick={() => setIdentitySectionExpanded((p) => !p)} style={{ margin: 0 }}>
                  Identite & Statut {identitySectionExpanded ? <IonIcon slot="end" icon={chevronUpOutline} /> : <IonIcon slot="end" icon={chevronDownOutline} />}
                </IonButton>
                {identitySectionExpanded ? (
                  <>
                    <IonItem lines="none">
                      <IonLabel position="stacked">{requiredLabel('Telephone', profileForm.phone.trim().length > 0)}</IonLabel>
                      <IonInput
                        disabled={!editMode}
                        value={profileForm.phone}
                        placeholder="+509-xxxx-xxxx"
                        onIonInput={(event) => setProfileForm((prev) => ({ ...prev, phone: maskHaitiPhone(event.detail.value ?? '') }))}
                      />
                    </IonItem>
                    <IonItem lines="none">
                      <IonLabel position="stacked">{requiredLabel('Adresse', profileForm.address.trim().length > 0)}</IonLabel>
                      <IonInput
                        disabled={!editMode}
                        value={profileForm.address}
                        placeholder="Adresse"
                        onIonInput={(event) => setProfileForm((prev) => ({ ...prev, address: event.detail.value ?? '' }))}
                      />
                    </IonItem>
                    <IonItem lines="none">
                      <IonLabel>Ouvert maintenant</IonLabel>
                      <IonToggle
                        disabled={!editMode}
                        checked={profileForm.open_now}
                        onIonChange={(event) => setProfileForm((prev) => ({ ...prev, open_now: event.detail.checked }))}
                      />
                    </IonItem>
                    <IonItem lines="none">
                      <IonLabel>Fermeture temporaire</IonLabel>
                      <IonToggle
                        disabled={!editMode}
                        checked={profileForm.temporary_closed}
                        onIonChange={(event) => setProfileForm((prev) => ({ ...prev, temporary_closed: event.detail.checked }))}
                      />
                    </IonItem>
                    <IonItem lines="none">
                      <IonLabel>Disponibilite urgence</IonLabel>
                      <IonToggle
                        disabled={!editMode}
                        checked={profileForm.emergency_available}
                        onIonChange={(event) => setProfileForm((prev) => ({ ...prev, emergency_available: event.detail.checked }))}
                      />
                    </IonItem>
                  </>
                ) : null}
              </div>

              <div style={{ marginTop: '8px', border: '1px solid #dbe7ef', borderRadius: '12px', overflow: 'hidden' }}>
                <IonButton expand="block" fill="clear" color="dark" onClick={() => setHoursSectionExpanded((p) => !p)} style={{ margin: 0 }}>
                  Horaires {hoursSectionExpanded ? <IonIcon slot="end" icon={chevronUpOutline} /> : <IonIcon slot="end" icon={chevronDownOutline} />}
                </IonButton>
                {hoursSectionExpanded ? (
                  <div style={{ display: 'grid', gap: '8px', margin: '8px 0 10px', padding: '0 10px' }}>
                    {weeklySchedule.map((row, index) => (
                      <div key={row.day} style={{ display: 'grid', gridTemplateColumns: '70px auto 1fr 1fr', gap: '8px', alignItems: 'center' }}>
                        <strong style={{ fontSize: '0.9rem' }}>{row.day}</strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <IonToggle
                            disabled={!editMode}
                            checked={row.open}
                            onIonChange={(event) =>
                              setWeeklySchedule((prev) => prev.map((item, i) => (i === index ? { ...item, open: event.detail.checked } : item)))
                            }
                          />
                        </div>
                        <input
                          type="time"
                          className="time-input-no-icon"
                          value={row.from}
                          disabled={!row.open || !editMode}
                          onClick={(event) => {
                            const target = event.currentTarget as HTMLInputElement & { showPicker?: () => void };
                            target.showPicker?.();
                          }}
                          onChange={(event) =>
                            setWeeklySchedule((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, from: event.currentTarget.value || item.from } : item))
                            )
                          }
                          style={{
                            width: '100%',
                            minHeight: '44px',
                            border: '1px solid #dbe7ef',
                            borderRadius: '10px',
                            padding: '0px 0px',
                            textAlign: 'center'
                          }}
                        />
                        <input
                          type="time"
                          className="time-input-no-icon"
                          value={row.to}
                          disabled={!row.open || !editMode}
                          onClick={(event) => {
                            const target = event.currentTarget as HTMLInputElement & { showPicker?: () => void };
                            target.showPicker?.();
                          }}
                          onChange={(event) =>
                            setWeeklySchedule((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, to: event.currentTarget.value || item.to } : item))
                            )
                          }
                          style={{
                            width: '100%',
                            minHeight: '44px',
                            border: '1px solid #dbe7ef',
                            borderRadius: '10px',
                            padding: '0px 0px',
                            textAlign: 'center'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div style={{ marginTop: '8px', border: '1px solid #dbe7ef', borderRadius: '12px', overflow: 'hidden' }}>
                <IonButton expand="block" fill="clear" color="dark" onClick={() => setServicesSectionExpanded((p) => !p)} style={{ margin: 0 }}>
                  Services & Paiements {servicesSectionExpanded ? <IonIcon slot="end" icon={chevronUpOutline} /> : <IonIcon slot="end" icon={chevronDownOutline} />}
                </IonButton>
                {servicesSectionExpanded ? (
                  <>
                    <IonItem lines="none">
                      <IonLabel position="stacked">
                        {requiredLabel('Services', (profileForm.services.trim() || selectedServices.join(', ').trim()).length > 0)}
                      </IonLabel>
                    </IonItem>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      {SERVICE_OPTIONS.map((option) => (
                        <IonItem key={option} lines="none">
                          <IonCheckbox
                            disabled={!editMode}
                            slot="start"
                            checked={selectedServices.includes(option)}
                            onIonChange={(event) =>
                              setSelectedServices((prev) =>
                                event.detail.checked ? Array.from(new Set([...prev, option])) : prev.filter((item) => item !== option)
                              )
                            }
                          />
                          <IonLabel>{option}</IonLabel>
                        </IonItem>
                      ))}
                    </div>
                    <IonItem lines="none">
                      <IonLabel position="stacked">
                        {requiredLabel('Moyens de paiement', (profileForm.payment_methods.trim() || selectedPaymentMethods.join(', ').trim()).length > 0)}
                      </IonLabel>
                    </IonItem>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      {PAYMENT_OPTIONS.map((option) => (
                        <IonItem key={option} lines="none">
                          <IonCheckbox
                            disabled={!editMode}
                            slot="start"
                            checked={selectedPaymentMethods.includes(option)}
                            onIonChange={(event) =>
                              setSelectedPaymentMethods((prev) =>
                                event.detail.checked ? Array.from(new Set([...prev, option])) : prev.filter((item) => item !== option)
                              )
                            }
                          />
                          <IonLabel>{option}</IonLabel>
                        </IonItem>
                      ))}
                    </div>
                    <IonItem lines="none">
                      <IonLabel>Livraison disponible</IonLabel>
                      <IonToggle
                        disabled={!editMode}
                        checked={profileForm.delivery_available}
                        onIonChange={(event) => setProfileForm((prev) => ({ ...prev, delivery_available: event.detail.checked }))}
                      />
                    </IonItem>
                    <IonItem lines="none">
                      <IonLabel position="stacked">Rayon de livraison (km)</IonLabel>
                      <IonInput
                        disabled={!editMode}
                        type="number"
                        value={profileForm.delivery_radius_km}
                        onIonInput={(event) => setProfileForm((prev) => ({ ...prev, delivery_radius_km: event.detail.value ?? '' }))}
                      />
                    </IonItem>
                    <IonItem lines="none">
                      <IonLabel>Service de nuit</IonLabel>
                      <IonToggle
                        disabled={!editMode}
                        checked={profileForm.night_service}
                        onIonChange={(event) => setProfileForm((prev) => ({ ...prev, night_service: event.detail.checked }))}
                      />
                    </IonItem>
                  </>
                ) : null}
              </div>

              <div style={{ marginTop: '8px', border: '1px solid #dbe7ef', borderRadius: '12px', overflow: 'hidden' }}>
                <IonButton expand="block" fill="clear" color="dark" onClick={() => setBusinessSectionExpanded((p) => !p)} style={{ margin: 0 }}>
                  Activite & Verification {businessSectionExpanded ? <IonIcon slot="end" icon={chevronUpOutline} /> : <IonIcon slot="end" icon={chevronDownOutline} />}
                </IonButton>
                {businessSectionExpanded ? (
                  <>
                    <IonItem lines="none">
                      <IonLabel position="stacked">Niveau de prix</IonLabel>
                      <IonSelect
                        disabled={!editMode}
                        value={profileForm.price_range}
                        placeholder="Selectionner"
                        onIonChange={(event) => setProfileForm((prev) => ({ ...prev, price_range: (event.detail.value as '' | 'low' | 'medium' | 'high') ?? '' }))}
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
                        disabled={!editMode}
                        type="number"
                        value={profileForm.average_wait_time}
                        onIonInput={(event) => setProfileForm((prev) => ({ ...prev, average_wait_time: event.detail.value ?? '' }))}
                      />
                    </IonItem>
                    <IonItem lines="none">
                      <IonLabel position="stacked">
                        {requiredLabel('Numero de licence', profileForm.license_number.trim().length > 0)}
                      </IonLabel>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <IonInput
                          disabled={!editMode}
                          value={profileForm.license_number}
                          onIonInput={(event) => setProfileForm((prev) => ({ ...prev, license_number: event.detail.value ?? '' }))}
                        />
                        <IonIcon
                          icon={profileForm.license_verified ? starOutline : closeCircleOutline}
                          color={profileForm.license_verified ? 'warning' : 'danger'}
                          style={{ fontSize: '20px' }}
                        />
                      </div>
                    </IonItem>
                    <div style={{ padding: '8px 12px' }}>
                      <IonLabel style={{ display: 'block', marginBottom: '6px' }}>Logo</IonLabel>
                      {(profileForm.logo_url || pharmacy?.logo_url || logoPreviewUrl) ? (
                        <img
                          src={(profileForm.logo_url || pharmacy?.logo_url || (editMode ? logoPreviewUrl : null) || '')}
                          alt="Logo pharmacie"
                          style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #dbe7ef' }}
                          onError={(event) => {
                            const target = event.currentTarget as HTMLImageElement;
                            if (target.src !== (pharmacy?.logo_url ?? '')) {
                              target.src = pharmacy?.logo_url ?? '';
                            }
                          }}
                        />
                      ) : (
                        <IonText color="medium">Aucun logo</IonText>
                      )}
                      {editMode ? (
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
                            setLogoPreviewUrl(file ? URL.createObjectURL(file) : null);
                            handleLogoUpload(file).catch(() => undefined);
                            event.currentTarget.value = '';
                          }}
                          disabled={uploadingLogo}
                          style={{ marginTop: '8px', display: 'block' }}
                        />
                      ) : null}
                      {uploadingLogo ? <IonText color="medium">Upload logo...</IonText> : null}
                    </div>
                    <div style={{ padding: '8px 12px' }}>
                      <IonLabel style={{ display: 'block', marginBottom: '6px' }}>Photo vitrine</IonLabel>
                      {(profileForm.storefront_image_url || pharmacy?.storefront_image_url || storefrontPreviewUrl) ? (
                        <img
                          src={(profileForm.storefront_image_url || pharmacy?.storefront_image_url || (editMode ? storefrontPreviewUrl : null) || '')}
                          alt="Vitrine pharmacie"
                          style={{ width: '100%', maxWidth: '280px', height: '120px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #dbe7ef' }}
                          onError={(event) => {
                            const target = event.currentTarget as HTMLImageElement;
                            if (target.src !== (pharmacy?.storefront_image_url ?? '')) {
                              target.src = pharmacy?.storefront_image_url ?? '';
                            }
                          }}
                        />
                      ) : (
                        <IonText color="medium">Aucune photo vitrine</IonText>
                      )}
                      {editMode ? (
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            if (storefrontPreviewUrl) URL.revokeObjectURL(storefrontPreviewUrl);
                            setStorefrontPreviewUrl(file ? URL.createObjectURL(file) : null);
                            handleStorefrontUpload(file).catch(() => undefined);
                            event.currentTarget.value = '';
                          }}
                          disabled={uploadingStorefront}
                          style={{ marginTop: '8px', display: 'block' }}
                        />
                      ) : null}
                      {uploadingStorefront ? <IonText color="medium">Upload vitrine...</IonText> : null}
                    </div>
                    <IonItem lines="none">
                      <IonLabel position="stacked">Notes pour patients</IonLabel>
                      <IonTextarea
                        disabled={!editMode}
                        autoGrow
                        value={profileForm.notes_for_patients}
                        onIonInput={(event) => setProfileForm((prev) => ({ ...prev, notes_for_patients: event.detail.value ?? '' }))}
                      />
                    </IonItem>
                  </>
                ) : null}
              </div>

              <div style={{ marginTop: '8px', border: '1px solid #dbe7ef', borderRadius: '12px', overflow: 'hidden' }}>
                <IonButton expand="block" fill="clear" color="dark" onClick={() => setGpsSectionExpanded((p) => !p)} style={{ margin: 0 }}>
                  Localisation GPS {gpsSectionExpanded ? <IonIcon slot="end" icon={chevronUpOutline} /> : <IonIcon slot="end" icon={chevronDownOutline} />}
                </IonButton>
                {gpsSectionExpanded ? (
                  <>
                    <IonItem lines="none">
                      <IonLabel position="stacked">{requiredLabel('Latitude', profileForm.latitude.trim().length > 0)}</IonLabel>
                      <IonInput
                        disabled={!editMode}
                        value={profileForm.latitude}
                        placeholder="19.7510"
                        onIonInput={(event) => setProfileForm((prev) => ({ ...prev, latitude: event.detail.value ?? '' }))}
                      />
                    </IonItem>
                    <IonItem lines="none">
                      <IonLabel position="stacked">{requiredLabel('Longitude', profileForm.longitude.trim().length > 0)}</IonLabel>
                      <IonInput
                        disabled={!editMode}
                        value={profileForm.longitude}
                        placeholder="-72.2014"
                        onIonInput={(event) => setProfileForm((prev) => ({ ...prev, longitude: event.detail.value ?? '' }))}
                      />
                    </IonItem>
                    <div style={{ padding: '0 12px 12px' }}>
                      <IonButton size="small" fill="outline" onClick={fillGpsFromDevice} disabled={isLocating || !editMode}>
                        {isLocating ? 'GPS...' : 'Obtenir GPS'}
                      </IonButton>
                    </div>
                  </>
                ) : null}
              </div>
              {editMode ? (
                <IonButton expand="block" onClick={saveProfile} disabled={profileSaving}>
                  {profileSaving ? 'Enregistrement...' : 'Enregistrer'}
                </IonButton>
              ) : null}
              </>
            </IonCardContent> : null}
          </IonCard>
        )}

        <div className="dashboard-grid" style={{ marginTop: '8px' }}>
          <IonCard
            button
            className="surface-card"
            style={{ margin: 0 }}
            onClick={() => ionRouter.push('/pharmacy/prescriptions', 'forward', 'push')}
          >
            <IonCardContent>
              <div className="quick-icon quick-icon-gold">
                <IonIcon icon={documentTextOutline} />
              </div>
              <h3>Ordonnances</h3>
              <p className="muted-note">Traiter la disponibilite des medicaments.</p>
            </IonCardContent>
          </IonCard>
          <IonCard
            button
            className="surface-card"
            style={{ margin: 0 }}
            onClick={() => ionRouter.push('/pharmacy/doctors', 'forward', 'push')}
          >
            <IonCardContent>
              <div className="quick-icon quick-icon-blue">
                <IonIcon icon={medkitOutline} />
              </div>
              <h3>Annuaire medecins</h3>
              <p className="muted-note">Voir les medecins et leur statut.</p>
            </IonCardContent>
          </IonCard>
          <IonCard
            button
            className="surface-card"
            style={{ margin: 0 }}
            onClick={() => ionRouter.push('/pharmacy/pharmacies', 'forward', 'push')}
          >
            <IonCardContent>
              <div className="quick-icon quick-icon-green">
                <IonIcon icon={storefrontOutline} />
              </div>
              <h3>Annuaire pharmacies</h3>
              <p className="muted-note">Voir les pharmacies et leur statut.</p>
            </IonCardContent>
          </IonCard>
        </div>

        {error ? (
          <IonText color="danger">
            <p>{error}</p>
          </IonText>
        ) : null}
      </IonContent>
    </IonPage>
  );
};

export default PharmacyDashboard;

import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonPage,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
  useIonRouter,
  useIonToast,
} from '@ionic/react';
import {
  add,
  calendarOutline,
  cameraOutline,
  cubeOutline,
  flaskOutline,
  peopleOutline,
  personOutline,
  snowOutline,
  warningOutline,
} from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, type ApiFamilyMember, type ApiPatientMedicineCabinetItem } from '../services/api';
import { useAuth } from '../state/AuthState';
import { formatDateTime as formatDateTimeLabel } from '../utils/time';

type EditForm = {
  family_member_id: string;
  medication_name: string;
  form: string;
  dosage_strength: string;
  daily_dosage: string;
  reminder_times: string[];
  quantity: string;
  expiration_date: string;
  manufacturer: string;
  requires_refrigeration: boolean;
  refill_reminder_days: string;
  note: string;
};

type CreateForm = {
  family_member_id: string;
  medication_name: string;
  form: string;
  dosage_strength: string;
  daily_dosage: string;
  reminder_times: string[];
  quantity: string;
  refill_reminder_days: string;
  expiration_date: string;
  manufacturer: string;
  requires_refrigeration: boolean;
  note: string;
};

type CabinetView = 'all' | 'mine' | 'family' | 'alerts';

const emptyForm: EditForm = {
  family_member_id: '',
  medication_name: '',
  form: '',
  dosage_strength: '',
  daily_dosage: '',
  reminder_times: [],
  quantity: '1',
  expiration_date: '',
  manufacturer: '',
  requires_refrigeration: false,
  refill_reminder_days: '7',
  note: '',
};

const emptyCreateForm: CreateForm = {
  family_member_id: '',
  medication_name: '',
  form: '',
  dosage_strength: '',
  daily_dosage: '',
  reminder_times: [],
  quantity: '1',
  refill_reminder_days: '7',
  expiration_date: '',
  manufacturer: '',
  requires_refrigeration: false,
  note: '',
};

const startOfToday = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

const expirationStatus = (value: string | null) => {
  if (!value) return { label: 'Sans date', color: 'medium' as const, priority: 0 };
  const target = new Date(`${value}T00:00:00`);
  if (Number.isNaN(target.getTime())) return { label: 'Date invalide', color: 'warning' as const, priority: 1 };
  const today = startOfToday();
  const diffDays = Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return { label: 'Perime', color: 'danger' as const, priority: 3 };
  if (diffDays <= 30) return { label: `A renouveler (${diffDays}j)`, color: 'warning' as const, priority: 2 };
  return { label: 'OK', color: 'success' as const, priority: 0 };
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'N/D';
  return formatDateTimeLabel(value);
};

const isValidTimeValue = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const parseDailyDosage = (value: string): number | null => {
  const parsedRaw = Number(value || '');
  if (!Number.isFinite(parsedRaw) || parsedRaw <= 0) return null;
  return Math.min(24, Math.floor(parsedRaw));
};

const defaultReminderTimes = (count: number): string[] => {
  if (count <= 0) return [];
  if (count === 1) return ['08:00'];
  if (count === 2) return ['08:00', '20:00'];
  if (count === 3) return ['08:00', '14:00', '20:00'];

  const start = 6 * 60;
  const end = 22 * 60;
  const step = (end - start) / Math.max(1, count - 1);
  return Array.from({ length: count }, (_, index) => {
    const minutes = Math.round(start + step * index);
    const h = String(Math.floor(minutes / 60)).padStart(2, '0');
    const m = String(minutes % 60).padStart(2, '0');
    return `${h}:${m}`;
  });
};

const normalizeReminderTimes = (existing: string[], count: number): string[] => {
  if (count <= 0) return [];
  const validExisting = (existing ?? []).filter((value) => isValidTimeValue(value)).slice(0, count);
  const fallback = defaultReminderTimes(count);
  return Array.from({ length: count }, (_, index) => validExisting[index] ?? fallback[index] ?? '08:00');
};

const PatientMedicationsPage: React.FC = () => {
  const { token } = useAuth();
  const ionRouter = useIonRouter();
  const [presentToast] = useIonToast();

  const [items, setItems] = useState<ApiPatientMedicineCabinetItem[]>([]);
  const [familyMembers, setFamilyMembers] = useState<ApiFamilyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<CabinetView>('all');
  const [search, setSearch] = useState('');
  const [refrigerationOnly, setRefrigerationOnly] = useState(false);
  const [withPhotoOnly, setWithPhotoOnly] = useState(false);
  const [withoutManufacturerOnly, setWithoutManufacturerOnly] = useState(false);

  const [activeItem, setActiveItem] = useState<ApiPatientMedicineCabinetItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<EditForm>(emptyForm);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm);

  const loadItems = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await api.getPatientCabinetItems(token);
      setItems(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le cabinet.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!token) {
      setFamilyMembers([]);
      return;
    }
    api.getPatientFamilyMembers(token)
      .then(setFamilyMembers)
      .catch(() => setFamilyMembers([]));
  }, [token]);

  const stats = useMemo(() => {
    const total = items.length;
    const refrigerated = items.filter((item) => item.requires_refrigeration).length;
    const expired = items.filter((item) => expirationStatus(item.expiration_date).priority >= 3).length;
    const expiringSoon = items.filter((item) => expirationStatus(item.expiration_date).priority === 2).length;
    return { total, refrigerated, expired, expiringSoon };
  }, [items]);

  const displayedItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items
      .filter((item) => {
        if (view === 'mine' && item.family_member_id) return false;
        if (view === 'family' && !item.family_member_id) return false;
        if (view === 'alerts' && expirationStatus(item.expiration_date).priority < 2) return false;
        if (refrigerationOnly && !item.requires_refrigeration) return false;
        if (withPhotoOnly && !item.photo_url) return false;
        if (withoutManufacturerOnly && (item.manufacturer ?? '').trim() !== '') return false;
        if (!needle) return true;
        const haystack = [
          item.medication_name,
          item.form ?? '',
          item.dosage_strength ?? '',
          item.family_member_name ?? '',
          item.manufacturer ?? '',
          item.note ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(needle);
      })
      .sort((a, b) => {
        const pa = expirationStatus(a.expiration_date).priority;
        const pb = expirationStatus(b.expiration_date).priority;
        if (pb !== pa) return pb - pa;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
  }, [items, refrigerationOnly, search, view, withPhotoOnly, withoutManufacturerOnly]);

  const editDailyDoseCount = useMemo(() => {
    if (activeItem?.prescription_id) {
      return activeItem.daily_dosage ?? 0;
    }
    return parseDailyDosage(form.daily_dosage) ?? 0;
  }, [activeItem?.daily_dosage, activeItem?.prescription_id, form.daily_dosage]);

  const createDailyDoseCount = useMemo(() => parseDailyDosage(createForm.daily_dosage) ?? 0, [createForm.daily_dosage]);

  const openEditModal = (item: ApiPatientMedicineCabinetItem) => {
    setActiveItem(item);
    setForm({
      family_member_id: item.family_member_id ? String(item.family_member_id) : '',
      medication_name: item.medication_name ?? '',
      form: item.form ?? '',
      dosage_strength: item.dosage_strength ?? '',
      daily_dosage: item.daily_dosage ? String(item.daily_dosage) : '',
      reminder_times: normalizeReminderTimes(item.reminder_times ?? [], item.daily_dosage ?? 0),
      quantity: String(item.quantity ?? 1),
      expiration_date: item.expiration_date ?? '',
      manufacturer: item.manufacturer ?? '',
      requires_refrigeration: item.requires_refrigeration,
      refill_reminder_days: String(item.refill_reminder_days || 7),
      note: item.note ?? '',
    });
    setIsModalOpen(true);
  };

  const closeEditModal = () => {
    if (saving || uploading) return;
    setIsModalOpen(false);
    setActiveItem(null);
    setForm(emptyForm);
  };

  const closeCreateModal = () => {
    if (creating) return;
    setIsCreateModalOpen(false);
    setCreateForm(emptyCreateForm);
  };

  const saveDetails = async () => {
    if (!token || !activeItem) return;
    setSaving(true);
    try {
      const parsedReminderDays = Math.min(365, Math.max(1, Number(form.refill_reminder_days || '7') || 7));
      const parsedQuantity = Math.min(100000, Math.max(1, Number(form.quantity || '1') || 1));
      const parsedDailyDosage = parseDailyDosage(form.daily_dosage);
      const isManualItem = !activeItem.prescription_id;
      const targetDailyDosage = isManualItem ? parsedDailyDosage : (activeItem.daily_dosage ?? parsedDailyDosage);
      const reminderTimes = targetDailyDosage ? normalizeReminderTimes(form.reminder_times, targetDailyDosage) : undefined;
      const response = await api.updatePatientCabinetItem(token, activeItem.id, {
        family_member_id: form.family_member_id ? Number(form.family_member_id) : null,
        medication_name: isManualItem ? form.medication_name.trim() : undefined,
        form: isManualItem ? (form.form.trim() || null) : undefined,
        dosage_strength: isManualItem ? (form.dosage_strength.trim() || null) : undefined,
        daily_dosage: isManualItem ? parsedDailyDosage : undefined,
        quantity: isManualItem ? parsedQuantity : undefined,
        reminder_times: reminderTimes,
        expiration_date: form.expiration_date || null,
        manufacturer: form.manufacturer.trim() || null,
        requires_refrigeration: form.requires_refrigeration,
        refill_reminder_days: parsedReminderDays,
        note: form.note.trim() || null,
      });
      setItems((prev) => prev.map((row) => (row.id === activeItem.id ? { ...row, ...response.item } : row)));
      presentToast({ message: response.message, duration: 1800, color: 'success' });
      closeEditModal();
    } catch (err) {
      presentToast({ message: err instanceof Error ? err.message : 'Mise a jour impossible.', duration: 2200, color: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (file: File | null) => {
    if (!token || !activeItem || !file) return;
    setUploading(true);
    try {
      const response = await api.uploadPatientCabinetItemPhoto(token, activeItem.id, file);
      setItems((prev) => prev.map((row) => (row.id === activeItem.id ? { ...row, photo_url: response.photo_url } : row)));
      setActiveItem((prev) => (prev ? { ...prev, photo_url: response.photo_url } : prev));
      presentToast({ message: response.message, duration: 1800, color: 'success' });
    } catch (err) {
      presentToast({ message: err instanceof Error ? err.message : 'Upload impossible.', duration: 2200, color: 'danger' });
    } finally {
      setUploading(false);
    }
  };

  const removeItem = async (itemId: number) => {
    if (!token) return;
    setDeletingId(itemId);
    try {
      const response = await api.deletePatientCabinetItem(token, itemId);
      setItems((prev) => prev.filter((row) => row.id !== itemId));
      presentToast({ message: response.message, duration: 1800, color: 'success' });
      if (activeItem?.id === itemId) {
        closeEditModal();
      }
    } catch (err) {
      presentToast({ message: err instanceof Error ? err.message : 'Suppression impossible.', duration: 2200, color: 'danger' });
    } finally {
      setDeletingId(null);
    }
  };

  const createItem = async () => {
    if (!token) return;
    if (!createForm.medication_name.trim()) {
      presentToast({ message: 'Nom du medicament requis.', duration: 1800, color: 'warning' });
      return;
    }
    const parsedQuantity = Math.min(100000, Math.max(1, Number(createForm.quantity || '1') || 1));
    const parsedReminderDays = Math.min(365, Math.max(1, Number(createForm.refill_reminder_days || '7') || 7));
    const parsedDailyDosage = parseDailyDosage(createForm.daily_dosage);
    const reminderTimes = parsedDailyDosage ? normalizeReminderTimes(createForm.reminder_times, parsedDailyDosage) : undefined;

    setCreating(true);
    try {
      const response = await api.createPatientCabinetItem(token, {
        family_member_id: createForm.family_member_id ? Number(createForm.family_member_id) : null,
        medication_name: createForm.medication_name.trim(),
        form: createForm.form.trim() || null,
        dosage_strength: createForm.dosage_strength.trim() || null,
        daily_dosage: parsedDailyDosage,
        quantity: parsedQuantity,
        refill_reminder_days: parsedReminderDays,
        reminder_times: reminderTimes,
        expiration_date: createForm.expiration_date || null,
        manufacturer: createForm.manufacturer.trim() || null,
        requires_refrigeration: createForm.requires_refrigeration,
        note: createForm.note.trim() || null,
      });
      setItems((prev) => [response.item, ...prev]);
      presentToast({ message: response.message, duration: 1800, color: 'success' });
      closeCreateModal();
    } catch (err) {
      presentToast({ message: err instanceof Error ? err.message : 'Creation impossible.', duration: 2200, color: 'danger' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient" />
          </IonButtons>
          <IonTitle>Mon cabinet medicaments</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />

        <IonCard className="surface-card">
          <IonCardContent>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
              <div style={{ border: '1px solid #dbe7ef', borderRadius: '12px', padding: '10px' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Total</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{stats.total}</div>
              </div>
              <div style={{ border: '1px solid #dbe7ef', borderRadius: '12px', padding: '10px' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>A renouveler</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#a16207' }}>{stats.expiringSoon}</div>
              </div>
              <div style={{ border: '1px solid #dbe7ef', borderRadius: '12px', padding: '10px' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Perimes</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#b91c1c' }}>{stats.expired}</div>
              </div>
              <div style={{ border: '1px solid #dbe7ef', borderRadius: '12px', padding: '10px' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Refrigeration</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f766e' }}>{stats.refrigerated}</div>
              </div>
            </div>
          </IonCardContent>
        </IonCard>

        <IonSegment value={view} onIonChange={(e) => setView((e.detail.value as CabinetView) ?? 'all')}>
          <IonSegmentButton value="all">
            <IonLabel>Tous</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="mine">
            <IonLabel>Moi</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="family">
            <IonLabel>Famille</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="alerts">
            <IonLabel>Alertes</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        <IonSearchbar
          value={search}
          onIonInput={(e) => setSearch(e.detail.value ?? '')}
          placeholder="Rechercher un medicament, fabricant, note..."
          style={{ marginTop: '10px' }}
        />

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <IonButton size="small" fill={refrigerationOnly ? 'solid' : 'outline'} onClick={() => setRefrigerationOnly((v) => !v)}>
            <IonIcon icon={snowOutline} slot="start" />
            Refrigeration
          </IonButton>
          <IonButton size="small" fill={withPhotoOnly ? 'solid' : 'outline'} onClick={() => setWithPhotoOnly((v) => !v)}>
            <IonIcon icon={cameraOutline} slot="start" />
            Avec photo
          </IonButton>
          <IonButton
            size="small"
            fill={withoutManufacturerOnly ? 'solid' : 'outline'}
            onClick={() => setWithoutManufacturerOnly((v) => !v)}
          >
            <IonIcon icon={flaskOutline} slot="start" />
            Sans fabricant
          </IonButton>
        </div>

        {error ? (
          <IonText color="danger">
            <p>{error}</p>
          </IonText>
        ) : loading ? (
          <IonText color="medium">
            <p>Chargement...</p>
          </IonText>
        ) : displayedItems.length === 0 ? (
          <IonCard className="surface-card">
            <IonCardContent>
              <IonText color="medium">
                <p>Aucun medicament trouve pour ce filtre.</p>
              </IonText>
            </IonCardContent>
          </IonCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {displayedItems.map((item) => {
              const status = expirationStatus(item.expiration_date);
              return (
                <IonCard key={item.id} className="surface-card" style={{ margin: 0 }}>
                  <IonCardContent>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1rem', fontWeight: 700 }}>{item.medication_name}</div>
                        <div style={{ fontSize: '0.88rem', color: '#64748b' }}>
                          {[item.dosage_strength, item.form].filter(Boolean).join(' · ') || 'Details non renseignes'}
                        </div>
                      </div>
                      {item.photo_url ? (
                        <img
                          src={item.photo_url}
                          alt={`Photo ${item.medication_name}`}
                          style={{
                            width: '62px',
                            height: '62px',
                            objectFit: 'cover',
                            borderRadius: '10px',
                            border: '1px solid #dbe7ef'
                          }}
                        />
                      ) : null}
                      <IonBadge color={status.color}>{status.label}</IonBadge>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                      <IonBadge color="light">
                        <IonIcon icon={cubeOutline} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        Qte {item.quantity}
                      </IonBadge>
                      {item.daily_dosage ? (
                        <IonBadge color="light">
                          <IonIcon icon={calendarOutline} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                          {item.daily_dosage}/jour
                        </IonBadge>
                      ) : null}
                      {item.reminder_times.length > 0 ? (
                        <IonBadge color="light">
                          Heures {item.reminder_times.join(' · ')}
                        </IonBadge>
                      ) : null}
                      <IonBadge color="light">
                        Rappel {item.refill_reminder_days}j avant
                      </IonBadge>
                      <IonBadge color="light">
                        <IonIcon
                          icon={item.family_member_id ? peopleOutline : personOutline}
                          style={{ marginRight: '4px', verticalAlign: 'middle' }}
                        />
                        {item.family_member_name || 'Moi'}
                      </IonBadge>
                      {item.requires_refrigeration ? (
                        <IonBadge color="tertiary">
                          <IonIcon icon={snowOutline} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                          Refrigeration
                        </IonBadge>
                      ) : null}
                      {item.photo_url ? (
                        <IonBadge color="medium">
                          <IonIcon icon={cameraOutline} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                          Photo
                        </IonBadge>
                      ) : null}
                    </div>

                    <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#64748b' }}>
                      {item.manufacturer ? `Fabricant: ${item.manufacturer}` : 'Fabricant non renseigne'}
                      {item.pharmacy_name ? ` · ${item.pharmacy_name}` : ''}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      {item.prescription_id ? (
                        <IonButton
                          size="small"
                          fill="outline"
                          onClick={() => {
                            ionRouter.push(`/patient/prescriptions/${item.prescription_id}`, 'forward', 'push');
                          }}
                        >
                          Ordonnance
                        </IonButton>
                      ) : null}
                      <IonButton size="small" fill="outline" onClick={() => openEditModal(item)}>
                        Modifier
                      </IonButton>
                      <IonButton
                        size="small"
                        fill="outline"
                        color="danger"
                        disabled={deletingId === item.id}
                        onClick={() => {
                          void removeItem(item.id);
                        }}
                      >
                        Retirer
                      </IonButton>
                    </div>
                  </IonCardContent>
                </IonCard>
              );
            })}
          </div>
        )}

        <IonModal
          isOpen={isModalOpen}
          onDidDismiss={closeEditModal}
          initialBreakpoint={1}
          breakpoints={[0, 0.5, 0.85, 1]}
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>{activeItem?.medication_name || 'Mettre a jour'}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={closeEditModal} disabled={saving || uploading}>
                  Fermer
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeItem?.photo_url ? (
                <img
                  src={activeItem.photo_url}
                  alt="Photo medicament"
                  style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #dbe7ef' }}
                />
              ) : null}
              <IonItem>
                <IonLabel position="stacked">Pour qui</IonLabel>
                <IonSelect
                  value={form.family_member_id}
                  placeholder="Moi (patient)"
                  onIonChange={(e) => setForm((prev) => ({ ...prev, family_member_id: (e.detail.value as string) ?? '' }))}
                >
                  <IonSelectOption value="">Moi (patient)</IonSelectOption>
                  {familyMembers.map((member) => (
                    <IonSelectOption key={member.id} value={String(member.id)}>
                      {member.name}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
              {!activeItem?.prescription_id ? (
                <>
                  <IonItem>
                    <IonLabel position="stacked">Nom du medicament</IonLabel>
                    <IonInput
                      value={form.medication_name}
                      onIonInput={(e) => setForm((prev) => ({ ...prev, medication_name: e.detail.value ?? '' }))}
                    />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Forme</IonLabel>
                    <IonSelect
                      value={form.form}
                      placeholder="Selectionner une forme"
                      onIonChange={(e) => setForm((prev) => ({ ...prev, form: (e.detail.value as string) ?? '' }))}
                    >
                      <IonSelectOption value="Comprime">Comprime</IonSelectOption>
                      <IonSelectOption value="Capsule">Capsule</IonSelectOption>
                      <IonSelectOption value="Sirop">Sirop</IonSelectOption>
                      <IonSelectOption value="Solution">Solution</IonSelectOption>
                      <IonSelectOption value="Suspension">Suspension</IonSelectOption>
                      <IonSelectOption value="Injection">Injection</IonSelectOption>
                      <IonSelectOption value="Creme">Creme</IonSelectOption>
                      <IonSelectOption value="Gel">Gel</IonSelectOption>
                      <IonSelectOption value="Pommade">Pommade</IonSelectOption>
                      <IonSelectOption value="Gouttes">Gouttes</IonSelectOption>
                      <IonSelectOption value="Spray">Spray</IonSelectOption>
                      <IonSelectOption value="Sachet">Sachet</IonSelectOption>
                      <IonSelectOption value="Suppositoire">Suppositoire</IonSelectOption>
                      <IonSelectOption value="Inhalateur">Inhalateur</IonSelectOption>
                      <IonSelectOption value="Patch">Patch</IonSelectOption>
                      <IonSelectOption value="Autre">Autre</IonSelectOption>
                    </IonSelect>
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Dosage / force</IonLabel>
                    <IonInput
                      value={form.dosage_strength}
                      onIonInput={(e) => setForm((prev) => ({ ...prev, dosage_strength: e.detail.value ?? '' }))}
                    />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Dose journaliere</IonLabel>
                    <IonInput
                      type="number"
                      min={1}
                      max={24}
                      value={form.daily_dosage}
                      onIonInput={(e) => {
                        const nextValue = e.detail.value ?? '';
                        const nextDosage = parseDailyDosage(nextValue);
                        setForm((prev) => ({
                          ...prev,
                          daily_dosage: nextValue,
                          reminder_times: nextDosage ? normalizeReminderTimes(prev.reminder_times, nextDosage) : [],
                        }));
                      }}
                    />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Quantite</IonLabel>
                    <IonInput
                      type="number"
                      min={1}
                      max={100000}
                      value={form.quantity}
                      onIonInput={(e) => setForm((prev) => ({ ...prev, quantity: e.detail.value ?? '1' }))}
                    />
                  </IonItem>
                </>
              ) : null}
              <IonItem>
                <IonLabel position="stacked">Date expiration</IonLabel>
                <IonInput
                  type="date"
                  value={form.expiration_date}
                  onIonInput={(e) => setForm((prev) => ({ ...prev, expiration_date: e.detail.value ?? '' }))}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Fabricant</IonLabel>
                <IonInput
                  value={form.manufacturer}
                  onIonInput={(e) => setForm((prev) => ({ ...prev, manufacturer: e.detail.value ?? '' }))}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Refrigeration</IonLabel>
                <IonButton
                  slot="end"
                  size="small"
                  fill={form.requires_refrigeration ? 'solid' : 'outline'}
                  onClick={() => setForm((prev) => ({ ...prev, requires_refrigeration: !prev.requires_refrigeration }))}
                >
                  {form.requires_refrigeration ? 'Oui' : 'Non'}
                </IonButton>
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Rappel avant renouvellement (jours)</IonLabel>
                <IonInput
                  type="number"
                  min={1}
                  max={365}
                  value={form.refill_reminder_days}
                  onIonInput={(e) => setForm((prev) => ({ ...prev, refill_reminder_days: e.detail.value ?? '7' }))}
                />
              </IonItem>
              {editDailyDoseCount > 0 ? (
                <>
                  <IonItem lines="none">
                    <IonLabel>Heures de prise ({editDailyDoseCount} fois/jour)</IonLabel>
                  </IonItem>
                  {normalizeReminderTimes(form.reminder_times, editDailyDoseCount).map((time, index) => (
                    <IonItem key={`edit-reminder-${index}`}>
                      <IonLabel position="stacked">Prise {index + 1}</IonLabel>
                      <IonInput
                        type="time"
                        value={time}
                        onIonInput={(e) => {
                          const nextValue = (e.detail.value ?? '').slice(0, 5);
                          setForm((prev) => {
                            const next = normalizeReminderTimes(prev.reminder_times, editDailyDoseCount);
                            next[index] = nextValue;
                            return { ...prev, reminder_times: next };
                          });
                        }}
                      />
                    </IonItem>
                  ))}
                </>
              ) : null}
              <IonItem>
                <IonLabel position="stacked">Note</IonLabel>
                <IonTextarea
                  autoGrow
                  value={form.note}
                  onIonInput={(e) => setForm((prev) => ({ ...prev, note: e.detail.value ?? '' }))}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Photo</IonLabel>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    void uploadPhoto(file);
                  }}
                />
              </IonItem>
              {activeItem?.prescription_id ? (
                <IonButton
                  expand="block"
                  fill="outline"
                  onClick={() => {
                    ionRouter.push(`/patient/prescriptions/${activeItem.prescription_id}`, 'forward', 'push');
                  }}
                >
                  Voir ordonnance liee
                </IonButton>
              ) : null}
              {activeItem?.prescription_id ? (
                <IonCard className="surface-card" style={{ margin: 0 }}>
                  <IonCardContent>
                    <div style={{ fontWeight: 700, marginBottom: '6px' }}>Source ordonnance</div>
                    <p style={{ margin: '4px 0' }}><strong>Docteur:</strong> {activeItem.doctor_name || 'N/D'}</p>
                    <p style={{ margin: '4px 0' }}><strong>Patient:</strong> {activeItem.patient_name || 'N/D'}</p>
                    <p style={{ margin: '4px 0' }}>
                      <strong>Membre famille:</strong> {activeItem.family_member_name || 'Moi'}
                    </p>
                    <p style={{ margin: '4px 0' }}><strong>Code ordonnance:</strong> {activeItem.prescription_code || 'N/D'}</p>
                    <p style={{ margin: '4px 0' }}>
                      <strong>Date ordonnance:</strong> {formatDateTime(activeItem.prescription_requested_at)}
                    </p>
                    <p style={{ margin: '4px 0' }}>
                      <strong>Duree traitement:</strong>{' '}
                      {typeof activeItem.treatment_duration_days === 'number'
                        ? `${activeItem.treatment_duration_days} jour(s)`
                        : 'N/D'}
                    </p>
                    <p style={{ margin: '4px 0' }}>
                      <strong>Note ordonnance:</strong> {activeItem.prescription_note || 'N/D'}
                    </p>
                  </IonCardContent>
                </IonCard>
              ) : null}
              <IonButton
                expand="block"
                disabled={saving || uploading}
                onClick={() => {
                  void saveDetails();
                }}
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </IonButton>
              {activeItem ? (
                <IonButton
                  expand="block"
                  fill="outline"
                  color="danger"
                  disabled={deletingId === activeItem.id}
                  onClick={() => {
                    void removeItem(activeItem.id);
                  }}
                >
                  <IonIcon icon={warningOutline} slot="start" />
                  Retirer du cabinet
                </IonButton>
              ) : null}
            </div>
          </IonContent>
        </IonModal>

        <IonModal
          isOpen={isCreateModalOpen}
          onDidDismiss={closeCreateModal}
          initialBreakpoint={1}
          breakpoints={[0, 0.5, 0.85, 1]}
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>Ajouter un medicament</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={closeCreateModal} disabled={creating}>Fermer</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <IonItem>
                <IonLabel position="stacked">Pour qui</IonLabel>
                <IonSelect
                  value={createForm.family_member_id}
                  placeholder="Moi (patient)"
                  onIonChange={(e) => setCreateForm((prev) => ({ ...prev, family_member_id: (e.detail.value as string) ?? '' }))}
                >
                  <IonSelectOption value="">Moi (patient)</IonSelectOption>
                  {familyMembers.map((member) => (
                    <IonSelectOption key={member.id} value={String(member.id)}>
                      {member.name}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Nom du medicament</IonLabel>
                <IonInput
                  value={createForm.medication_name}
                  onIonInput={(e) => setCreateForm((prev) => ({ ...prev, medication_name: e.detail.value ?? '' }))}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Forme</IonLabel>
                <IonSelect
                  value={createForm.form}
                  placeholder="Selectionner une forme"
                  onIonChange={(e) => setCreateForm((prev) => ({ ...prev, form: (e.detail.value as string) ?? '' }))}
                >
                  <IonSelectOption value="Comprime">Comprime</IonSelectOption>
                  <IonSelectOption value="Capsule">Capsule</IonSelectOption>
                  <IonSelectOption value="Sirop">Sirop</IonSelectOption>
                  <IonSelectOption value="Solution">Solution</IonSelectOption>
                  <IonSelectOption value="Suspension">Suspension</IonSelectOption>
                  <IonSelectOption value="Injection">Injection</IonSelectOption>
                  <IonSelectOption value="Creme">Creme</IonSelectOption>
                  <IonSelectOption value="Gel">Gel</IonSelectOption>
                  <IonSelectOption value="Pommade">Pommade</IonSelectOption>
                  <IonSelectOption value="Gouttes">Gouttes</IonSelectOption>
                  <IonSelectOption value="Spray">Spray</IonSelectOption>
                  <IonSelectOption value="Sachet">Sachet</IonSelectOption>
                  <IonSelectOption value="Suppositoire">Suppositoire</IonSelectOption>
                  <IonSelectOption value="Inhalateur">Inhalateur</IonSelectOption>
                  <IonSelectOption value="Patch">Patch</IonSelectOption>
                  <IonSelectOption value="Autre">Autre</IonSelectOption>
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Dosage / force</IonLabel>
                <IonInput
                  value={createForm.dosage_strength}
                  onIonInput={(e) => setCreateForm((prev) => ({ ...prev, dosage_strength: e.detail.value ?? '' }))}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Dose journaliere</IonLabel>
                <IonInput
                  type="number"
                  min={1}
                  max={24}
                  value={createForm.daily_dosage}
                  onIonInput={(e) => {
                    const nextValue = e.detail.value ?? '';
                    const nextDosage = parseDailyDosage(nextValue);
                    setCreateForm((prev) => ({
                      ...prev,
                      daily_dosage: nextValue,
                      reminder_times: nextDosage ? normalizeReminderTimes(prev.reminder_times, nextDosage) : [],
                    }));
                  }}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Quantite</IonLabel>
                <IonInput
                  type="number"
                  min={1}
                  max={100000}
                  value={createForm.quantity}
                  onIonInput={(e) => setCreateForm((prev) => ({ ...prev, quantity: e.detail.value ?? '1' }))}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Rappel avant renouvellement (jours)</IonLabel>
                <IonInput
                  type="number"
                  min={1}
                  max={365}
                  value={createForm.refill_reminder_days}
                  onIonInput={(e) => setCreateForm((prev) => ({ ...prev, refill_reminder_days: e.detail.value ?? '7' }))}
                />
              </IonItem>
              {createDailyDoseCount > 0 ? (
                <>
                  <IonItem lines="none">
                    <IonLabel>Heures de prise ({createDailyDoseCount} fois/jour)</IonLabel>
                  </IonItem>
                  {normalizeReminderTimes(createForm.reminder_times, createDailyDoseCount).map((time, index) => (
                    <IonItem key={`create-reminder-${index}`}>
                      <IonLabel position="stacked">Prise {index + 1}</IonLabel>
                      <IonInput
                        type="time"
                        value={time}
                        onIonInput={(e) => {
                          const nextValue = (e.detail.value ?? '').slice(0, 5);
                          setCreateForm((prev) => {
                            const next = normalizeReminderTimes(prev.reminder_times, createDailyDoseCount);
                            next[index] = nextValue;
                            return { ...prev, reminder_times: next };
                          });
                        }}
                      />
                    </IonItem>
                  ))}
                </>
              ) : null}
              <IonItem>
                <IonLabel position="stacked">Date expiration</IonLabel>
                <IonInput
                  type="date"
                  value={createForm.expiration_date}
                  onIonInput={(e) => setCreateForm((prev) => ({ ...prev, expiration_date: e.detail.value ?? '' }))}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Fabricant</IonLabel>
                <IonInput
                  value={createForm.manufacturer}
                  onIonInput={(e) => setCreateForm((prev) => ({ ...prev, manufacturer: e.detail.value ?? '' }))}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Refrigeration</IonLabel>
                <IonButton
                  slot="end"
                  size="small"
                  fill={createForm.requires_refrigeration ? 'solid' : 'outline'}
                  onClick={() => setCreateForm((prev) => ({ ...prev, requires_refrigeration: !prev.requires_refrigeration }))}
                >
                  {createForm.requires_refrigeration ? 'Oui' : 'Non'}
                </IonButton>
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Note</IonLabel>
                <IonTextarea
                  autoGrow
                  value={createForm.note}
                  onIonInput={(e) => setCreateForm((prev) => ({ ...prev, note: e.detail.value ?? '' }))}
                />
              </IonItem>
              <IonButton
                expand="block"
                disabled={creating}
                onClick={() => {
                  void createItem();
                }}
              >
                {creating ? 'Ajout...' : 'Ajouter au cabinet'}
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => setIsCreateModalOpen(true)}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default PatientMedicationsPage;

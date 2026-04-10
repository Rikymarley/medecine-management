import {
  IonAlert,
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCheckbox,
  IonChip,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonLabel,
  IonItem,
  IonList,
  IonModal,
  IonPage,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import {
  addCircleOutline,
  addOutline,
  businessOutline,
  callOutline,
  createOutline,
  flaskOutline,
  homeOutline,
  medkitOutline,
  personOutline,
  star,
  starOutline,
  timeOutline,
  trashOutline
} from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiEmergencyContact } from '../services/api';
import {
  enqueueEmergencyContactMutation,
  flushEmergencyContactMutationsOutbox,
  getPendingEmergencyContactMutationCount
} from '../services/offlineQueue';
import { useAuth } from '../state/AuthState';
import { maskHaitiPhone } from '../utils/phoneMask';

const categoryLabel: Record<ApiEmergencyContact['category'], string> = {
  hospital: 'Hopital',
  clinic: 'Clinique',
  laboratory: 'Laboratoire',
  pharmacy: 'Pharmacie',
  doctor: 'Medecin',
  ambulance: 'Ambulance'
};

const categoryIcon: Record<ApiEmergencyContact['category'], string> = {
  hospital: businessOutline,
  clinic: homeOutline,
  laboratory: flaskOutline,
  pharmacy: medkitOutline,
  doctor: personOutline,
  ambulance: addCircleOutline
};

const PatientEmergencyContactsPage: React.FC = () => {
  const { token, user } = useAuth();
  const [contacts, setContacts] = useState<ApiEmergencyContact[]>([]);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | ApiEmergencyContact['category']>('all');
  const [only24h, setOnly24h] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [pendingOutboxCount, setPendingOutboxCount] = useState<number>(getPendingEmergencyContactMutationCount());
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [form, setForm] = useState({
    name: '',
    phone: '',
    category: 'clinic' as ApiEmergencyContact['category'],
    city: '',
    department: '',
    address: '',
    available_hours: '',
    priority: '',
    is_24_7: false,
    is_favorite: false
  });

  const cacheKey = user ? `patient-emergency-contacts-${user.id}` : null;
  const cssVars = (vars: Record<string, string>): CSSProperties => vars as CSSProperties;

  const toMutationPayload = (value: typeof form) => ({
    name: value.name.trim(),
    phone: maskHaitiPhone(value.phone.trim()),
    category: value.category,
    city: value.city.trim() || null,
    department: value.department.trim() || null,
    address: value.address.trim() || null,
    available_hours: value.available_hours.trim() || null,
    priority: value.priority.trim() ? Number(value.priority) : null,
    is_24_7: value.is_24_7,
    is_favorite: value.is_favorite
  });

  const toUpdatePayloadFromContact = (contact: ApiEmergencyContact) => ({
    name: contact.name,
    phone: maskHaitiPhone(contact.phone),
    category: contact.category,
    city: contact.city,
    department: contact.department,
    address: contact.address,
    available_hours: contact.available_hours,
    priority: contact.priority,
    is_24_7: contact.is_24_7,
    is_favorite: contact.is_favorite,
    notes: contact.notes
  });

  const loadContacts = useCallback(async () => {
    if (cacheKey) {
      const cachedRaw = localStorage.getItem(cacheKey);
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw) as ApiEmergencyContact[];
          if (Array.isArray(cached)) {
            setContacts(cached);
          }
        } catch {
          localStorage.removeItem(cacheKey);
        }
      }
    }
    if (!token) {
      return;
    }
    const data = await api.getPatientEmergencyContacts(token);
    setContacts(data);
    if (cacheKey) {
      localStorage.setItem(cacheKey, JSON.stringify(data));
    }
  }, [cacheKey, token]);

  useEffect(() => {
    loadContacts().catch(() => undefined);
  }, [loadContacts]);

  useEffect(() => {
    if (!cacheKey) {
      return;
    }
    localStorage.setItem(cacheKey, JSON.stringify(contacts));
  }, [cacheKey, contacts]);

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
    if (!token || !isOnline) {
      setPendingOutboxCount(getPendingEmergencyContactMutationCount());
      return;
    }
    flushEmergencyContactMutationsOutbox(token)
      .then(async (remaining) => {
        setPendingOutboxCount(remaining);
        setSyncMessage(remaining === 0 ? 'Synchronisation terminee.' : `${remaining} action(s) en attente.`);
        await loadContacts();
      })
      .catch(() => {
        setPendingOutboxCount(getPendingEmergencyContactMutationCount());
      });
  }, [isOnline, loadContacts, token]);

  const filtered = useMemo(() => {
    return contacts.filter((contact) => {
      const text = `${contact.name} ${contact.city ?? ''} ${contact.department ?? ''}`.toLowerCase();
      const matchesQuery = query.trim() === '' || text.includes(query.trim().toLowerCase());
      const matchesCategory = selectedCategory === 'all' || contact.category === selectedCategory;
      const matches24h = !only24h || contact.is_24_7;
      const matchesFav = !onlyFavorites || contact.is_favorite;
      return matchesQuery && matchesCategory && matches24h && matchesFav;
    });
  }, [contacts, only24h, onlyFavorites, query, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedContacts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [query, selectedCategory, only24h, onlyFavorites]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const saveContact = async () => {
    if (!token || !form.name.trim() || !form.phone.trim()) {
      return;
    }
    setSaving(true);
    try {
      const payload = toMutationPayload(form);
      if (editingId === null) {
        if (!isOnline) {
          const tempId = -Date.now();
          const optimistic: ApiEmergencyContact = {
            id: tempId,
            patient_user_id: user?.id ?? 0,
            name: payload.name,
            phone: payload.phone,
            category: payload.category,
            city: payload.city ?? null,
            department: payload.department ?? null,
            address: payload.address ?? null,
            available_hours: payload.available_hours ?? null,
            is_24_7: !!payload.is_24_7,
            is_favorite: !!payload.is_favorite,
            priority: payload.priority ?? null,
            notes: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          setContacts((prev) => [optimistic, ...prev]);
          const count = enqueueEmergencyContactMutation({ op: 'create', local_id: tempId, data: payload });
          setPendingOutboxCount(count);
          setSyncMessage('Hors ligne: contact en attente de synchronisation.');
        } else {
          await api.createPatientEmergencyContact(token, payload);
        }
      } else {
        setContacts((prev) =>
          prev.map((item) =>
            item.id === editingId
              ? {
                  ...item,
                  ...payload,
                  city: payload.city ?? null,
                  department: payload.department ?? null,
                  address: payload.address ?? null,
                  available_hours: payload.available_hours ?? null,
                  priority: payload.priority ?? null,
                  updated_at: new Date().toISOString()
                }
              : item
          )
        );
        if (!isOnline) {
          const count = enqueueEmergencyContactMutation({ op: 'update', local_id: editingId, data: payload });
          setPendingOutboxCount(count);
          setSyncMessage('Hors ligne: modification en attente.');
        } else {
          await api.updatePatientEmergencyContact(token, editingId, payload);
        }
      }
      setShowAdd(false);
      setEditingId(null);
      setForm({
        name: '',
        phone: '',
        category: 'clinic',
        city: '',
        department: '',
        address: '',
        available_hours: '',
        priority: '',
        is_24_7: false,
        is_favorite: false
      });
      if (isOnline) {
        await loadContacts();
      }
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (contact: ApiEmergencyContact) => {
    setEditingId(contact.id);
    setForm({
      name: contact.name,
      phone: maskHaitiPhone(contact.phone),
      category: contact.category,
      city: contact.city ?? '',
      department: contact.department ?? '',
      address: contact.address ?? '',
      available_hours: contact.available_hours ?? '',
      priority: contact.priority ? String(contact.priority) : '',
      is_24_7: contact.is_24_7,
      is_favorite: contact.is_favorite
    });
    setShowAdd(true);
  };

  const toggleFavorite = async (contact: ApiEmergencyContact) => {
    if (!token) {
      return;
    }
    const next = { ...contact, is_favorite: !contact.is_favorite, updated_at: new Date().toISOString() };
    setContacts((prev) => prev.map((item) => (item.id === contact.id ? next : item)));
    if (!isOnline) {
      const count = enqueueEmergencyContactMutation({
        op: 'update',
        local_id: contact.id,
        data: toUpdatePayloadFromContact(next)
      });
      setPendingOutboxCount(count);
      setSyncMessage('Hors ligne: favori en attente.');
      return;
    }
    const updated = await api.updatePatientEmergencyContact(token, contact.id, {
      is_favorite: !contact.is_favorite
    });
    setContacts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  const removeContact = async (contactId: number) => {
    if (!token) {
      return;
    }
    setContacts((prev) => prev.filter((item) => item.id !== contactId));
    if (!isOnline) {
      const count = enqueueEmergencyContactMutation({ op: 'delete', local_id: contactId });
      setPendingOutboxCount(count);
      setSyncMessage('Hors ligne: suppression en attente.');
      return;
    }
    await api.deletePatientEmergencyContact(token, contactId);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient" />
          </IonButtons>
          <IonTitle>Contacts d'urgence</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardContent>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <IonBadge color={isOnline ? 'success' : 'warning'}>{isOnline ? 'En ligne' : 'Hors ligne'}</IonBadge>
              {pendingOutboxCount > 0 ? <IonBadge color="warning">Actions en attente: {pendingOutboxCount}</IonBadge> : null}
            </div>
            {syncMessage ? (
              <IonText color="medium">
                <p style={{ marginBottom: 0 }}>{syncMessage}</p>
              </IonText>
            ) : null}
          </IonCardContent>
        </IonCard>

        <IonCard className="surface-card" style={{ borderRadius: '20px' }}>
          <IonCardHeader>
            <IonCardTitle>Contacts d'urgence</IonCardTitle>
            <IonText color="medium">{filtered.length} contact(s)</IonText>
          </IonCardHeader>
          <IonCardContent>
            <IonSearchbar
              placeholder="Rechercher par nom, ville ou departement..."
              value={query}
              onIonInput={(e) => setQuery(e.detail.value ?? '')}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
              <IonChip color={selectedCategory === 'all' ? 'primary' : 'medium'} onClick={() => setSelectedCategory('all')}>
                Tout
              </IonChip>
              {(['hospital', 'clinic', 'laboratory', 'pharmacy', 'doctor', 'ambulance'] as const).map((category) => (
                <IonChip
                  key={category}
                  color={selectedCategory === category ? 'primary' : 'medium'}
                  onClick={() => setSelectedCategory(category)}
                >
                  <IonIcon icon={categoryIcon[category]} />
                  <IonLabel>{categoryLabel[category]}</IonLabel>
                </IonChip>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
              <IonChip color={only24h ? 'primary' : 'medium'} onClick={() => setOnly24h((prev) => !prev)}>
                <IonIcon icon={timeOutline} />
                <IonLabel>24/7 Seulement</IonLabel>
              </IonChip>
              <IonChip color={onlyFavorites ? 'primary' : 'medium'} onClick={() => setOnlyFavorites((prev) => !prev)}>
                <IonIcon icon={starOutline} />
                <IonLabel>Favoris</IonLabel>
              </IonChip>
            </div>
          </IonCardContent>
        </IonCard>

        <IonCard className="surface-card" style={{ borderRadius: '20px' }}>
          <IonCardContent>
            {filtered.length === 0 ? (
              <div style={{ minHeight: '250px', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                <div>
                  <IonIcon icon={businessOutline} style={{ fontSize: '64px', color: '#64748b' }} />
                  <h2 style={{ marginTop: '10px', marginBottom: '4px' }}>Aucun contact</h2>
                  <IonText color="medium">Essayez de modifier les filtres.</IonText>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {pagedContacts.map((contact) => (
                  <IonCard
                    key={contact.id}
                    className="surface-card"
                    style={{ margin: 0, borderRadius: '18px', border: '1px solid #c7d6e2' }}
                  >
                    <IonCardContent>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '999px',
                            display: 'grid',
                            placeItems: 'center',
                            background: '#d9e7fb',
                            color: '#3b5bcc'
                          }}
                        >
                          <IonIcon icon={categoryIcon[contact.category]} style={{ fontSize: '36px' }} />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 500, color: '#737373' }}>{contact.name}</h3>
                          <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: 500, color: '#293241' }}>
                            {categoryLabel[contact.category]}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginTop: '18px' }}>
                        <IonButton
                          fill="clear"
                          style={cssVars({ '--color': contact.is_favorite ? '#d97706' : '#a1a1aa' })}
                          onClick={() => toggleFavorite(contact).catch(() => undefined)}
                        >
                          <IonIcon icon={contact.is_favorite ? star : starOutline} style={{ fontSize: '20px' }} />
                        </IonButton>
                        <IonButton fill="clear" style={cssVars({ '--color': '#0f766e' })} href={`tel:${contact.phone}`}>
                          <IonIcon icon={callOutline} style={{ fontSize: '20px' }} />
                        </IonButton>
                        <IonButton fill="clear" style={cssVars({ '--color': '#0f766e' })} onClick={() => startEdit(contact)}>
                          <IonIcon icon={createOutline} style={{ fontSize: '20px' }} />
                        </IonButton>
                        <IonButton
                          fill="clear"
                          style={cssVars({ '--color': '#dc2626' })}
                          onClick={() => setDeleteTargetId(contact.id)}
                        >
                          <IonIcon icon={trashOutline} style={{ fontSize: '20px' }} />
                        </IonButton>
                      </div>

                      <p style={{ marginTop: '14px', marginBottom: '6px', fontSize: '1rem', color: '#475569' }}>
                        {contact.phone}
                        {contact.city ? ` · ${contact.city}` : ''}
                        {contact.department ? ` (${contact.department})` : ''}
                      </p>
                      {contact.address ? (
                        <p style={{ marginTop: '2px', fontSize: '1rem', color: '#475569' }}>{contact.address}</p>
                      ) : null}
                      {contact.available_hours ? (
                        <p style={{ marginTop: '2px', fontSize: '0.95rem', color: '#64748b' }}>
                          Heures: {contact.available_hours}
                        </p>
                      ) : null}
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        {contact.priority ? (
                          <IonBadge style={{ ...cssVars({ '--background': '#334155', '--color': '#fff' }), fontSize: '0.9rem', padding: '9px 18px' }}>
                            Priorite {contact.priority}
                          </IonBadge>
                        ) : null}
                        {contact.is_24_7 ? (
                          <IonBadge style={{ ...cssVars({ '--background': '#0f766e', '--color': '#fff' }), fontSize: '0.9rem', padding: '9px 18px' }}>
                            24/7
                          </IonBadge>
                        ) : null}
                        {contact.is_favorite ? (
                          <IonBadge style={{ ...cssVars({ '--background': '#d97706', '--color': '#111827' }), fontSize: '0.9rem', padding: '9px 18px' }}>
                            Favori
                          </IonBadge>
                        ) : null}
                      </div>
                    </IonCardContent>
                  </IonCard>
                ))}
              </div>
            )}
            {filtered.length > pageSize ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px' }}>
                <IonButton fill="outline" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                  Precedent
                </IonButton>
                <IonText color="medium">
                  Page {page} / {totalPages}
                </IonText>
                <IonButton fill="outline" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
                  Suivant
                </IonButton>
              </div>
            ) : null}
          </IonCardContent>
        </IonCard>

        <IonModal isOpen={showAdd} onDidDismiss={() => setShowAdd(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{editingId === null ? "Nouveau contact d'urgence" : "Modifier le contact"}</IonTitle>
              <IonButtons slot="end">
                <IonButton
                  onClick={() => {
                    setShowAdd(false);
                    setEditingId(null);
                  }}
                >
                  Fermer
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding app-content">
            <IonList>
              <IonItem>
                <IonLabel position="stacked">Nom</IonLabel>
                <IonInput value={form.name} onIonInput={(e) => setForm((prev) => ({ ...prev, name: e.detail.value ?? '' }))} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Telephone</IonLabel>
                <IonInput
                  value={form.phone}
                  placeholder="+509-xxxx-xxxx"
                  maxlength={14}
                  inputmode="tel"
                  onIonInput={(e) => setForm((prev) => ({ ...prev, phone: maskHaitiPhone(e.detail.value ?? '') }))}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Categorie</IonLabel>
                <IonSelect
                  value={form.category}
                  onIonChange={(e) =>
                    setForm((prev) => ({ ...prev, category: e.detail.value as ApiEmergencyContact['category'] }))
                  }
                >
                  <IonSelectOption value="hospital">Hopital</IonSelectOption>
                  <IonSelectOption value="clinic">Clinique</IonSelectOption>
                  <IonSelectOption value="laboratory">Laboratoire</IonSelectOption>
                  <IonSelectOption value="pharmacy">Pharmacie</IonSelectOption>
                  <IonSelectOption value="doctor">Medecin</IonSelectOption>
                  <IonSelectOption value="ambulance">Ambulance</IonSelectOption>
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Ville</IonLabel>
                <IonInput value={form.city} onIonInput={(e) => setForm((prev) => ({ ...prev, city: e.detail.value ?? '' }))} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Departement</IonLabel>
                <IonInput
                  value={form.department}
                  onIonInput={(e) => setForm((prev) => ({ ...prev, department: e.detail.value ?? '' }))}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Adresse</IonLabel>
                <IonInput
                  value={form.address}
                  onIonInput={(e) => setForm((prev) => ({ ...prev, address: e.detail.value ?? '' }))}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Heures disponibles</IonLabel>
                <IonInput
                  value={form.available_hours}
                  placeholder="ex: 08:00 - 18:00"
                  onIonInput={(e) => setForm((prev) => ({ ...prev, available_hours: e.detail.value ?? '' }))}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Priorite (1-3)</IonLabel>
                <IonInput
                  type="number"
                  min="1"
                  max="3"
                  value={form.priority}
                  onIonInput={(e) => setForm((prev) => ({ ...prev, priority: e.detail.value ?? '' }))}
                />
              </IonItem>
              <IonItem>
                <IonCheckbox
                  checked={form.is_24_7}
                  onIonChange={(e) => setForm((prev) => ({ ...prev, is_24_7: e.detail.checked }))}
                />
                <IonLabel style={{ marginLeft: 10 }}>Disponible 24/7</IonLabel>
              </IonItem>
              <IonItem>
                <IonCheckbox
                  checked={form.is_favorite}
                  onIonChange={(e) => setForm((prev) => ({ ...prev, is_favorite: e.detail.checked }))}
                />
                <IonLabel style={{ marginLeft: 10 }}>Favori</IonLabel>
              </IonItem>
            </IonList>
            <IonButton expand="block" onClick={() => saveContact().catch(() => undefined)} disabled={saving}>
              {editingId === null ? 'Enregistrer' : 'Mettre a jour'}
            </IonButton>
          </IonContent>
        </IonModal>
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton
            color="primary"
            onClick={() => {
              setEditingId(null);
              setShowAdd(true);
            }}
          >
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>
        <IonAlert
          isOpen={deleteTargetId !== null}
          header="Supprimer ce contact ?"
          message="Cette action est definitive."
          buttons={[
            {
              text: 'Annuler',
              role: 'cancel',
              handler: () => setDeleteTargetId(null)
            },
            {
              text: 'Supprimer',
              role: 'destructive',
              handler: () => {
                const id = deleteTargetId;
                setDeleteTargetId(null);
                if (id !== null) {
                  removeContact(id).catch(() => undefined);
                }
              }
            }
          ]}
          onDidDismiss={() => setDeleteTargetId(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default PatientEmergencyContactsPage;

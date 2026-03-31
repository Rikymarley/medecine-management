import {
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
  addOutline,
  businessOutline,
  callOutline,
  closeOutline,
  flaskOutline,
  medkitOutline,
  star,
  starOutline,
  timeOutline
} from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiEmergencyContact } from '../services/api';
import { useAuth } from '../state/AuthState';

const categoryLabel: Record<ApiEmergencyContact['category'], string> = {
  hospital: 'Hopital',
  clinic: 'Clinique',
  laboratory: 'Laboratoire',
  pharmacy: 'Pharmacie'
};

const categoryIcon: Record<ApiEmergencyContact['category'], string> = {
  hospital: businessOutline,
  clinic: medkitOutline,
  laboratory: flaskOutline,
  pharmacy: medkitOutline
};

const PatientEmergencyContactsPage: React.FC = () => {
  const { token } = useAuth();
  const [contacts, setContacts] = useState<ApiEmergencyContact[]>([]);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | ApiEmergencyContact['category']>('all');
  const [only24h, setOnly24h] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    category: 'clinic' as ApiEmergencyContact['category'],
    city: '',
    department: '',
    address: '',
    is_24_7: false,
    is_favorite: false
  });

  const loadContacts = async () => {
    if (!token) {
      return;
    }
    const data = await api.getPatientEmergencyContacts(token);
    setContacts(data);
  };

  useEffect(() => {
    loadContacts().catch(() => undefined);
  }, [token]);

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

  const createContact = async () => {
    if (!token || !form.name.trim() || !form.phone.trim()) {
      return;
    }
    setSaving(true);
    try {
      await api.createPatientEmergencyContact(token, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        category: form.category,
        city: form.city.trim() || null,
        department: form.department.trim() || null,
        address: form.address.trim() || null,
        is_24_7: form.is_24_7,
        is_favorite: form.is_favorite
      });
      setShowAdd(false);
      setForm({
        name: '',
        phone: '',
        category: 'clinic',
        city: '',
        department: '',
        address: '',
        is_24_7: false,
        is_favorite: false
      });
      await loadContacts();
    } finally {
      setSaving(false);
    }
  };

  const toggleFavorite = async (contact: ApiEmergencyContact) => {
    if (!token) {
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
    await api.deletePatientEmergencyContact(token, contactId);
    setContacts((prev) => prev.filter((item) => item.id !== contactId));
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
              {(['hospital', 'clinic', 'laboratory', 'pharmacy'] as const).map((category) => (
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
                {filtered.map((contact) => (
                  <IonCard key={contact.id} className="surface-card" style={{ margin: 0, borderRadius: '16px' }}>
                    <IonCardContent>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '999px',
                              display: 'grid',
                              placeItems: 'center',
                              background: '#dbeafe',
                              color: '#1e40af'
                            }}
                          >
                            <IonIcon icon={categoryIcon[contact.category]} />
                          </div>
                          <div>
                            <h3 style={{ margin: 0 }}>{contact.name}</h3>
                            <IonText color="medium">{categoryLabel[contact.category]}</IonText>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <IonButton
                            fill="clear"
                            color={contact.is_favorite ? 'warning' : 'medium'}
                            onClick={() => toggleFavorite(contact).catch(() => undefined)}
                          >
                            <IonIcon icon={contact.is_favorite ? star : starOutline} />
                          </IonButton>
                          <IonButton fill="clear" href={`tel:${contact.phone}`}>
                            <IonIcon icon={callOutline} />
                          </IonButton>
                          <IonButton
                            fill="clear"
                            color="danger"
                            onClick={() => removeContact(contact.id).catch(() => undefined)}
                          >
                            <IonIcon icon={closeOutline} />
                          </IonButton>
                        </div>
                      </div>
                      <p style={{ marginTop: '10px', marginBottom: '4px' }}>
                        {contact.phone}
                        {contact.city ? ` · ${contact.city}` : ''}
                        {contact.department ? ` (${contact.department})` : ''}
                      </p>
                      {contact.address ? <p style={{ marginTop: '2px' }}>{contact.address}</p> : null}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        {contact.is_24_7 ? <IonBadge color="primary">24/7</IonBadge> : null}
                        {contact.is_favorite ? <IonBadge color="warning">Favori</IonBadge> : null}
                      </div>
                    </IonCardContent>
                  </IonCard>
                ))}
              </div>
            )}
          </IonCardContent>
        </IonCard>

        <IonModal isOpen={showAdd} onDidDismiss={() => setShowAdd(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Nouveau contact d'urgence</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowAdd(false)}>Fermer</IonButton>
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
                <IonInput value={form.phone} onIonInput={(e) => setForm((prev) => ({ ...prev, phone: e.detail.value ?? '' }))} />
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
            <IonButton expand="block" onClick={() => createContact().catch(() => undefined)} disabled={saving}>
              Enregistrer
            </IonButton>
          </IonContent>
        </IonModal>
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton color="primary" onClick={() => setShowAdd(true)}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default PatientEmergencyContactsPage;

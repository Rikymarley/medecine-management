import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonFab,
  IonFabButton,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
  useIonToast,
} from '@ionic/react';
import { add, personCircleOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../state/AuthState';
import { maskHaitiPhone } from '../utils/phoneMask';

type SecretaryItem = {
  id: number;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  notes: string;
  created_at: string;
};

const DoctorSecretariesPage: React.FC = () => {
  const { user } = useAuth();
  const [presentToast] = useIonToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<SecretaryItem[]>([]);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    email: '',
    notes: '',
  });

  const storageKey = useMemo(
    () => `doctor-secretaries-${user?.id ?? 'anonymous'}`,
    [user?.id]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setItems([]);
        return;
      }
      const parsed = JSON.parse(raw) as SecretaryItem[];
      setItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      setItems([]);
    }
  }, [storageKey]);

  const resetForm = () => {
    setForm({
      name: '',
      phone: '',
      whatsapp: '',
      email: '',
      notes: '',
    });
  };

  const saveSecretary = async () => {
    if (!form.name.trim()) {
      presentToast({ message: 'Nom requis.', duration: 1800, color: 'warning' });
      return;
    }
    setSaving(true);
    const next: SecretaryItem = {
      id: Date.now(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      whatsapp: form.whatsapp.trim(),
      email: form.email.trim(),
      notes: form.notes.trim(),
      created_at: new Date().toISOString(),
    };
    const updated = [next, ...items];
    setItems(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setSaving(false);
    setIsModalOpen(false);
    resetForm();
    presentToast({ message: 'Secretaire ajoutee.', duration: 1800, color: 'success' });
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/doctor" />
          </IonButtons>
          <IonTitle>Secretaires</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Secretaires</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonCard className="surface-card">
          <IonCardHeader>
            <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IonIcon icon={personCircleOutline} />
              Cabinet
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p style={{ margin: 0 }}>
              {items.length} secretaire{items.length > 1 ? 's' : ''} enregistree{items.length > 1 ? 's' : ''}.
            </p>
          </IonCardContent>
        </IonCard>

        <IonCard className="surface-card">
          <IonCardHeader>
            <IonCardTitle>Liste</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {items.length === 0 ? (
              <IonText color="medium">
                <p>Aucune secretaire pour le moment.</p>
              </IonText>
            ) : (
              <IonList>
                {items.map((secretary) => (
                  <IonItem key={secretary.id} lines="full">
                    <IonLabel>
                      <h3 style={{ marginBottom: '4px' }}>{secretary.name}</h3>
                      <p>{secretary.phone || 'Telephone: N/D'}</p>
                      {secretary.whatsapp ? <p>WhatsApp: {secretary.whatsapp}</p> : null}
                      {secretary.email ? <p>Email: {secretary.email}</p> : null}
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            )}
          </IonCardContent>
        </IonCard>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton color="primary" onClick={() => setIsModalOpen(true)}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={isModalOpen} onDidDismiss={() => setIsModalOpen(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Ajouter une secretaire</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setIsModalOpen(false)}>Fermer</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonList>
              <IonItem>
                <IonLabel position="stacked">Nom</IonLabel>
                <IonInput
                  value={form.name}
                  placeholder="Ex: Marie Pierre"
                  onIonInput={(e) => setForm((prev) => ({ ...prev, name: e.detail.value ?? '' }))}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Telephone</IonLabel>
                <IonInput
                  value={form.phone}
                  placeholder="+509-xxxx-xxxx"
                  inputMode="tel"
                  onIonInput={(e) =>
                    setForm((prev) => ({ ...prev, phone: maskHaitiPhone(e.detail.value ?? '') }))
                  }
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">WhatsApp</IonLabel>
                <IonInput
                  value={form.whatsapp}
                  placeholder="+509-xxxx-xxxx"
                  inputMode="tel"
                  onIonInput={(e) =>
                    setForm((prev) => ({ ...prev, whatsapp: maskHaitiPhone(e.detail.value ?? '') }))
                  }
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Email</IonLabel>
                <IonInput
                  type="email"
                  value={form.email}
                  placeholder="email@cabinet.ht"
                  onIonInput={(e) => setForm((prev) => ({ ...prev, email: e.detail.value ?? '' }))}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Notes</IonLabel>
                <IonTextarea
                  autoGrow
                  value={form.notes}
                  placeholder="Informations supplementaires"
                  onIonInput={(e) => setForm((prev) => ({ ...prev, notes: e.detail.value ?? '' }))}
                />
              </IonItem>
            </IonList>
          </IonContent>
          <IonFooter>
            <IonToolbar>
              <IonButton
                expand="block"
                style={{ margin: '8px 12px' }}
                disabled={saving}
                onClick={() => saveSecretary().catch(() => undefined)}
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </IonButton>
            </IonToolbar>
          </IonFooter>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default DoctorSecretariesPage;

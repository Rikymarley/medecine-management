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
import { add, addCircleOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../state/AuthState';

type PatientMedication = {
  id: number;
  name: string;
  dosage: string;
  form: string;
  frequency: string;
  notes: string;
  created_at: string;
};

const PatientMedicationsPage: React.FC = () => {
  const { user } = useAuth();
  const [presentToast] = useIonToast();
  const [items, setItems] = useState<PatientMedication[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    dosage: '',
    form: '',
    frequency: '',
    notes: '',
  });

  const storageKey = useMemo(() => `patient-medications-${user?.id ?? 'anonymous'}`, [user?.id]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setItems([]);
        return;
      }
      const parsed = JSON.parse(raw) as PatientMedication[];
      setItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      setItems([]);
    }
  }, [storageKey]);

  const resetForm = () => {
    setForm({
      name: '',
      dosage: '',
      form: '',
      frequency: '',
      notes: '',
    });
  };

  const saveMedication = async () => {
    if (!form.name.trim()) {
      presentToast({ message: 'Nom du medicament requis.', duration: 1800, color: 'warning' });
      return;
    }
    setSaving(true);
    const next: PatientMedication = {
      id: Date.now(),
      name: form.name.trim(),
      dosage: form.dosage.trim(),
      form: form.form.trim(),
      frequency: form.frequency.trim(),
      notes: form.notes.trim(),
      created_at: new Date().toISOString(),
    };
    const updated = [next, ...items];
    setItems(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setSaving(false);
    setIsModalOpen(false);
    resetForm();
    presentToast({ message: 'Medicament ajoute.', duration: 1800, color: 'success' });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient" />
          </IonButtons>
          <IonTitle>Mes medicaments</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <IonCard className="surface-card">
          <IonCardHeader>
            <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IonIcon icon={addCircleOutline} />
              Suivi
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {items.length} medicament{items.length > 1 ? 's' : ''} enregistre{items.length > 1 ? 's' : ''}.
          </IonCardContent>
        </IonCard>

        <IonCard className="surface-card">
          <IonCardHeader>
            <IonCardTitle>Liste</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {items.length === 0 ? (
              <IonText color="medium">
                <p>Aucun medicament enregistre.</p>
              </IonText>
            ) : (
              <IonList>
                {items.map((item) => (
                  <IonItem key={item.id} lines="full">
                    <IonLabel>
                      <h3 style={{ marginBottom: '4px' }}>{item.name}</h3>
                      <p>{[item.dosage, item.form].filter(Boolean).join(' · ') || 'Details non renseignes'}</p>
                      {item.frequency ? <p>Frequence: {item.frequency}</p> : null}
                      {item.notes ? <p>Notes: {item.notes}</p> : null}
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
              <IonTitle>Ajouter un medicament</IonTitle>
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
                  placeholder="Ex: Amoxicilline"
                  onIonInput={(e) => setForm((prev) => ({ ...prev, name: e.detail.value ?? '' }))}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Dosage</IonLabel>
                <IonInput
                  value={form.dosage}
                  placeholder="Ex: 500mg"
                  onIonInput={(e) => setForm((prev) => ({ ...prev, dosage: e.detail.value ?? '' }))}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Forme</IonLabel>
                <IonInput
                  value={form.form}
                  placeholder="Ex: Comprime"
                  onIonInput={(e) => setForm((prev) => ({ ...prev, form: e.detail.value ?? '' }))}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Frequence</IonLabel>
                <IonInput
                  value={form.frequency}
                  placeholder="Ex: 2 fois par jour"
                  onIonInput={(e) => setForm((prev) => ({ ...prev, frequency: e.detail.value ?? '' }))}
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Notes</IonLabel>
                <IonTextarea
                  autoGrow
                  value={form.notes}
                  placeholder="Notes supplementaires"
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
                onClick={() => saveMedication().catch(() => undefined)}
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

export default PatientMedicationsPage;

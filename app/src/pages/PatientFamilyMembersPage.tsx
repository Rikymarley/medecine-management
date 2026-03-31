import {
  IonBackButton,
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
  IonList,
  IonModal,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { addOutline, closeOutline, peopleOutline, personOutline, trashOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiFamilyMember } from '../services/api';
import { useAuth } from '../state/AuthState';

const genderLabel: Record<NonNullable<ApiFamilyMember['gender']>, string> = {
  male: 'Homme',
  female: 'Femme',
  other: 'Autre'
};

const relationshipLabel: Record<NonNullable<ApiFamilyMember['relationship']>, string> = {
  parent: 'Parent',
  spouse: 'Conjoint(e)',
  child: 'Enfant',
  sibling: 'Frere/Soeur',
  grandparent: 'Grand-parent',
  other: 'Autre'
};

const PatientFamilyMembersPage: React.FC = () => {
  const { token } = useAuth();
  const [members, setMembers] = useState<ApiFamilyMember[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    age: string;
    gender: ApiFamilyMember['gender'];
    relationship: ApiFamilyMember['relationship'];
  }>({
    name: '',
    age: '',
    gender: null,
    relationship: null
  });

  const load = async () => {
    if (!token) {
      return;
    }
    const data = await api.getPatientFamilyMembers(token);
    setMembers(data);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [token]);

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })),
    [members]
  );

  const createMember = async () => {
    if (!token || !form.name.trim()) {
      return;
    }
    setSaving(true);
    try {
      const created = await api.createPatientFamilyMember(token, {
        name: form.name.trim(),
        age: form.age.trim() ? Number(form.age) : null,
        gender: form.gender,
        relationship: form.relationship
      });
      setMembers((prev) => [...prev, created]);
      setShowAdd(false);
      setForm({ name: '', age: '', gender: null, relationship: null });
    } finally {
      setSaving(false);
    }
  };

  const deleteMember = async (id: number) => {
    if (!token) {
      return;
    }
    await api.deletePatientFamilyMember(token, id);
    setMembers((prev) => prev.filter((member) => member.id !== id));
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient" />
          </IonButtons>
          <IonTitle>Membres de famille</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardContent>
            <h2 style={{ marginTop: 0 }}>Famille</h2>
            <IonText color="medium">{sortedMembers.length} membre(s)</IonText>
            {sortedMembers.length === 0 ? (
              <div style={{ minHeight: '220px', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                <div>
                  <IonIcon icon={peopleOutline} style={{ fontSize: '56px', color: '#64748b' }} />
                  <h3 style={{ marginBottom: 4 }}>Aucun membre ajoute</h3>
                  <IonText color="medium">Utilisez le bouton + pour ajouter un membre.</IonText>
                </div>
              </div>
            ) : (
              <IonList>
                {sortedMembers.map((member) => (
                  <IonItem key={member.id} lines="full">
                    <IonIcon slot="start" icon={personOutline} />
                    <IonLabel>
                      <h3>{member.name}</h3>
                      <p>
                        {member.age !== null ? `${member.age} ans` : 'Age non precise'}
                        {member.gender ? ` · ${genderLabel[member.gender]}` : ''}
                      </p>
                      <p>{member.relationship ? relationshipLabel[member.relationship] : 'Relation non precisee'}</p>
                    </IonLabel>
                    <IonButton slot="end" fill="clear" color="danger" onClick={() => deleteMember(member.id).catch(() => undefined)}>
                      <IonIcon icon={trashOutline} />
                    </IonButton>
                  </IonItem>
                ))}
              </IonList>
            )}
          </IonCardContent>
        </IonCard>

        <IonModal isOpen={showAdd} onDidDismiss={() => setShowAdd(false)}>
          <IonContent className="ion-padding app-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <IonIcon icon={personOutline} style={{ fontSize: '30px', color: '#e2e8f0' }} />
                <div>
                  <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>Ajouter un membre</h1>
                  <IonText color="medium">Renseignez les informations du membre.</IonText>
                </div>
              </div>
              <IonButton fill="clear" color="medium" onClick={() => setShowAdd(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </div>

            <div style={{ height: '1px', background: '#cbd5e1', margin: '20px 0' }} />

            <IonItem lines="none">
              <IonLabel position="stacked">Nom *</IonLabel>
              <IonInput
                placeholder="Entrer le nom"
                value={form.name}
                onIonInput={(e) => setForm((prev) => ({ ...prev, name: e.detail.value ?? '' }))}
              />
            </IonItem>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
              <IonItem lines="none">
                <IonLabel position="stacked">Age</IonLabel>
                <IonInput
                  type="number"
                  placeholder="Age"
                  value={form.age}
                  onIonInput={(e) => setForm((prev) => ({ ...prev, age: e.detail.value ?? '' }))}
                />
              </IonItem>
              <IonItem lines="none">
                <IonLabel position="stacked">Genre</IonLabel>
                <IonSelect
                  placeholder="Selectionner"
                  value={form.gender}
                  onIonChange={(e) => setForm((prev) => ({ ...prev, gender: e.detail.value ?? null }))}
                >
                  <IonSelectOption value="male">Homme</IonSelectOption>
                  <IonSelectOption value="female">Femme</IonSelectOption>
                  <IonSelectOption value="other">Autre</IonSelectOption>
                </IonSelect>
              </IonItem>
            </div>
            <IonItem lines="none" style={{ marginTop: '10px' }}>
              <IonLabel position="stacked">Relation</IonLabel>
              <IonSelect
                placeholder="Selectionner la relation"
                value={form.relationship}
                onIonChange={(e) => setForm((prev) => ({ ...prev, relationship: e.detail.value ?? null }))}
              >
                <IonSelectOption value="parent">Parent</IonSelectOption>
                <IonSelectOption value="spouse">Conjoint(e)</IonSelectOption>
                <IonSelectOption value="child">Enfant</IonSelectOption>
                <IonSelectOption value="sibling">Frere/Soeur</IonSelectOption>
                <IonSelectOption value="grandparent">Grand-parent</IonSelectOption>
                <IonSelectOption value="other">Autre</IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonButton
              expand="block"
              style={{ marginTop: '20px' }}
              onClick={() => createMember().catch(() => undefined)}
              disabled={saving}
            >
              Ajouter le membre
            </IonButton>
            <IonButton expand="block" fill="outline" color="medium" onClick={() => setShowAdd(false)}>
              Annuler
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

export default PatientFamilyMembersPage;

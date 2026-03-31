import {
  IonAlert,
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
import { addOutline, closeOutline, createOutline, peopleOutline, personOutline, trashOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiFamilyMember } from '../services/api';
import { useAuth } from '../state/AuthState';

const genderLabel: Record<NonNullable<ApiFamilyMember['gender']>, string> = {
  male: 'M',
  female: 'F'
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [form, setForm] = useState<{
    name: string;
    age: string;
    gender: ApiFamilyMember['gender'];
    relationship: ApiFamilyMember['relationship'];
    allergies: string;
    chronic_diseases: string;
    blood_type: ApiFamilyMember['blood_type'];
    emergency_notes: string;
    primary_caregiver: boolean;
  }>({
    name: '',
    age: '',
    gender: null,
    relationship: null,
    allergies: '',
    chronic_diseases: '',
    blood_type: null,
    emergency_notes: '',
    primary_caregiver: false
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
  const totalPages = Math.max(1, Math.ceil(sortedMembers.length / pageSize));
  const pagedMembers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedMembers.slice(start, start + pageSize);
  }, [page, sortedMembers]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const saveMember = async () => {
    if (!token || !form.name.trim()) {
      return;
    }
    setSaving(true);
    try {
      if (editingId === null) {
        const created = await api.createPatientFamilyMember(token, {
          name: form.name.trim(),
          age: form.age.trim() ? Number(form.age) : null,
          gender: form.gender,
          relationship: form.relationship,
          allergies: form.allergies.trim() || null,
          chronic_diseases: form.chronic_diseases.trim() || null,
          blood_type: form.blood_type,
          emergency_notes: form.emergency_notes.trim() || null,
          primary_caregiver: form.primary_caregiver
        });
        setMembers((prev) => [...prev, created]);
      } else {
        const updated = await api.updatePatientFamilyMember(token, editingId, {
          name: form.name.trim(),
          age: form.age.trim() ? Number(form.age) : null,
          gender: form.gender,
          relationship: form.relationship,
          allergies: form.allergies.trim() || null,
          chronic_diseases: form.chronic_diseases.trim() || null,
          blood_type: form.blood_type,
          emergency_notes: form.emergency_notes.trim() || null,
          primary_caregiver: form.primary_caregiver
        });
        setMembers((prev) => prev.map((member) => (member.id === updated.id ? updated : member)));
      }
      setShowAdd(false);
      setEditingId(null);
      setForm({
        name: '',
        age: '',
        gender: null,
        relationship: null,
        allergies: '',
        chronic_diseases: '',
        blood_type: null,
        emergency_notes: '',
        primary_caregiver: false
      });
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

  const startEdit = (member: ApiFamilyMember) => {
    setEditingId(member.id);
    setForm({
      name: member.name,
      age: member.age === null ? '' : String(member.age),
      gender: member.gender,
      relationship: member.relationship,
      allergies: member.allergies ?? '',
      chronic_diseases: member.chronic_diseases ?? '',
      blood_type: member.blood_type,
      emergency_notes: member.emergency_notes ?? '',
      primary_caregiver: member.primary_caregiver
    });
    setShowAdd(true);
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
                {pagedMembers.map((member) => (
                  <IonItem key={member.id} lines="full">
                    <IonIcon slot="start" icon={personOutline} />
                    <IonLabel>
                      <h3>{member.name}</h3>
                      <p>
                        {member.age !== null ? `${member.age} ans` : 'Age non precise'}
                        {member.gender ? ` · ${genderLabel[member.gender]}` : ''}
                      </p>
                      <p>{member.relationship ? relationshipLabel[member.relationship] : 'Relation non precisee'}</p>
                      {member.blood_type ? <p>Groupe sanguin: {member.blood_type}</p> : null}
                      {member.primary_caregiver ? <p>Personne de reference</p> : null}
                    </IonLabel>
                    <IonButton slot="end" fill="clear" color="danger" onClick={() => setDeleteTargetId(member.id)}>
                      <IonIcon icon={trashOutline} />
                    </IonButton>
                    <IonButton slot="end" fill="clear" onClick={() => startEdit(member)}>
                      <IonIcon icon={createOutline} />
                    </IonButton>
                  </IonItem>
                ))}
              </IonList>
            )}
            {sortedMembers.length > pageSize ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
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
          <IonContent className="ion-padding app-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <IonIcon icon={personOutline} style={{ fontSize: '30px', color: '#e2e8f0' }} />
                <div>
                  <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>
                    {editingId === null ? 'Ajouter un membre' : 'Modifier un membre'}
                  </h1>
                  <IonText color="medium">Renseignez les informations du membre.</IonText>
                </div>
              </div>
              <IonButton
                fill="clear"
                color="medium"
                onClick={() => {
                  setShowAdd(false);
                  setEditingId(null);
                }}
              >
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
                  <IonSelectOption value="male">M</IonSelectOption>
                  <IonSelectOption value="female">F</IonSelectOption>
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
            <IonItem lines="none" style={{ marginTop: '10px' }}>
              <IonLabel position="stacked">Allergies</IonLabel>
              <IonInput
                value={form.allergies}
                onIonInput={(e) => setForm((prev) => ({ ...prev, allergies: e.detail.value ?? '' }))}
              />
            </IonItem>
            <IonItem lines="none" style={{ marginTop: '10px' }}>
              <IonLabel position="stacked">Maladies chroniques</IonLabel>
              <IonInput
                value={form.chronic_diseases}
                onIonInput={(e) => setForm((prev) => ({ ...prev, chronic_diseases: e.detail.value ?? '' }))}
              />
            </IonItem>
            <IonItem lines="none" style={{ marginTop: '10px' }}>
              <IonLabel position="stacked">Groupe sanguin</IonLabel>
              <IonSelect
                placeholder="Selectionner"
                value={form.blood_type}
                onIonChange={(e) => setForm((prev) => ({ ...prev, blood_type: e.detail.value ?? null }))}
              >
                <IonSelectOption value="A+">A+</IonSelectOption>
                <IonSelectOption value="A-">A-</IonSelectOption>
                <IonSelectOption value="B+">B+</IonSelectOption>
                <IonSelectOption value="B-">B-</IonSelectOption>
                <IonSelectOption value="AB+">AB+</IonSelectOption>
                <IonSelectOption value="AB-">AB-</IonSelectOption>
                <IonSelectOption value="O+">O+</IonSelectOption>
                <IonSelectOption value="O-">O-</IonSelectOption>
              </IonSelect>
            </IonItem>
            <IonItem lines="none" style={{ marginTop: '10px' }}>
              <IonLabel position="stacked">Notes d'urgence</IonLabel>
              <IonInput
                value={form.emergency_notes}
                onIonInput={(e) => setForm((prev) => ({ ...prev, emergency_notes: e.detail.value ?? '' }))}
              />
            </IonItem>
            <IonItem lines="none" style={{ marginTop: '10px' }}>
              <IonLabel>Personne de reference</IonLabel>
              <IonSelect
                interface="popover"
                value={form.primary_caregiver ? 'yes' : 'no'}
                onIonChange={(e) => setForm((prev) => ({ ...prev, primary_caregiver: e.detail.value === 'yes' }))}
              >
                <IonSelectOption value="no">Non</IonSelectOption>
                <IonSelectOption value="yes">Oui</IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonButton
              expand="block"
              style={{ marginTop: '20px' }}
              onClick={() => saveMember().catch(() => undefined)}
              disabled={saving}
            >
              {editingId === null ? 'Ajouter le membre' : 'Mettre a jour'}
            </IonButton>
            <IonButton
              expand="block"
              fill="outline"
              color="medium"
              onClick={() => {
                setShowAdd(false);
                setEditingId(null);
              }}
            >
              Annuler
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
          header="Supprimer ce membre ?"
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
                  deleteMember(id).catch(() => undefined);
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

export default PatientFamilyMembersPage;

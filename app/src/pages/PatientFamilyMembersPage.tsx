import {
  IonAlert,
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
  IonList,
  IonModal,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonText,
  IonToast,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import {
  addOutline,
  chevronDownOutline,
  chevronUpOutline,
  closeOutline,
  createOutline,
  peopleOutline,
  personOutline,
  trashOutline
} from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiFamilyMember } from '../services/api';
import {
  enqueueFamilyMemberMutation,
  flushFamilyMemberMutationsOutbox,
  getPendingFamilyMemberMutationStateById,
  getPendingFamilyMemberMutationCount
} from '../services/offlineQueue';
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

const getAgeFromDob = (dob: string | null): number | null => {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
};

const PatientFamilyMembersPage: React.FC = () => {
  const { token, user } = useAuth();
  const [members, setMembers] = useState<ApiFamilyMember[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [identityExpanded, setIdentityExpanded] = useState(true);
  const [medicalExpanded, setMedicalExpanded] = useState(true);
  const [emergencyExpanded, setEmergencyExpanded] = useState(true);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [pendingOutboxCount, setPendingOutboxCount] = useState<number>(getPendingFamilyMemberMutationCount());
  const [pendingStateById, setPendingStateById] = useState<Record<number, 'create' | 'update' | 'delete'>>(
    getPendingFamilyMemberMutationStateById()
  );
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [form, setForm] = useState<{
    name: string;
    date_of_birth: string;
    gender: ApiFamilyMember['gender'];
    relationship: ApiFamilyMember['relationship'];
    weight_kg: string;
    height_cm: string;
    surgical_history: string;
    vaccination_up_to_date: boolean | null;
    allergies: string;
    chronic_diseases: string;
    blood_type: ApiFamilyMember['blood_type'];
    emergency_notes: string;
    primary_caregiver: boolean;
  }>({
    name: '',
    date_of_birth: '',
    gender: null,
    relationship: null,
    weight_kg: '',
    height_cm: '',
    surgical_history: '',
    vaccination_up_to_date: null,
    allergies: '',
    chronic_diseases: '',
    blood_type: null,
    emergency_notes: '',
    primary_caregiver: false
  });

  const cacheKey = user ? `patient-family-members-${user.id}` : null;

  const toMutationPayload = (value: typeof form) => {
    const dob = value.date_of_birth.trim();
    return {
      name: value.name.trim(),
      ...(dob ? { date_of_birth: dob, age: getAgeFromDob(dob) } : {}),
      gender: value.gender,
      relationship: value.relationship,
      weight_kg: value.weight_kg.trim() ? Number(value.weight_kg) : null,
      height_cm: value.height_cm.trim() ? Number(value.height_cm) : null,
      surgical_history: value.surgical_history.trim() || null,
      vaccination_up_to_date: value.vaccination_up_to_date,
      allergies: value.allergies.trim() || null,
      chronic_diseases: value.chronic_diseases.trim() || null,
      blood_type: value.blood_type,
      emergency_notes: value.emergency_notes.trim() || null,
      primary_caregiver: value.primary_caregiver
    };
  };

  const load = async () => {
    if (cacheKey) {
      const cachedRaw = localStorage.getItem(cacheKey);
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw) as ApiFamilyMember[];
          if (Array.isArray(cached)) {
            setMembers(cached);
          }
        } catch {
          localStorage.removeItem(cacheKey);
        }
      }
    }

    if (!token) {
      return;
    }
    const data = await api.getPatientFamilyMembers(token);
    setMembers(data);
    if (cacheKey) {
      localStorage.setItem(cacheKey, JSON.stringify(data));
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [token]);

  useEffect(() => {
    if (!cacheKey) {
      return;
    }
    localStorage.setItem(cacheKey, JSON.stringify(members));
  }, [cacheKey, members]);

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
      setPendingOutboxCount(getPendingFamilyMemberMutationCount());
      setPendingStateById(getPendingFamilyMemberMutationStateById());
      return;
    }
    flushFamilyMemberMutationsOutbox(token)
      .then(async (remaining) => {
        setPendingOutboxCount(remaining);
        setPendingStateById(getPendingFamilyMemberMutationStateById());
        setSyncMessage(remaining === 0 ? 'Synchronisation terminee.' : `${remaining} action(s) en attente.`);
        await load();
      })
      .catch(() => {
        setPendingOutboxCount(getPendingFamilyMemberMutationCount());
        setPendingStateById(getPendingFamilyMemberMutationStateById());
      });
  }, [isOnline, token]);

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })),
    [members]
  );
  const computedFormAge = useMemo(() => getAgeFromDob(form.date_of_birth || null), [form.date_of_birth]);
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
      const payload = toMutationPayload(form);
      if (editingId === null) {
        if (!isOnline) {
          const tempId = -Date.now();
          const optimistic: ApiFamilyMember = {
            id: tempId,
            patient_user_id: user?.id ?? 0,
            name: payload.name,
            age: payload.age ?? null,
            date_of_birth: payload.date_of_birth ?? null,
            gender: payload.gender ?? null,
            relationship: payload.relationship ?? null,
            weight_kg: payload.weight_kg ?? null,
            height_cm: payload.height_cm ?? null,
            surgical_history: payload.surgical_history ?? null,
            vaccination_up_to_date: payload.vaccination_up_to_date ?? null,
            allergies: payload.allergies ?? null,
            chronic_diseases: payload.chronic_diseases ?? null,
            blood_type: payload.blood_type ?? null,
            emergency_notes: payload.emergency_notes ?? null,
            primary_caregiver: !!payload.primary_caregiver,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          setMembers((prev) => [...prev, optimistic]);
          const count = enqueueFamilyMemberMutation({ op: 'create', local_id: tempId, data: payload });
          setPendingOutboxCount(count);
          setPendingStateById(getPendingFamilyMemberMutationStateById());
          setSyncMessage('Hors ligne: membre en attente de synchronisation.');
          setToastMessage('Membre ajoute (hors ligne).');
        } else {
          const created = await api.createPatientFamilyMember(token, payload);
          setMembers((prev) => [...prev, created]);
          setToastMessage('Membre ajoute.');
        }
      } else {
        setMembers((prev) =>
          prev.map((member) =>
            member.id === editingId
              ? {
                  ...member,
                  ...payload,
                  age: payload.age ?? null,
                  date_of_birth: payload.date_of_birth ?? null,
                  gender: payload.gender ?? null,
                  relationship: payload.relationship ?? null,
                  weight_kg: payload.weight_kg ?? null,
                  height_cm: payload.height_cm ?? null,
                  surgical_history: payload.surgical_history ?? null,
                  vaccination_up_to_date: payload.vaccination_up_to_date ?? null,
                  allergies: payload.allergies ?? null,
                  chronic_diseases: payload.chronic_diseases ?? null,
                  blood_type: payload.blood_type ?? null,
                  emergency_notes: payload.emergency_notes ?? null,
                  primary_caregiver: !!payload.primary_caregiver,
                  updated_at: new Date().toISOString()
                }
              : member
          )
        );
        if (!isOnline) {
          const count = enqueueFamilyMemberMutation({ op: 'update', local_id: editingId, data: payload });
          setPendingOutboxCount(count);
          setPendingStateById(getPendingFamilyMemberMutationStateById());
          setSyncMessage('Hors ligne: modification en attente.');
          setToastMessage('Membre mis a jour (hors ligne).');
        } else {
          const updated = await api.updatePatientFamilyMember(token, editingId, payload);
          setMembers((prev) => prev.map((member) => (member.id === updated.id ? updated : member)));
          setToastMessage('Membre mis a jour.');
        }
      }
      setShowAdd(false);
      setEditingId(null);
      setForm({
        name: '',
        date_of_birth: '',
        gender: null,
        relationship: null,
        weight_kg: '',
        height_cm: '',
        surgical_history: '',
        vaccination_up_to_date: null,
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
    setMembers((prev) => prev.filter((member) => member.id !== id));
    if (!isOnline) {
      const count = enqueueFamilyMemberMutation({ op: 'delete', local_id: id });
      setPendingOutboxCount(count);
      setPendingStateById(getPendingFamilyMemberMutationStateById());
      setSyncMessage('Hors ligne: suppression en attente.');
      setToastMessage('Membre supprime (hors ligne).');
      return;
    }
    await api.deletePatientFamilyMember(token, id);
    setToastMessage('Membre supprime.');
  };

  const startEdit = (member: ApiFamilyMember) => {
    setEditingId(member.id);
    setForm({
      name: member.name,
      date_of_birth: member.date_of_birth ? member.date_of_birth.slice(0, 10) : '',
      gender: member.gender,
      relationship: member.relationship,
      weight_kg: member.weight_kg === null ? '' : String(member.weight_kg),
      height_cm: member.height_cm === null ? '' : String(member.height_cm),
      surgical_history: member.surgical_history ?? '',
      vaccination_up_to_date: member.vaccination_up_to_date ?? null,
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
        <IonCard className="surface-card">
          <IonCardContent>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
              <h2 style={{ margin: 0 }}>Famille</h2>
              <IonText color="medium">{sortedMembers.length} membre(s)</IonText>
            </div>
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
                      {pendingStateById[member.id] ? (
                        <IonBadge color="warning" style={{ marginBottom: '6px' }}>
                          Non synchronise
                        </IonBadge>
                      ) : null}
                      <p>
                        {member.date_of_birth ? `Ne(e) le ${member.date_of_birth.slice(0, 10)}` : 'Date de naissance N/D'}
                        {getAgeFromDob(member.date_of_birth) !== null ? ` · ${getAgeFromDob(member.date_of_birth)} ans` : ''}
                      </p>
                      <p>
                        {member.relationship ? relationshipLabel[member.relationship] : 'Relation non precisee'}
                        {member.gender ? ` · ${genderLabel[member.gender]}` : ''}
                      </p>
                      {member.blood_type ? <p>Groupe sanguin: {member.blood_type}</p> : null}
                      {(member.weight_kg !== null || member.height_cm !== null) ? (
                        <p>
                          {member.weight_kg !== null ? `Poids: ${member.weight_kg} kg` : 'Poids: N/D'}
                          {' · '}
                          {member.height_cm !== null ? `Taille: ${member.height_cm} cm` : 'Taille: N/D'}
                        </p>
                      ) : null}
                      {member.vaccination_up_to_date !== null ? (
                        <p>Vaccination: {member.vaccination_up_to_date ? 'A jour' : 'Non a jour'}</p>
                      ) : null}
                      {member.surgical_history ? <p>Antecedents chirurgicaux: {member.surgical_history}</p> : null}
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
                  <div style={{ marginTop: '6px' }}>
                    <IonBadge color={editingId === null ? 'primary' : 'tertiary'}>
                      {editingId === null ? 'Nouveau' : 'Edition'}
                    </IonBadge>
                  </div>
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

            <div style={{ border: '1px solid #dbe7ef', borderRadius: '14px', padding: '10px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: '0 0 6px 2px' }}>Identite</h3>
                <IonButton fill="clear" size="small" onClick={() => setIdentityExpanded((prev) => !prev)}>
                  <IonIcon icon={identityExpanded ? chevronUpOutline : chevronDownOutline} />
                </IonButton>
              </div>
              {identityExpanded ? (
                <>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Nom *</IonLabel>
                    <IonInput
                      placeholder="Entrer le nom"
                      value={form.name}
                      onIonInput={(e) => setForm((prev) => ({ ...prev, name: e.detail.value ?? '' }))}
                    />
                  </IonItem>
                  <IonItem lines="none" style={{ marginTop: '6px' }}>
                    <IonLabel position="stacked">Date de naissance</IonLabel>
                    <IonInput
                      type="date"
                      placeholder="YYYY-MM-DD"
                      value={form.date_of_birth}
                      onIonInput={(e) => setForm((prev) => ({ ...prev, date_of_birth: e.detail.value ?? '' }))}
                    />
                  </IonItem>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0 4px 8px' }}>
                    <IonBadge color="medium">Age: {computedFormAge ?? 'N/D'}</IonBadge>
                    <IonText color="medium" style={{ fontSize: '0.85rem' as any }}>Calcule automatiquement</IonText>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                    <IonItem lines="none">
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
                </>
              ) : null}
            </div>

            <div style={{ border: '1px solid #dbe7ef', borderRadius: '14px', padding: '10px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: '0 0 6px 2px' }}>Profil medical</h3>
                <IonButton fill="clear" size="small" onClick={() => setMedicalExpanded((prev) => !prev)}>
                  <IonIcon icon={medicalExpanded ? chevronUpOutline : chevronDownOutline} />
                </IonButton>
              </div>
              {medicalExpanded ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                    <IonItem lines="none">
                      <IonLabel position="stacked">Poids (kg)</IonLabel>
                      <IonInput
                        type="number"
                        inputmode="decimal"
                        min="0"
                        step="0.1"
                        value={form.weight_kg}
                        onIonInput={(e) => setForm((prev) => ({ ...prev, weight_kg: e.detail.value ?? '' }))}
                      />
                    </IonItem>
                    <IonItem lines="none">
                      <IonLabel position="stacked">Taille (cm)</IonLabel>
                      <IonInput
                        type="number"
                        inputmode="decimal"
                        min="0"
                        step="0.1"
                        value={form.height_cm}
                        onIonInput={(e) => setForm((prev) => ({ ...prev, height_cm: e.detail.value ?? '' }))}
                      />
                    </IonItem>
                  </div>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Allergies</IonLabel>
                    <IonTextarea
                      autoGrow
                      value={form.allergies}
                      onIonInput={(e) => setForm((prev) => ({ ...prev, allergies: e.detail.value ?? '' }))}
                    />
                  </IonItem>
                  <IonItem lines="none" style={{ marginTop: '6px' }}>
                    <IonLabel position="stacked">Maladies chroniques</IonLabel>
                    <IonTextarea
                      autoGrow
                      value={form.chronic_diseases}
                      onIonInput={(e) => setForm((prev) => ({ ...prev, chronic_diseases: e.detail.value ?? '' }))}
                    />
                  </IonItem>
                  <IonItem lines="none" style={{ marginTop: '6px' }}>
                    <IonLabel position="stacked">Antecedents chirurgicaux</IonLabel>
                    <IonTextarea
                      autoGrow
                      value={form.surgical_history}
                      onIonInput={(e) => setForm((prev) => ({ ...prev, surgical_history: e.detail.value ?? '' }))}
                    />
                  </IonItem>
                  <IonItem lines="none" style={{ marginTop: '6px' }}>
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
                </>
              ) : null}
            </div>

            <div style={{ border: '1px solid #dbe7ef', borderRadius: '14px', padding: '10px', marginBottom: '78px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: '0 0 6px 2px' }}>Urgence</h3>
                <IonButton fill="clear" size="small" onClick={() => setEmergencyExpanded((prev) => !prev)}>
                  <IonIcon icon={emergencyExpanded ? chevronUpOutline : chevronDownOutline} />
                </IonButton>
              </div>
              {emergencyExpanded ? (
                <>
                  <IonItem lines="none">
                    <IonLabel>Vaccination a jour</IonLabel>
                    <IonSelect
                      interface="popover"
                      value={
                        form.vaccination_up_to_date === null
                          ? 'unknown'
                          : form.vaccination_up_to_date
                          ? 'yes'
                          : 'no'
                      }
                      onIonChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          vaccination_up_to_date:
                            e.detail.value === 'unknown' ? null : e.detail.value === 'yes'
                        }))
                      }
                    >
                      <IonSelectOption value="unknown">N/D</IonSelectOption>
                      <IonSelectOption value="yes">Oui</IonSelectOption>
                      <IonSelectOption value="no">Non</IonSelectOption>
                    </IonSelect>
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Notes d'urgence</IonLabel>
                    <IonTextarea
                      autoGrow
                      value={form.emergency_notes}
                      onIonInput={(e) => setForm((prev) => ({ ...prev, emergency_notes: e.detail.value ?? '' }))}
                    />
                  </IonItem>
                  <IonItem lines="none" style={{ marginTop: '6px' }}>
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
                </>
              ) : null}
            </div>

            <div
              style={{
                position: 'fixed',
                bottom: 0,
                background: '#f0f6fa',
                borderTop: '1px solid #dbe7ef',
                paddingTop: '8px',
                zIndex: 1,
                margin: 0,
                width: 'calc(100% - 30px)'
              }}
            >
              <IonButton
                expand="block"
                onClick={() => saveMember().catch(() => undefined)}
                disabled={saving}
              >
                {editingId === null ? 'Ajouter le membre' : 'Mettre a jour'}
              </IonButton>
              <IonButton
                expand="block"
                fill="outline"
                color="dark"
                onClick={() => {
                  setShowAdd(false);
                  setEditingId(null);
                }}
              >
                Annuler
              </IonButton>
            </div>
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
        <IonToast
          isOpen={toastMessage !== null}
          message={toastMessage ?? ''}
          duration={1800}
          color="success"
          onDidDismiss={() => setToastMessage(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default PatientFamilyMembersPage;

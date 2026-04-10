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
  IonSearchbar,
  IonToast,
  IonTitle,
  IonToolbar,
  useIonRouter,
  useIonViewWillEnter
} from '@ionic/react';
import {
  addOutline,
  chevronDownOutline,
  chevronUpOutline,
  closeOutline,
  documentAttachOutline,
  peopleOutline,
  personOutline
} from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiFamilyMember } from '../services/api';
import {
  enqueueFamilyMemberMutation,
  flushFamilyMemberMutationsOutbox,
  getPendingFamilyMemberMutationStateById,
  getPendingFamilyMemberMutationCount
} from '../services/offlineQueue';
import { useAuth } from '../state/AuthState';

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

const relationshipLabel: Record<NonNullable<ApiFamilyMember['relationship']>, string> = {
  parent: 'Parent',
  spouse: 'Conjoint(e)',
  child: 'Enfant',
  sibling: 'Frere/Soeur',
  grandparent: 'Grand-parent',
  other: 'Autre'
};

const PatientFamilyMembersPage: React.FC = () => {
  const { token, user } = useAuth();
  const ionRouter = useIonRouter();
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
  const [uploadingIdDocument, setUploadingIdDocument] = useState(false);
  const [pendingOutboxCount, setPendingOutboxCount] = useState<number>(getPendingFamilyMemberMutationCount());
  const [pendingStateById, setPendingStateById] = useState<Record<number, 'create' | 'update' | 'delete'>>(
    getPendingFamilyMemberMutationStateById()
  );
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [query, setQuery] = useState('');
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
  const idDocumentInputRef = useRef<HTMLInputElement | null>(null);

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

  const load = useCallback(async () => {
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
    const data = await api.getPatientFamilyMembers(token, { includeArchived: true });
    setMembers(data);
    if (cacheKey) {
      localStorage.setItem(cacheKey, JSON.stringify(data));
    }
  }, [cacheKey, token]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  useIonViewWillEnter(() => {
    load().catch(() => undefined);
  });

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
  }, [isOnline, load, token]);

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })),
    [members]
  );
  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortedMembers.filter((member) => {
      if (!q) return true;
      return `${member.name} ${member.relationship ?? ''} ${member.gender ?? ''}`.toLowerCase().includes(q);
    });
  }, [query, sortedMembers]);
  const activeFilteredMembers = useMemo(
    () => filteredMembers.filter((member) => !member.archived_at),
    [filteredMembers]
  );
  const archivedFilteredMembers = useMemo(
    () => filteredMembers.filter((member) => !!member.archived_at),
    [filteredMembers]
  );
  const computedFormAge = useMemo(() => getAgeFromDob(form.date_of_birth || null), [form.date_of_birth]);
  const totalPages = Math.max(1, Math.ceil(activeFilteredMembers.length / pageSize));
  const pagedMembers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return activeFilteredMembers.slice(start, start + pageSize);
  }, [activeFilteredMembers, page]);

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
    setMembers((prev) =>
      prev.map((member) =>
        member.id === id
          ? {
              ...member,
              archived_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          : member
      )
    );
    if (!isOnline) {
      const count = enqueueFamilyMemberMutation({ op: 'delete', local_id: id });
      setPendingOutboxCount(count);
      setPendingStateById(getPendingFamilyMemberMutationStateById());
      setSyncMessage('Hors ligne: archivage en attente.');
      setToastMessage('Membre archive (hors ligne).');
      return;
    }
    await api.deletePatientFamilyMember(token, id);
    setToastMessage('Membre archive.');
  };

  const uploadMemberIdDocument = async (file: File) => {
    if (!token) return;
    if (editingId === null) {
      setToastMessage("Enregistrez d'abord le membre puis ajoutez la piece d'identite.");
      return;
    }
    if (!isOnline) {
      setToastMessage("Hors ligne: upload de piece d'identite indisponible.");
      return;
    }

    setUploadingIdDocument(true);
    try {
      const updated = await api.uploadPatientFamilyMemberIdDocument(token, editingId, file);
      setMembers((prev) => prev.map((member) => (member.id === updated.id ? updated : member)));
      setToastMessage("Piece d'identite mise a jour.");
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : "Echec de l'upload de la piece d'identite.");
    } finally {
      setUploadingIdDocument(false);
      if (idDocumentInputRef.current) {
        idDocumentInputRef.current.value = '';
      }
    }
  };

  const removeMemberIdDocument = async () => {
    if (!token || editingId === null) return;
    if (!isOnline) {
      setToastMessage("Hors ligne: suppression de piece d'identite indisponible.");
      return;
    }
    setUploadingIdDocument(true);
    try {
      const updated = await api.removePatientFamilyMemberIdDocument(token, editingId);
      setMembers((prev) => prev.map((member) => (member.id === updated.id ? updated : member)));
      setToastMessage("Piece d'identite supprimee.");
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : "Echec de suppression de la piece d'identite.");
    } finally {
      setUploadingIdDocument(false);
    }
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
              <IonText color="medium">{activeFilteredMembers.length} membre(s)</IonText>
            </div>
            <IonSearchbar
              value={query}
              placeholder="Rechercher un membre..."
              onIonInput={(e) => setQuery(e.detail.value ?? '')}
            />
            {activeFilteredMembers.length === 0 ? (
              <div style={{ minHeight: '220px', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                <div>
                  <IonIcon icon={peopleOutline} style={{ fontSize: '56px', color: '#64748b' }} />
                  <h3 style={{ marginBottom: 4 }}>Aucun membre trouve</h3>
                  <IonText color="medium">Ajustez les filtres ou ajoutez un membre.</IonText>
                </div>
              </div>
            ) : (
              <IonList>
                {pagedMembers.map((member) => (
                  <IonItem key={member.id} lines="full" button detail onClick={() => ionRouter.push(`/patient/family-members/${member.id}`, 'forward', 'push')}>
                    {member.photo_url ? (
                      <img
                        slot="start"
                        src={member.photo_url}
                        alt={member.name}
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '1px solid #dbe7ef'
                        }}
                      />
                    ) : (
                      <div
                        slot="start"
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          background: '#dbeafe',
                          color: '#1e40af',
                          fontWeight: 700
                        }}
                      >
                        {(member.name || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <IonLabel>
                      <h3>{member.name}</h3>
                      <p>
                        Relation:{' '}
                        {member.relationship ? relationshipLabel[member.relationship] : 'N/D'}
                      </p>
                      {pendingStateById[member.id] ? (
                        <IonBadge color="warning" style={{ marginBottom: '6px' }}>
                          Non synchronise
                        </IonBadge>
                      ) : null}
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            )}
            {activeFilteredMembers.length > pageSize ? (
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
            <div style={{ marginTop: '12px', borderTop: '1px solid #dbe7ef', paddingTop: '10px' }}>
              <IonButton fill="clear" color="medium" size="small" onClick={() => setArchivedExpanded((prev) => !prev)}>
                Membres archives ({archivedFilteredMembers.length})
                <IonIcon slot="end" icon={archivedExpanded ? chevronUpOutline : chevronDownOutline} />
              </IonButton>
              {archivedExpanded ? (
                archivedFilteredMembers.length === 0 ? (
                  <IonText color="medium">
                    <p style={{ marginTop: '6px' }}>Aucun membre archive.</p>
                  </IonText>
                ) : (
                  <IonList>
                    {archivedFilteredMembers.map((member) => (
                      <IonItem
                        key={`archived-${member.id}`}
                        lines="full"
                        button
                        detail
                        onClick={() => ionRouter.push(`/patient/family-members/${member.id}`, 'forward', 'push')}
                      >
                        {member.photo_url ? (
                          <img
                            slot="start"
                            src={member.photo_url}
                            alt={member.name}
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '1px solid #dbe7ef',
                              opacity: 0.75
                            }}
                          />
                        ) : (
                          <div
                            slot="start"
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              display: 'grid',
                              placeItems: 'center',
                              background: '#e2e8f0',
                              color: '#64748b',
                              fontWeight: 700
                            }}
                          >
                            {(member.name || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <IonLabel>
                          <h3>{member.name}</h3>
                          <p>Relation: {member.relationship ? relationshipLabel[member.relationship] : 'N/D'}</p>
                        </IonLabel>
                        <IonBadge color="medium" slot="end">Archive</IonBadge>
                      </IonItem>
                    ))}
                  </IonList>
                )
              ) : null}
            </div>
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
                    <IonText color="medium" style={{ fontSize: '0.85rem' }}>Calcule automatiquement</IonText>
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
                  <IonItem lines="none" style={{ marginTop: '6px' }}>
                    <IonLabel position="stacked">Piece d'identite (optionnel)</IonLabel>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>
                      <IonButton
                        size="small"
                        fill="outline"
                        color={!isOnline ? 'warning' : 'primary'}
                        disabled={!isOnline || uploadingIdDocument}
                        onClick={() => idDocumentInputRef.current?.click()}
                      >
                        <IonIcon icon={documentAttachOutline} slot="start" />
                        {uploadingIdDocument ? 'Upload...' : editingId !== null ? 'Ajouter/Remplacer fichier' : 'Ajouter apres creation'}
                      </IonButton>
                    {editingId !== null ? (
                      (() => {
                        const existing = members.find((m) => m.id === editingId)?.id_document_url;
                        return existing ? (
                          <a href={existing} target="_blank" rel="noreferrer">Voir fichier</a>
                          ) : (
                            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Aucun fichier</span>
                          );
                        })()
                      ) : (
                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Disponible apres creation</span>
                      )}
                      <input
                        ref={idDocumentInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        style={{ display: 'none' }}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void uploadMemberIdDocument(file);
                        }}
                      />
                      {editingId !== null && members.find((m) => m.id === editingId)?.id_document_url ? (
                        <IonButton
                          size="small"
                          fill="outline"
                          color="medium"
                          disabled={!isOnline || uploadingIdDocument}
                          onClick={() => removeMemberIdDocument().catch(() => undefined)}
                        >
                          Retirer fichier
                        </IonButton>
                      ) : null}
                    </div>
                  </IonItem>
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
          header="Archiver ce membre ?"
          message="Le membre ne sera plus visible, mais les donnees seront conservees."
          buttons={[
            {
              text: 'Annuler',
              role: 'cancel',
              handler: () => setDeleteTargetId(null)
            },
            {
              text: 'Archiver',
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

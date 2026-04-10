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
  IonContent,
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
  IonTextarea,
  IonToast,
  IonTitle,
  IonToolbar,
  useIonRouter
} from '@ionic/react';
import { archiveOutline, arrowUndoOutline, chevronDownOutline, chevronUpOutline, createOutline, documentAttachOutline, documentTextOutline, medicalOutline, personOutline } from 'ionicons/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { ApiFamilyMember, ApiMedicalHistoryEntry, ApiPrescription, api } from '../services/api';
import { useAuth } from '../state/AuthState';
import { getPrescriptionStatusClassName, getPrescriptionStatusLabel } from '../utils/prescriptionStatus';
import { formatDateTime } from '../utils/time';
import { getMedicalHistoryCode } from '../utils/medicalHistoryCode';

type RouteParams = {
  memberId: string;
};

const relationshipLabel: Record<string, string> = {
  parent: 'Parent',
  spouse: 'Conjoint(e)',
  child: 'Enfant',
  sibling: 'Frere/Soeur',
  grandparent: 'Grand-parent',
  other: 'Autre'
};

const PatientFamilyMemberDetailPage: React.FC = () => {
  const ionRouter = useIonRouter();
  const { token } = useAuth();
  const { memberId } = useParams<RouteParams>();
  const [member, setMember] = useState<ApiFamilyMember | null>(null);
  const [prescriptions, setPrescriptions] = useState<ApiPrescription[]>([]);
  const [history, setHistory] = useState<ApiMedicalHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isProfileCollapsed, setIsProfileCollapsed] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [isPrescriptionsCollapsed, setIsPrescriptionsCollapsed] = useState(false);
  const [isProfileIdentityCollapsed, setIsProfileIdentityCollapsed] = useState(false);
  const [isProfileHealthCollapsed, setIsProfileHealthCollapsed] = useState(false);
  const [isProfileEmergencyCollapsed, setIsProfileEmergencyCollapsed] = useState(false);
  const [editIdentityExpanded, setEditIdentityExpanded] = useState(true);
  const [editHealthExpanded, setEditHealthExpanded] = useState(true);
  const [editEmergencyExpanded, setEditEmergencyExpanded] = useState(true);
  const [expandedLinkedPrescriptions, setExpandedLinkedPrescriptions] = useState<Record<number, boolean>>({});
  const [expandedLinkedRehab, setExpandedLinkedRehab] = useState<Record<number, boolean>>({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingIdDocument, setUploadingIdDocument] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    date_of_birth: '',
    gender: null as ApiFamilyMember['gender'],
    relationship: null as ApiFamilyMember['relationship'],
    blood_type: null as ApiFamilyMember['blood_type'],
    weight_kg: '',
    height_cm: '',
    allergies: '',
    chronic_diseases: '',
    surgical_history: '',
    vaccination_up_to_date: null as boolean | null,
    emergency_notes: ''
  });
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const idDocumentInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);

    Promise.all([
      api.getPatientFamilyMembers(token, { includeArchived: true }),
      api.getPatientPrescriptions(token, { family_member_id: Number(memberId) }),
      api.getPatientMedicalHistory(token, { family_member_id: Number(memberId) })
    ])
      .then(([members, rx, mh]) => {
        if (!active) return;
        const found = members.find((m) => m.id === Number(memberId)) ?? null;
        setMember(found);
        setPrescriptions(rx);
        setHistory(mh);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [memberId, token]);

  const sortedPrescriptions = useMemo(
    () => [...prescriptions].sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()),
    [prescriptions]
  );
  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [history]
  );
  const computedEditAge = useMemo(() => {
    if (!editForm.date_of_birth) return null;
    const dob = new Date(`${editForm.date_of_birth}T00:00:00`);
    if (Number.isNaN(dob.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
    return age >= 0 ? age : null;
  }, [editForm.date_of_birth]);

  const claimLink = useMemo(() => {
    if (!member?.claim_token) return '';
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/claim-account?token=${encodeURIComponent(member.claim_token)}`;
  }, [member?.claim_token]);

  const claimQrUrl = useMemo(() => {
    if (!claimLink) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(claimLink)}`;
  }, [claimLink]);

  const openEdit = () => {
    if (!member) return;
    setEditForm({
      name: member.name,
      date_of_birth: member.date_of_birth ? member.date_of_birth.slice(0, 10) : '',
      gender: member.gender,
      relationship: member.relationship,
      blood_type: member.blood_type,
      weight_kg: member.weight_kg === null || member.weight_kg === undefined ? '' : String(member.weight_kg),
      height_cm: member.height_cm === null || member.height_cm === undefined ? '' : String(member.height_cm),
      allergies: member.allergies ?? '',
      chronic_diseases: member.chronic_diseases ?? '',
      surgical_history: member.surgical_history ?? '',
      vaccination_up_to_date: member.vaccination_up_to_date ?? null,
      emergency_notes: member.emergency_notes ?? ''
    });
    setEditIdentityExpanded(true);
    setEditHealthExpanded(true);
    setEditEmergencyExpanded(true);
    setShowEdit(true);
  };

  const saveEdit = async () => {
    if (!token || !member) return;
    setSaving(true);
    try {
      const updated = await api.updatePatientFamilyMember(token, member.id, {
        name: editForm.name.trim(),
        date_of_birth: editForm.date_of_birth.trim() || null,
        gender: editForm.gender,
        relationship: editForm.relationship,
        blood_type: editForm.blood_type,
        weight_kg: editForm.weight_kg.trim() ? Number(editForm.weight_kg) : null,
        height_cm: editForm.height_cm.trim() ? Number(editForm.height_cm) : null,
        allergies: editForm.allergies.trim() || null,
        chronic_diseases: editForm.chronic_diseases.trim() || null,
        surgical_history: editForm.surgical_history.trim() || null,
        vaccination_up_to_date: editForm.vaccination_up_to_date,
        emergency_notes: editForm.emergency_notes.trim() || null
      });
      setMember(updated);
      setShowEdit(false);
      setToastMessage('Membre mis a jour.');
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async () => {
    if (!token || !member) return;
    await api.deletePatientFamilyMember(token, member.id);
    setToastMessage('Membre archive.');
    ionRouter.push('/patient/family-members', 'back', 'pop');
  };

  const unarchiveMember = async () => {
    if (!token || !member) return;
    const updated = await api.unarchivePatientFamilyMember(token, member.id);
    setMember(updated);
    setToastMessage('Membre desarchive.');
  };

  const uploadPhoto = async (file: File) => {
    if (!token || !member) return;
    setUploadingPhoto(true);
    try {
      const updated = await api.uploadPatientFamilyMemberPhoto(token, member.id, file);
      setMember(updated);
      setToastMessage('Photo du membre mise a jour.');
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : "Echec de l'upload photo.");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  const removePhoto = async () => {
    if (!token || !member) return;
    if (!member.photo_url) return;
    setUploadingPhoto(true);
    try {
      const updated = await api.removePatientFamilyMemberPhoto(token, member.id);
      setMember(updated);
      setToastMessage('Photo supprimee.');
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Echec de suppression photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const uploadIdDocument = async (file: File) => {
    if (!token || !member) return;
    setUploadingIdDocument(true);
    try {
      const updated = await api.uploadPatientFamilyMemberIdDocument(token, member.id, file);
      setMember(updated);
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

  const removeIdDocument = async () => {
    if (!token || !member || !member.id_document_url) return;
    setUploadingIdDocument(true);
    try {
      const updated = await api.removePatientFamilyMemberIdDocument(token, member.id);
      setMember(updated);
      setToastMessage("Piece d'identite supprimee.");
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : "Echec de suppression de la piece d'identite.");
    } finally {
      setUploadingIdDocument(false);
    }
  };

  const toggleLinkedPrescriptionDetails = (entryId: number) => {
    setExpandedLinkedPrescriptions((prev) => ({ ...prev, [entryId]: !prev[entryId] }));
  };

  const toggleLinkedRehabDetails = (entryId: number) => {
    setExpandedLinkedRehab((prev) => ({ ...prev, [entryId]: !prev[entryId] }));
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient/family-members" />
          </IonButtons>
          <IonButtons slot="end">
            {!member?.archived_at ? (
              <>
                <IonButton fill="clear" onClick={openEdit}>
                  <IonIcon icon={createOutline} />
                </IonButton>
                <IonButton fill="clear" color="danger" onClick={() => setShowDelete(true)}>
                  <IonIcon icon={archiveOutline} />
                </IonButton>
              </>
            ) : null}
          </IonButtons>
          <IonTitle>{member?.name || 'Membre de famille'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        {loading ? (
          <IonText color="medium"><p>Chargement...</p></IonText>
        ) : !member ? (
          <IonText color="danger"><p>Membre introuvable.</p></IonText>
        ) : (
          <>
            <IonCard className="surface-card">
              <IonCardHeader>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IonIcon icon={personOutline} /> Profil
                  </IonCardTitle>
                  <IonButton fill="clear" size="small" onClick={() => setIsProfileCollapsed((prev) => !prev)}>
                    <IonIcon icon={isProfileCollapsed ? chevronDownOutline : chevronUpOutline} />
                  </IonButton>
                </div>
              </IonCardHeader>
              {!isProfileCollapsed ? (
              <IonCardContent>
                {member.archived_at ? (
                  <IonBadge color="medium" style={{ marginBottom: '8px' }}>Archive</IonBadge>
                ) : null}
                {member.archived_at ? (
                  <IonButton
                    size="small"
                    fill="outline"
                    color="success"
                    onClick={() => unarchiveMember().catch(() => undefined)}
                    style={{ marginBottom: '8px' }}
                  >
                    <IonIcon icon={arrowUndoOutline} slot="start" />
                    Desarchiver
                  </IonButton>
                ) : null}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadPhoto(file);
                    }}
                  />
                  <div
                    style={{
                      position: 'relative',
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '1px solid #dbe7ef',
                      background: '#dbeafe',
                      cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
                      opacity: uploadingPhoto ? 0.7 : 1
                    }}
                    onClick={() => {
                      if (uploadingPhoto) return;
                      photoInputRef.current?.click();
                    }}
                  >
                    {member.photo_url ? (
                      <img src={member.photo_url} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#1e40af' }}>
                        <IonIcon icon={personOutline} />
                      </div>
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        right: '2px',
                        bottom: '2px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '999px',
                        display: 'grid',
                        placeItems: 'center',
                        background: '#0ea5e9',
                        color: '#fff',
                        border: '1px solid #fff'
                      }}
                    >
                      <IonIcon icon={createOutline} style={{ fontSize: '11px' }} />
                    </div>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700 }}>{member.name}</p>
                    {uploadingPhoto ? (
                      <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>Upload...</p>
                    ) : null}
                    {!member.archived_at && member.photo_url ? (
                      <IonButton
                        size="small"
                        fill="outline"
                        color="medium"
                        onClick={() => removePhoto().catch(() => undefined)}
                        style={{ marginTop: '6px' }}
                      >
                        Retirer photo
                      </IonButton>
                    ) : null}
                  </div>
                </div>
                <div style={{ border: '1px solid #dbe7ef', borderRadius: '12px', marginBottom: '8px' }}>
                  <IonButton fill="clear" color="dark" expand="block" onClick={() => setIsProfileIdentityCollapsed((v) => !v)} style={{ margin: 0 }}>
                    Identite
                    <IonIcon slot="end" icon={isProfileIdentityCollapsed ? chevronDownOutline : chevronUpOutline} />
                  </IonButton>
                  {!isProfileIdentityCollapsed ? (
                    <div style={{ padding: '0 12px 8px' }}>
                      <p><strong>Nom:</strong> {member.name}</p>
                      <p><strong>Date de naissance:</strong> {member.date_of_birth || 'N/D'}</p>
                      <p><strong>Age:</strong> {member.age ?? 'N/D'}</p>
                      <p><strong>Relation:</strong> {member.relationship ? relationshipLabel[member.relationship] : 'N/D'}</p>
                      <p><strong>Genre:</strong> {member.gender === 'male' ? 'M' : member.gender === 'female' ? 'F' : 'N/D'}</p>
                      <p>
                        <strong>Piece d'identite:</strong>{' '}
                        {member.id_document_url ? (
                          <a href={member.id_document_url} target="_blank" rel="noreferrer">
                            Voir fichier
                          </a>
                        ) : 'N/D'}
                      </p>
                      {!member.archived_at ? (
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <IonButton
                            size="small"
                            fill="outline"
                            disabled={uploadingIdDocument}
                            onClick={() => idDocumentInputRef.current?.click()}
                          >
                            <IonIcon icon={documentAttachOutline} slot="start" />
                            {uploadingIdDocument ? 'Upload...' : member.id_document_url ? 'Remplacer fichier' : 'Ajouter fichier'}
                          </IonButton>
                          <input
                            ref={idDocumentInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            style={{ display: 'none' }}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) void uploadIdDocument(file);
                            }}
                          />
                          {member.id_document_url ? (
                            <IonButton
                              size="small"
                              fill="outline"
                              color="medium"
                              disabled={uploadingIdDocument}
                              onClick={() => removeIdDocument().catch(() => undefined)}
                            >
                              Retirer fichier
                            </IonButton>
                          ) : null}
                        </div>
                      ) : null}
                      <div style={{ marginTop: '10px', border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '8px' }}>
                        <p style={{ margin: '0 0 4px 0' }}><strong>Token de reclamation:</strong> {member.claim_token || 'N/D'}</p>
                        {claimLink ? (
                          <>
                            <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#64748b', wordBreak: 'break-all' }}>{claimLink}</p>
                            <img
                              src={claimQrUrl}
                              alt="QR reclamation compte"
                              style={{ width: '160px', height: '160px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #dbe7ef' }}
                            />
                          </>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div style={{ border: '1px solid #dbe7ef', borderRadius: '12px', marginBottom: '8px' }}>
                  <IonButton fill="clear" color="dark" expand="block" onClick={() => setIsProfileHealthCollapsed((v) => !v)} style={{ margin: 0 }}>
                    Sante
                    <IonIcon slot="end" icon={isProfileHealthCollapsed ? chevronDownOutline : chevronUpOutline} />
                  </IonButton>
                  {!isProfileHealthCollapsed ? (
                    <div style={{ padding: '0 12px 8px' }}>
                      <p><strong>Groupe sanguin:</strong> {member.blood_type || 'N/D'}</p>
                      <p><strong>Poids (kg):</strong> {member.weight_kg ?? 'N/D'}</p>
                      <p><strong>Taille (cm):</strong> {member.height_cm ?? 'N/D'}</p>
                      <p><strong>Vaccination a jour:</strong> {member.vaccination_up_to_date === null ? 'N/D' : member.vaccination_up_to_date ? 'Oui' : 'Non'}</p>
                      <p><strong>Allergies:</strong> {member.allergies || 'N/D'}</p>
                      <p><strong>Maladies chroniques:</strong> {member.chronic_diseases || 'N/D'}</p>
                      <p><strong>Antecedents chirurgicaux:</strong> {member.surgical_history || 'N/D'}</p>
                    </div>
                  ) : null}
                </div>
                <div style={{ border: '1px solid #dbe7ef', borderRadius: '12px' }}>
                  <IonButton fill="clear" color="dark" expand="block" onClick={() => setIsProfileEmergencyCollapsed((v) => !v)} style={{ margin: 0 }}>
                    Urgence
                    <IonIcon slot="end" icon={isProfileEmergencyCollapsed ? chevronDownOutline : chevronUpOutline} />
                  </IonButton>
                  {!isProfileEmergencyCollapsed ? (
                    <div style={{ padding: '0 12px 8px' }}>
                      <p><strong>Notes d'urgence:</strong> {member.emergency_notes || 'N/D'}</p>
                      <p><strong>Personne de reference:</strong> {member.primary_caregiver ? 'Oui' : 'Non'}</p>
                    </div>
                  ) : null}
                </div>
              </IonCardContent>
              ) : null}
            </IonCard>

            <IonCard className="surface-card">
              <IonCardHeader>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IonIcon icon={documentTextOutline} /> Ordonnances
                  </IonCardTitle>
                  <IonButton fill="clear" size="small" onClick={() => setIsPrescriptionsCollapsed((prev) => !prev)}>
                    <IonIcon icon={isPrescriptionsCollapsed ? chevronDownOutline : chevronUpOutline} />
                  </IonButton>
                </div>
              </IonCardHeader>
              {!isPrescriptionsCollapsed ? (
              <IonCardContent>
                {sortedPrescriptions.length === 0 ? (
                  <IonText color="medium"><p>Aucune ordonnance.</p></IonText>
                ) : (
                  <IonList>
                    {sortedPrescriptions.map((prescription) => (
                      <IonItem key={prescription.id} lines="full">
                        <IonLabel>
                          <p>Code: {prescription.print_code || `#${prescription.id}`}</p>
                          <div className="status-row">
                            <span>Statut:</span>
                            <IonBadge className={getPrescriptionStatusClassName(prescription.status)}>
                              {getPrescriptionStatusLabel(prescription.status)}
                            </IonBadge>
                          </div>
                          <p>Demandee le {formatDateTime(prescription.requested_at)}</p>
                        </IonLabel>
                      </IonItem>
                    ))}
                  </IonList>
                )}
              </IonCardContent>
              ) : null}
            </IonCard>

            <IonCard className="surface-card">
              <IonCardHeader>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IonIcon icon={medicalOutline} /> Historique medical
                  </IonCardTitle>
                  <IonButton fill="clear" size="small" onClick={() => setIsHistoryCollapsed((prev) => !prev)}>
                    <IonIcon icon={isHistoryCollapsed ? chevronDownOutline : chevronUpOutline} />
                  </IonButton>
                </div>
              </IonCardHeader>
              {!isHistoryCollapsed ? (
              <IonCardContent>
                {sortedHistory.length === 0 ? (
                  <IonText color="medium"><p>Aucun historique medical.</p></IonText>
                ) : (
                  <IonList>
                    {sortedHistory.map((entry) => (
                      <IonItem
                        key={entry.id}
                        lines="none"
                        style={{
                          border: '1px solid #d1e1ec',
                          borderLeft: '4px solid #8fb3c9',
                          borderRadius: '12px',
                          marginBottom: '10px',
                          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)',
                          background: '#ffffff'
                        }}
                      >
                        <IonLabel>
                          <p style={{ marginBottom: 2, fontSize: '1.08rem', fontWeight: 800, color: '#0f172a' }}>
                            Reference medicale: {getMedicalHistoryCode(entry)}
                          </p>
                          <h3>{entry.title}</h3>
                          <p>{entry.details || 'Sans detail'}</p>
                          {((entry.linked_prescriptions && entry.linked_prescriptions.length > 0) || entry.prescription_id) ? (
                            <div
                              style={{
                                marginTop: '8px',
                                border: '1px solid var(--ion-color-light-shade)',
                                borderRadius: '10px',
                                padding: '8px 10px',
                                background: 'var(--ion-color-light)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <strong>Ordonnance(s) liee(s):</strong>
                                <IonButton
                                  size="small"
                                  fill="outline"
                                  onClick={() => toggleLinkedPrescriptionDetails(entry.id)}
                                >
                                  {expandedLinkedPrescriptions[entry.id] ? 'Masquer details' : 'Afficher details'}
                                </IonButton>
                              </div>
                              <div style={{ marginTop: '6px' }}>
                                {(entry.linked_prescriptions && entry.linked_prescriptions.length > 0)
                                  ? entry.linked_prescriptions.map((rx) => (
                                      <p key={`family-history-rx-${entry.id}-${rx.id}`} style={{ margin: '4px 0 0 0' }}>
                                        {rx.print_code ?? `#${rx.id}`}
                                      </p>
                                    ))
                                  : (
                                      <p style={{ margin: '4px 0 0 0' }}>
                                        {entry.prescription_print_code
                                          ?? sortedPrescriptions.find((p) => p.id === entry.prescription_id)?.print_code
                                          ?? `#${entry.prescription_id}`}
                                      </p>
                                    )}
                              </div>
                              {expandedLinkedPrescriptions[entry.id] ? (
                                <div
                                  style={{
                                    marginTop: '8px',
                                    borderTop: '1px solid var(--ion-color-light-shade)',
                                    paddingTop: '8px'
                                  }}
                                >
                                  {(() => {
                                    const linkedIds = (entry.linked_prescriptions ?? []).map((rx) => rx.id);
                                    if (linkedIds.length === 0 && entry.prescription_id) {
                                      linkedIds.push(entry.prescription_id);
                                    }
                                    const linkedRows = sortedPrescriptions.filter((p) => linkedIds.includes(p.id));
                                    if (linkedRows.length === 0) return <p style={{ margin: 0 }}>Details indisponibles.</p>;
                                    return (
                                      <>
                                        {linkedRows.map((linked) => (
                                          <div key={`family-history-details-${entry.id}-${linked.id}`} style={{ marginBottom: '8px' }}>
                                            <p style={{ margin: '0 0 4px 0' }}>
                                              <strong>{linked.print_code || `#${linked.id}`}</strong>
                                            </p>
                                            {linked.medicine_requests.map((med) => (
                                              <p key={`${entry.id}-${linked.id}-${med.id}`} style={{ margin: '0 0 4px 0' }}>
                                                - {med.name} · {med.form || 'Forme N/A'} · {med.strength || 'Dosage N/A'} · Qt: {med.quantity ?? 1}
                                              </p>
                                            ))}
                                          </div>
                                        ))}
                                      </>
                                    );
                                  })()}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                          {entry.linked_rehab_entries && entry.linked_rehab_entries.length > 0 ? (
                            <div
                              style={{
                                marginTop: '8px',
                                border: '1px solid var(--ion-color-light-shade)',
                                borderRadius: '10px',
                                padding: '8px 10px',
                                background: 'var(--ion-color-light)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <strong>Reeducation liee:</strong>
                                <IonButton
                                  size="small"
                                  fill="outline"
                                  onClick={() => toggleLinkedRehabDetails(entry.id)}
                                >
                                  {expandedLinkedRehab[entry.id] ? 'Masquer details' : 'Afficher details'}
                                </IonButton>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                                {entry.linked_rehab_entries.map((rehab) => (
                                  <IonBadge key={`family-history-rehab-${entry.id}-${rehab.id}`} color="tertiary">
                                    {rehab.reference}
                                  </IonBadge>
                                ))}
                              </div>
                              {expandedLinkedRehab[entry.id] ? (
                                <div
                                  style={{
                                    marginTop: '8px',
                                    borderTop: '1px solid var(--ion-color-light-shade)',
                                    paddingTop: '8px'
                                  }}
                                >
                                  {entry.linked_rehab_entries.map((rehab) => (
                                    <div key={`family-history-rehab-details-${entry.id}-${rehab.id}`} style={{ marginBottom: '8px' }}>
                                      <p style={{ margin: '0 0 4px 0' }}>
                                        <strong>{rehab.reference}</strong>
                                        {' · '}
                                        {rehab.follow_up_date
                                          ? formatDateTime(rehab.follow_up_date)
                                          : (rehab.created_at ? formatDateTime(rehab.created_at) : 'N/D')}
                                      </p>
                                      <p style={{ margin: '2px 0' }}>
                                        Sessions/semaine: {rehab.sessions_per_week ?? 'N/D'} · Duree (sem): {rehab.duration_weeks ?? 'N/D'}
                                      </p>
                                      <p style={{ margin: '2px 0' }}>
                                        Douleur: {rehab.pain_score ?? 'N/D'} · Mobilite: {rehab.mobility_score || 'N/D'}
                                      </p>
                                      <p style={{ margin: '2px 0' }}>
                                        Exercice: {rehab.exercise_type || 'N/D'} · Frequence: {rehab.exercise_frequency || 'N/D'} · Reps: {rehab.exercise_reps || 'N/D'}
                                      </p>
                                      <p style={{ margin: '2px 0' }}>
                                        Suivi: {rehab.follow_up_date ? formatDateTime(rehab.follow_up_date) : 'N/D'}
                                      </p>
                                      {rehab.goals ? <p style={{ margin: '2px 0' }}><strong>Objectifs:</strong> {rehab.goals}</p> : null}
                                      {rehab.progress_notes ? <p style={{ margin: '2px 0' }}><strong>Progression:</strong> {rehab.progress_notes}</p> : null}
                                      {rehab.exercise_notes ? <p style={{ margin: '2px 0' }}><strong>Notes:</strong> {rehab.exercise_notes}</p> : null}
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                          <p>Cree le {formatDateTime(entry.created_at)}</p>
                        </IonLabel>
                      </IonItem>
                    ))}
                  </IonList>
                )}
              </IonCardContent>
              ) : null}
            </IonCard>
          </>
        )}
        <IonModal isOpen={showEdit} onDidDismiss={() => setShowEdit(false)}>
          <IonContent className="ion-padding app-content">
            <h2 style={{ marginTop: 0 }}>Modifier le membre</h2>
            <div style={{ border: '1px solid #dbe7ef', borderRadius: '12px', marginBottom: '10px' }}>
              <IonButton fill="clear" color="dark" expand="block" onClick={() => setEditIdentityExpanded((v) => !v)} style={{ margin: 0 }}>
                Identite
                <IonIcon slot="end" icon={editIdentityExpanded ? chevronUpOutline : chevronDownOutline} />
              </IonButton>
              {editIdentityExpanded ? (
                <>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Nom</IonLabel>
                    <IonInput value={editForm.name} onIonInput={(e) => setEditForm((prev) => ({ ...prev, name: e.detail.value ?? '' }))} />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Date de naissance</IonLabel>
                    <IonInput type="date" value={editForm.date_of_birth} onIonInput={(e) => setEditForm((prev) => ({ ...prev, date_of_birth: e.detail.value ?? '' }))} />
                  </IonItem>
                  <div style={{ padding: '0 14px 8px' }}>
                    <IonBadge color="medium">Age: {computedEditAge ?? 'N/D'}</IonBadge>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <IonItem lines="none">
                      <IonLabel position="stacked">Relation</IonLabel>
                      <IonSelect value={editForm.relationship} onIonChange={(e) => setEditForm((prev) => ({ ...prev, relationship: e.detail.value ?? null }))}>
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
                      <IonSelect value={editForm.gender} onIonChange={(e) => setEditForm((prev) => ({ ...prev, gender: e.detail.value ?? null }))}>
                        <IonSelectOption value="male">M</IonSelectOption>
                        <IonSelectOption value="female">F</IonSelectOption>
                      </IonSelect>
                    </IonItem>
                  </div>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Piece d'identite (optionnel)</IonLabel>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>
                      <IonButton
                        size="small"
                        fill="outline"
                        disabled={uploadingIdDocument}
                        onClick={() => idDocumentInputRef.current?.click()}
                      >
                        <IonIcon icon={documentAttachOutline} slot="start" />
                        {uploadingIdDocument ? 'Upload...' : member?.id_document_url ? 'Remplacer fichier' : 'Ajouter fichier'}
                      </IonButton>
                      {member?.id_document_url ? (
                        <a href={member.id_document_url} target="_blank" rel="noreferrer">Voir fichier</a>
                      ) : (
                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Aucun fichier</span>
                      )}
                      <input
                        ref={idDocumentInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        style={{ display: 'none' }}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void uploadIdDocument(file);
                        }}
                      />
                      {member?.id_document_url ? (
                        <IonButton
                          size="small"
                          fill="outline"
                          color="medium"
                          disabled={uploadingIdDocument}
                          onClick={() => removeIdDocument().catch(() => undefined)}
                        >
                          Retirer fichier
                        </IonButton>
                      ) : null}
                    </div>
                  </IonItem>
                </>
              ) : null}
            </div>

            <div style={{ border: '1px solid #dbe7ef', borderRadius: '12px', marginBottom: '10px' }}>
              <IonButton fill="clear" color="dark" expand="block" onClick={() => setEditHealthExpanded((v) => !v)} style={{ margin: 0 }}>
                Sante
                <IonIcon slot="end" icon={editHealthExpanded ? chevronUpOutline : chevronDownOutline} />
              </IonButton>
              {editHealthExpanded ? (
                <>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Groupe sanguin</IonLabel>
                    <IonSelect value={editForm.blood_type} onIonChange={(e) => setEditForm((prev) => ({ ...prev, blood_type: e.detail.value ?? null }))}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <IonItem lines="none">
                      <IonLabel position="stacked">Poids (kg)</IonLabel>
                      <IonInput type="number" inputmode="decimal" step="0.1" value={editForm.weight_kg} onIonInput={(e) => setEditForm((prev) => ({ ...prev, weight_kg: e.detail.value ?? '' }))} />
                    </IonItem>
                    <IonItem lines="none">
                      <IonLabel position="stacked">Taille (cm)</IonLabel>
                      <IonInput type="number" inputmode="decimal" step="0.1" value={editForm.height_cm} onIonInput={(e) => setEditForm((prev) => ({ ...prev, height_cm: e.detail.value ?? '' }))} />
                    </IonItem>
                  </div>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Allergies</IonLabel>
                    <IonTextarea autoGrow value={editForm.allergies} onIonInput={(e) => setEditForm((prev) => ({ ...prev, allergies: e.detail.value ?? '' }))} />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Maladies chroniques</IonLabel>
                    <IonTextarea autoGrow value={editForm.chronic_diseases} onIonInput={(e) => setEditForm((prev) => ({ ...prev, chronic_diseases: e.detail.value ?? '' }))} />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Antecedents chirurgicaux</IonLabel>
                    <IonTextarea autoGrow value={editForm.surgical_history} onIonInput={(e) => setEditForm((prev) => ({ ...prev, surgical_history: e.detail.value ?? '' }))} />
                  </IonItem>
                </>
              ) : null}
            </div>

            <div style={{ border: '1px solid #dbe7ef', borderRadius: '12px', marginBottom: '82px' }}>
              <IonButton fill="clear" color="dark" expand="block" onClick={() => setEditEmergencyExpanded((v) => !v)} style={{ margin: 0 }}>
                Urgence
                <IonIcon slot="end" icon={editEmergencyExpanded ? chevronUpOutline : chevronDownOutline} />
              </IonButton>
              {editEmergencyExpanded ? (
                <>
                  <IonItem lines="none">
                    <IonLabel position="stacked">Vaccination a jour</IonLabel>
                    <IonSelect
                      value={
                        editForm.vaccination_up_to_date === null
                          ? 'unknown'
                          : editForm.vaccination_up_to_date
                          ? 'yes'
                          : 'no'
                      }
                      onIonChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          vaccination_up_to_date: e.detail.value === 'unknown' ? null : e.detail.value === 'yes'
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
                    <IonTextarea autoGrow value={editForm.emergency_notes} onIonInput={(e) => setEditForm((prev) => ({ ...prev, emergency_notes: e.detail.value ?? '' }))} />
                  </IonItem>
                </>
              ) : null}
            </div>

            <div style={{ position: 'fixed', left: '15px', right: '15px', bottom: 0, background: '#f0f6fa', borderTop: '1px solid #dbe7ef', paddingTop: '8px' }}>
              <IonButton expand="block" onClick={() => saveEdit().catch(() => undefined)} disabled={saving}>
                Enregistrer
              </IonButton>
              <IonButton expand="block" fill="outline" color="dark" onClick={() => setShowEdit(false)}>
                Annuler
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={showDelete}
          header="Archiver ce membre ?"
          message="Le membre ne sera plus visible, mais les donnees seront conservees."
          buttons={[
            { text: 'Annuler', role: 'cancel', handler: () => setShowDelete(false) },
            {
              text: 'Archiver',
              role: 'destructive',
              handler: () => {
                setShowDelete(false);
                removeMember().catch(() => undefined);
              }
            }
          ]}
          onDidDismiss={() => setShowDelete(false)}
        />
        <IonToast isOpen={!!toastMessage} message={toastMessage || ''} duration={1800} onDidDismiss={() => setToastMessage(null)} />
      </IonContent>
    </IonPage>
  );
};

export default PatientFamilyMemberDetailPage;

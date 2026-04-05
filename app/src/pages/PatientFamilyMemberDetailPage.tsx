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
import { archiveOutline, arrowUndoOutline, chevronDownOutline, chevronUpOutline, createOutline, documentTextOutline, medicalOutline, personOutline } from 'ionicons/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { ApiFamilyMember, ApiMedicalHistoryEntry, ApiPrescription, api } from '../services/api';
import { useAuth } from '../state/AuthState';
import { getPrescriptionStatusClassName, getPrescriptionStatusLabel } from '../utils/prescriptionStatus';
import { formatDateTime } from '../utils/time';

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
  const [expandedLinkedPrescriptions, setExpandedLinkedPrescriptions] = useState<Record<number, boolean>>({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    date_of_birth: '',
    gender: null as ApiFamilyMember['gender'],
    relationship: null as ApiFamilyMember['relationship'],
    blood_type: null as ApiFamilyMember['blood_type'],
    allergies: '',
    chronic_diseases: '',
    emergency_notes: ''
  });
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);

    Promise.all([
      api.getPatientFamilyMembers(token, { includeArchived: true }),
      api.getPatientPrescriptions(token),
      api.getPatientMedicalHistory(token, { family_member_id: Number(memberId) })
    ])
      .then(([members, rx, mh]) => {
        if (!active) return;
        const found = members.find((m) => m.id === Number(memberId)) ?? null;
        setMember(found);
        setPrescriptions(rx.filter((p) => p.family_member_id === Number(memberId)));
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

  const openEdit = () => {
    if (!member) return;
    setEditForm({
      name: member.name,
      date_of_birth: member.date_of_birth ? member.date_of_birth.slice(0, 10) : '',
      gender: member.gender,
      relationship: member.relationship,
      blood_type: member.blood_type,
      allergies: member.allergies ?? '',
      chronic_diseases: member.chronic_diseases ?? '',
      emergency_notes: member.emergency_notes ?? ''
    });
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
        allergies: editForm.allergies.trim() || null,
        chronic_diseases: editForm.chronic_diseases.trim() || null,
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

  const toggleLinkedPrescriptionDetails = (entryId: number) => {
    setExpandedLinkedPrescriptions((prev) => ({ ...prev, [entryId]: !prev[entryId] }));
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
                  </div>
                </div>
                <p><strong>Nom:</strong> {member.name}</p>
                <p><strong>Date de naissance:</strong> {member.date_of_birth || 'N/D'}</p>
                <p><strong>Relation:</strong> {member.relationship ? relationshipLabel[member.relationship] : 'N/D'}</p>
                <p><strong>Genre:</strong> {member.gender === 'male' ? 'M' : member.gender === 'female' ? 'F' : 'N/D'}</p>
                <p><strong>Groupe sanguin:</strong> {member.blood_type || 'N/D'}</p>
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
                      <IonItem key={entry.id} lines="full">
                        <IonLabel>
                          <p>Reference: {entry.entry_code || `MH-${entry.id}`}</p>
                          <h3>{entry.title}</h3>
                          <p>{entry.details || 'Sans detail'}</p>
                          {entry.prescription_id ? (
                            <div
                              style={{
                                marginTop: '8px',
                                border: '1px solid var(--ion-color-light-shade)',
                                borderRadius: '10px',
                                padding: '8px 10px',
                                background: 'var(--ion-color-light)'
                              }}
                            >
                              <p style={{ margin: 0 }}>
                                <strong>Ordonnance liee:</strong>{' '}
                                {entry.prescription_print_code
                                  ?? sortedPrescriptions.find((p) => p.id === entry.prescription_id)?.print_code
                                  ?? `#${entry.prescription_id}`}
                              </p>
                              <IonButton
                                size="small"
                                fill="outline"
                                style={{ marginTop: '6px' }}
                                onClick={() => toggleLinkedPrescriptionDetails(entry.id)}
                              >
                                {expandedLinkedPrescriptions[entry.id] ? 'Masquer details' : 'Afficher details'}
                              </IonButton>
                              {expandedLinkedPrescriptions[entry.id] ? (
                                <div
                                  style={{
                                    marginTop: '8px',
                                    borderTop: '1px solid var(--ion-color-light-shade)',
                                    paddingTop: '8px'
                                  }}
                                >
                                  {(() => {
                                    const linked = sortedPrescriptions.find((p) => p.id === entry.prescription_id);
                                    if (!linked) return <p style={{ margin: 0 }}>Details indisponibles.</p>;
                                    return (
                                      <>
                                        {linked.medicine_requests.map((med) => (
                                          <p key={`${entry.id}-${med.id}`} style={{ margin: '0 0 4px 0' }}>
                                            - {med.name} · {med.form || 'Forme N/A'} · {med.strength || 'Dosage N/A'} · Qt: {med.quantity ?? 1}
                                          </p>
                                        ))}
                                      </>
                                    );
                                  })()}
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
            <h2>Modifier le membre</h2>
            <IonItem lines="none">
              <IonLabel position="stacked">Nom</IonLabel>
              <IonInput value={editForm.name} onIonInput={(e) => setEditForm((prev) => ({ ...prev, name: e.detail.value ?? '' }))} />
            </IonItem>
            <IonItem lines="none">
              <IonLabel position="stacked">Date de naissance</IonLabel>
              <IonInput type="date" value={editForm.date_of_birth} onIonInput={(e) => setEditForm((prev) => ({ ...prev, date_of_birth: e.detail.value ?? '' }))} />
            </IonItem>
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
            <IonItem lines="none">
              <IonLabel position="stacked">Allergies</IonLabel>
              <IonTextarea autoGrow value={editForm.allergies} onIonInput={(e) => setEditForm((prev) => ({ ...prev, allergies: e.detail.value ?? '' }))} />
            </IonItem>
            <IonItem lines="none">
              <IonLabel position="stacked">Maladies chroniques</IonLabel>
              <IonTextarea autoGrow value={editForm.chronic_diseases} onIonInput={(e) => setEditForm((prev) => ({ ...prev, chronic_diseases: e.detail.value ?? '' }))} />
            </IonItem>
            <IonItem lines="none">
              <IonLabel position="stacked">Notes d'urgence</IonLabel>
              <IonTextarea autoGrow value={editForm.emergency_notes} onIonInput={(e) => setEditForm((prev) => ({ ...prev, emergency_notes: e.detail.value ?? '' }))} />
            </IonItem>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <IonButton expand="block" fill="outline" color="dark" onClick={() => setShowEdit(false)}>
                Annuler
              </IonButton>
              <IonButton expand="block" onClick={() => saveEdit().catch(() => undefined)} disabled={saving}>
                Enregistrer
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

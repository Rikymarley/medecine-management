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
  IonModal,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { addOutline, closeOutline, createOutline, medicalOutline, trashOutline } from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import InstallBanner from '../components/InstallBanner';
import { api, ApiMedicalHistoryEntry, ApiPrescription } from '../services/api';
import { useAuth } from '../state/AuthState';
import { formatDateHaiti, formatDateTime } from '../utils/time';
import { getMedicalHistoryCode } from '../utils/medicalHistoryCode';

const typeLabel: Record<ApiMedicalHistoryEntry['type'], string> = {
  condition: 'Condition',
  allergy: 'Allergie',
  surgery: 'Chirurgie',
  hospitalization: 'Hospitalisation',
  medication: 'Traitement',
  note: 'Note'
};

const visibilityLabel: Record<ApiMedicalHistoryEntry['visibility'], string> = {
  shared: 'Partage',
  patient_only: 'Patient seulement',
  doctor_only: 'Docteur seulement'
};

const statusLabel: Record<ApiMedicalHistoryEntry['status'], string> = {
  active: 'Actif',
  resolved: 'Resolue'
};

const statusColor: Record<ApiMedicalHistoryEntry['status'], string> = {
  active: 'warning',
  resolved: 'success'
};

const toDateInputValue = (value: string | null) => {
  if (!value) {
    return '';
  }
  return value.includes('T') ? value.slice(0, 10) : value;
};

const PatientMedicalHistoryPage: React.FC = () => {
  const { token } = useAuth();
  const [entries, setEntries] = useState<ApiMedicalHistoryEntry[]>([]);
  const [prescriptions, setPrescriptions] = useState<ApiPrescription[]>([]);
  const [expandedPrescriptionByHistoryId, setExpandedPrescriptionByHistoryId] = useState<Record<number, boolean>>({});
  const [expandedRehabByHistoryId, setExpandedRehabByHistoryId] = useState<Record<number, boolean>>({});
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [form, setForm] = useState<{
    type: ApiMedicalHistoryEntry['type'];
    title: string;
    details: string;
    started_at: string;
    ended_at: string;
    status: ApiMedicalHistoryEntry['status'];
    visibility: Extract<ApiMedicalHistoryEntry['visibility'], 'shared' | 'patient_only'>;
  }>({
    type: 'condition',
    title: '',
    details: '',
    started_at: '',
    ended_at: '',
    status: 'active',
    visibility: 'shared'
  });

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    const [history, rx] = await Promise.all([
      api.getPatientMedicalHistory(token),
      api.getPatientPrescriptions(token).catch(() => [])
    ]);

    setEntries(history);
    setPrescriptions(rx);
  }, [token]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const sortedEntries = useMemo(
    () =>
      [...entries].sort((a, b) => {
        const aDate = a.started_at ?? a.created_at;
        const bDate = b.started_at ?? b.created_at;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      }),
    [entries]
  );

  const filteredEntries = sortedEntries;
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const pagedEntries = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const resetForm = () => {
    setForm({
      type: 'condition',
      title: '',
      details: '',
      started_at: '',
      ended_at: '',
      status: 'active',
      visibility: 'shared'
    });
    setEditingId(null);
  };

  const startEdit = (entry: ApiMedicalHistoryEntry) => {
    setEditingId(entry.id);
    setForm({
      type: entry.type,
      title: entry.title,
      details: entry.details ?? '',
      started_at: toDateInputValue(entry.started_at),
      ended_at: toDateInputValue(entry.ended_at),
      status: entry.status,
      visibility: entry.visibility === 'doctor_only' ? 'shared' : entry.visibility
    });
    setShowModal(true);
  };

  const upsert = async () => {
    if (!token || !form.title.trim()) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type: form.type,
        title: form.title.trim(),
        details: form.details.trim() || null,
        started_at: form.started_at || null,
        ended_at: form.ended_at || null,
        status: form.status,
        visibility: form.visibility
      };

      if (editingId === null) {
        const created = await api.createPatientMedicalHistory(token, payload);
        setEntries((prev) => [created, ...prev]);
      } else {
        const updated = await api.updatePatientMedicalHistory(token, editingId, payload);
        setEntries((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      }

      setShowModal(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!token) {
      return;
    }
    await api.deletePatientMedicalHistory(token, id);
    setEntries((prev) => prev.filter((item) => item.id !== id));
  };

  const togglePrescriptionDetails = (historyId: number) => {
    setExpandedPrescriptionByHistoryId((prev) => ({
      ...prev,
      [historyId]: !prev[historyId]
    }));
  };

  const toggleRehabDetails = (historyId: number) => {
    setExpandedRehabByHistoryId((prev) => ({
      ...prev,
      [historyId]: !prev[historyId]
    }));
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient" />
          </IonButtons>
          <IonTitle>Historique medical</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />

        <IonCard className="surface-card">
          <IonCardContent>
            <h2 style={{ marginTop: 0 }}>Historique medical</h2>
            <IonText color="medium">{filteredEntries.length} entree(s)</IonText>

            {filteredEntries.length === 0 ? (
              <div style={{ minHeight: '220px', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                <div>
                  <IonIcon icon={medicalOutline} style={{ fontSize: '56px', color: '#64748b' }} />
                  <h3 style={{ marginBottom: 4 }}>Aucune entree</h3>
                  <IonText color="medium">Utilisez le bouton + pour ajouter un element.</IonText>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '8px', display: 'grid', gap: '12px' }}>
                {pagedEntries.map((entry) => (
                  <IonCard
                    key={entry.id}
                    className="surface-card"
                    style={{
                      margin: 0,
                      border: '1px solid #d1e1ec',
                      borderLeft: '4px solid #8fb3c9',
                      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)'
                    }}
                  >
                    <IonCardContent>
                      <p style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#0f172a' }}>
                        Reference medicale: {getMedicalHistoryCode(entry)}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <h3 style={{ margin: '6px 0 2px 0' }}>{entry.title}</h3>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {!entry.can_edit_by_patient ? <IonBadge color="medium">Verrouille (docteur)</IonBadge> : null}
                          <IonBadge color={statusColor[entry.status]}>{statusLabel[entry.status]}</IonBadge>
                        </div>
                      </div>
                      <p style={{ margin: '2px 0' }}>{typeLabel[entry.type]} · {visibilityLabel[entry.visibility]}</p>
                      <p style={{ margin: '2px 0' }}>
                        Cree par: {entry.doctor_name ? `Dr. ${entry.doctor_name}` : 'Patient'}
                      </p>
                      <p style={{ margin: '2px 0' }}>
                        Debut: {entry.started_at ? formatDateHaiti(entry.started_at) : 'Non precise'} · Fin:{' '}
                        {entry.ended_at ? formatDateHaiti(entry.ended_at) : 'Non precise'}
                      </p>
                      {entry.details ? <p style={{ margin: '2px 0' }}>{entry.details}</p> : null}
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
                              onClick={() => togglePrescriptionDetails(entry.id)}
                            >
                              {expandedPrescriptionByHistoryId[entry.id] ? 'Masquer details' : 'Voir details'}
                            </IonButton>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                            {(entry.linked_prescriptions && entry.linked_prescriptions.length > 0)
                              ? entry.linked_prescriptions.map((rx) => (
                                  <IonBadge key={`mh-rx-${entry.id}-${rx.id}`} color="light">
                                    {rx.print_code ?? `#${rx.id}`}
                                  </IonBadge>
                                ))
                              : (
                                  <IonBadge color="light">
                                    {entry.prescription_print_code ?? `#${entry.prescription_id}`}
                                  </IonBadge>
                                )}
                          </div>
                          {expandedPrescriptionByHistoryId[entry.id] ? (
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
                                const linkedRows = prescriptions.filter((rx) => linkedIds.includes(rx.id));
                                if (linkedRows.length === 0) {
                                  return <IonText color="medium">Details ordonnance indisponibles.</IonText>;
                                }
                                return (
                                  <div style={{ display: 'grid', gap: '8px' }}>
                                    {linkedRows.map((row) => (
                                      <div key={`mh-rx-details-${entry.id}-${row.id}`} style={{ borderTop: '1px solid #dbe7ef', paddingTop: '6px' }}>
                                        <p style={{ margin: '0 0 4px 0' }}>
                                          <strong>{row.print_code ?? `#${row.id}`}</strong>
                                        </p>
                                        <div style={{ display: 'grid', gap: '4px' }}>
                                          {row.medicine_requests.map((med) => (
                                            <p key={`mh-rx-med-${entry.id}-${row.id}-${med.id}`} style={{ margin: 0 }}>
                                              <strong>{med.name}</strong> · {med.form || 'N/D'} · {med.strength || 'N/D'} · Qte: {med.quantity ?? 1}
                                            </p>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
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
                            <IonButton size="small" fill="outline" onClick={() => toggleRehabDetails(entry.id)}>
                              {expandedRehabByHistoryId[entry.id] ? 'Masquer details' : 'Afficher details'}
                            </IonButton>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                            {entry.linked_rehab_entries.map((rehab) => (
                              <IonBadge key={`mh-rehab-${entry.id}-${rehab.id}`} color="tertiary">
                                {rehab.reference}
                              </IonBadge>
                            ))}
                          </div>
                          {expandedRehabByHistoryId[entry.id] ? (
                            <div
                              style={{
                                marginTop: '8px',
                                borderTop: '1px solid var(--ion-color-light-shade)',
                                paddingTop: '8px',
                                display: 'grid',
                                gap: '8px'
                              }}
                            >
                              {entry.linked_rehab_entries.map((rehab) => (
                                <div key={`mh-rehab-details-${entry.id}-${rehab.id}`} style={{ marginBottom: '8px' }}>
                                  <p style={{ margin: '0 0 4px 0' }}>
                                    <strong>{rehab.reference}</strong>
                                    {' · '}
                                    {rehab.follow_up_date
                                      ? formatDateHaiti(rehab.follow_up_date)
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
                                    Suivi: {rehab.follow_up_date ? formatDateHaiti(rehab.follow_up_date) : 'N/D'}
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
                      <p style={{ margin: '2px 0' }}>Mise a jour: {formatDateTime(entry.updated_at)}</p>
                      {entry.can_edit_by_patient ? (
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: '4px' }}>
                          <IonButton fill="clear" color="danger" onClick={() => setDeleteTargetId(entry.id)}>
                            <IonIcon icon={trashOutline} />
                          </IonButton>
                          <IonButton fill="clear" onClick={() => startEdit(entry)}>
                            <IonIcon icon={createOutline} />
                          </IonButton>
                        </div>
                      ) : null}
                    </IonCardContent>
                  </IonCard>
                ))}
              </div>
            )}

            {filteredEntries.length > pageSize ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                <IonButton fill="outline" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                  Precedent
                </IonButton>
                <IonText color="medium">
                  Page {page} / {totalPages}
                </IonText>
                <IonButton
                  fill="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Suivant
                </IonButton>
              </div>
            ) : null}
          </IonCardContent>
        </IonCard>

        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonContent className="ion-padding app-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <IonIcon icon={medicalOutline} style={{ fontSize: '30px', color: '#0f766e' }} />
                <div>
                  <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>
                    {editingId === null ? 'Ajouter une entree' : 'Modifier une entree'}
                  </h1>
                  <IonText color="medium">Historique patient / famille</IonText>
                </div>
              </div>
              <IonButton
                fill="clear"
                color="medium"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                <IonIcon icon={closeOutline} />
              </IonButton>
            </div>

            <div style={{ height: '1px', background: '#cbd5e1', margin: '20px 0' }} />

            <IonItem lines="none">
              <IonLabel position="stacked">Type</IonLabel>
              <IonSelect
                value={form.type}
                onIonChange={(e) => setForm((prev) => ({ ...prev, type: e.detail.value as ApiMedicalHistoryEntry['type'] }))}
              >
                <IonSelectOption value="condition">Condition</IonSelectOption>
                <IonSelectOption value="allergy">Allergie</IonSelectOption>
                <IonSelectOption value="surgery">Chirurgie</IonSelectOption>
                <IonSelectOption value="hospitalization">Hospitalisation</IonSelectOption>
                <IonSelectOption value="medication">Traitement</IonSelectOption>
                <IonSelectOption value="note">Note</IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonItem lines="none" style={{ marginTop: '10px' }}>
              <IonLabel position="stacked">Titre *</IonLabel>
              <IonInput value={form.title} onIonInput={(e) => setForm((prev) => ({ ...prev, title: e.detail.value ?? '' }))} />
            </IonItem>

            <IonItem lines="none" style={{ marginTop: '10px' }}>
              <IonLabel position="stacked">Details</IonLabel>
              <IonTextarea
                autoGrow
                value={form.details}
                onIonInput={(e) => setForm((prev) => ({ ...prev, details: e.detail.value ?? '' }))}
              />
            </IonItem>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
              <IonItem lines="none">
                <IonLabel position="stacked">Debut</IonLabel>
                <IonInput
                  type="date"
                  value={form.started_at}
                  onIonInput={(e) => setForm((prev) => ({ ...prev, started_at: e.detail.value ?? '' }))}
                />
              </IonItem>
              <IonItem lines="none">
                <IonLabel position="stacked">Fin</IonLabel>
                <IonInput
                  type="date"
                  value={form.ended_at}
                  onIonInput={(e) => setForm((prev) => ({ ...prev, ended_at: e.detail.value ?? '' }))}
                />
              </IonItem>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
              <IonItem lines="none">
                <IonLabel position="stacked">Statut</IonLabel>
                <IonSelect
                  value={form.status}
                  onIonChange={(e) => setForm((prev) => ({ ...prev, status: e.detail.value as ApiMedicalHistoryEntry['status'] }))}
                >
                  <IonSelectOption value="active">Actif</IonSelectOption>
                  <IonSelectOption value="resolved">Resolue</IonSelectOption>
                </IonSelect>
              </IonItem>
              <IonItem lines="none">
                <IonLabel position="stacked">Visibilite</IonLabel>
                <IonSelect
                  value={form.visibility}
                  onIonChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      visibility: e.detail.value as Extract<ApiMedicalHistoryEntry['visibility'], 'shared' | 'patient_only'>
                    }))
                  }
                >
                  <IonSelectOption value="shared">Partage</IonSelectOption>
                  <IonSelectOption value="patient_only">Patient seulement</IonSelectOption>
                </IonSelect>
              </IonItem>
            </div>

            <IonButton expand="block" style={{ marginTop: '20px' }} onClick={() => upsert().catch(() => undefined)} disabled={saving}>
              {editingId === null ? 'Ajouter' : 'Mettre a jour'}
            </IonButton>
            <IonButton
              expand="block"
              fill="outline"
              color="medium"
              onClick={() => {
                setShowModal(false);
                resetForm();
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
              resetForm();
              setShowModal(true);
            }}
          >
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>

        <IonAlert
          isOpen={deleteTargetId !== null}
          header="Supprimer cette entree ?"
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
                  remove(id).catch(() => undefined);
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

export default PatientMedicalHistoryPage;

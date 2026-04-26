import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonDatetime,
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
  IonTitle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import { calendarOutline, chevronDownOutline, chevronUpOutline, closeOutline, documentTextOutline, personOutline, pulseOutline, timeOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { useIonRouter } from '@ionic/react';
import { useParams } from 'react-router';
import AppointmentFormModal from '../components/AppointmentFormModal';
import InstallBanner from '../components/InstallBanner';
import { api, type ApiSecretaryPatientDetail } from '../services/api';
import { useAuth } from '../state/AuthState';
import { formatDateTime } from '../utils/time';

type RouteParams = {
  patientId: string;
};

type VitalSignEntry = {
  id: string;
  recorded_at: string;
  systolic: number | null;
  diastolic: number | null;
  heart_rate: number | null;
  temperature_c: number | null;
  spo2: number | null;
  glucose_mg_dl: number | null;
  weight_kg: number | null;
  note: string | null;
};

type SecretaryAppointmentEntry = {
  id: string;
  patient_id: number;
  created_by_secretary_id: number | null;
  doctor_user_id: number;
  doctor_name: string;
  scheduled_at: string;
  note: string | null;
  created_at: string;
};

const SecretaryPatientDetailPage: React.FC = () => {
  const ionRouter = useIonRouter();
  const { token, user } = useAuth();
  const { patientId } = useParams<RouteParams>();
  const [patient, setPatient] = useState<ApiSecretaryPatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [vitalsVersion, setVitalsVersion] = useState(0);
  const [isVitalModalOpen, setIsVitalModalOpen] = useState(false);
  const [editingVitalId, setEditingVitalId] = useState<string | null>(null);
  const [isProfileCollapsed, setIsProfileCollapsed] = useState(false);
  const [isVitalsCollapsed, setIsVitalsCollapsed] = useState(true);
  const [isAppointmentsCollapsed, setIsAppointmentsCollapsed] = useState(true);
  const [isVisitsCollapsed, setIsVisitsCollapsed] = useState(true);
  const [appointmentsVersion, setAppointmentsVersion] = useState(0);
  const [relatedDoctors, setRelatedDoctors] = useState<Array<{ id: number; name: string }>>([]);
  const [showAddAppointmentModal, setShowAddAppointmentModal] = useState(false);
  const [addAppointmentError, setAddAppointmentError] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scheduledTime, setScheduledTime] = useState(() => new Date().toISOString().slice(11, 16));
  const [addAppointmentForm, setAddAppointmentForm] = useState({
    doctor_user_id: '',
    note: '',
  });
  const [vitalForm, setVitalForm] = useState({
    recorded_at: '',
    systolic: '',
    diastolic: '',
    heart_rate: '',
    temperature_c: '',
    spo2: '',
    glucose_mg_dl: '',
    weight_kg: '',
    note: '',
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    if (!token) {
      setPatient(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    api.getSecretaryPatientDetail(token, Number(patientId))
      .then((row) => {
        if (!active) {
          return;
        }
        setPatient(row);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setPatient(null);
      })
      .finally(() => {
        if (!active) {
          return;
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [patientId, token]);

  useEffect(() => {
    let active = true;
    if (!token) {
      setRelatedDoctors([]);
      return () => {
        active = false;
      };
    }

    api.getSecretaryAccessRequests(token)
      .then((rows) => {
        if (!active) {
          return;
        }
        const doctorMap = new Map<number, string>();
        rows.forEach((row) => {
          if (row.status === 'approved' && Number.isFinite(row.doctor_id) && row.doctor_name) {
            doctorMap.set(row.doctor_id, row.doctor_name);
          }
        });
        setRelatedDoctors(
          Array.from(doctorMap.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
        );
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setRelatedDoctors([]);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const vitalSignEntries = useMemo(() => {
    if (!patient) {
      return [] as VitalSignEntry[];
    }
    const storageKey = `patient-vitals-${patient.id}`;
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return [] as VitalSignEntry[];
    }
    try {
      const parsed = JSON.parse(raw) as VitalSignEntry[];
      if (!Array.isArray(parsed)) {
        return [] as VitalSignEntry[];
      }
      return [...parsed].sort(
        (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
      );
    } catch {
      return [] as VitalSignEntry[];
    }
  }, [patient, vitalsVersion]);
  const latestVitalSign = vitalSignEntries[0] ?? null;
  const appointmentEntries = useMemo(() => {
    if (!patient) {
      return [] as SecretaryAppointmentEntry[];
    }
    const storageKey = `secretary-appointments-${patient.id}`;
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return [] as SecretaryAppointmentEntry[];
    }
    try {
      const parsed = JSON.parse(raw) as SecretaryAppointmentEntry[];
      if (!Array.isArray(parsed)) {
        return [] as SecretaryAppointmentEntry[];
      }
      const filtered = parsed.filter((entry) => {
        if (!user?.id) {
          return true;
        }
        return entry.created_by_secretary_id === user.id;
      });
      return [...filtered].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    } catch {
      return [] as SecretaryAppointmentEntry[];
    }
  }, [appointmentsVersion, patient, user?.id]);

  useIonViewWillEnter(() => {
    setAppointmentsVersion((prev) => prev + 1);
  });

  const handleOpenAddAppointmentModal = () => {
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    const nextDate = localNow.toISOString().slice(0, 10);
    const nextTime = localNow.toISOString().slice(11, 16);
    setScheduledDate(nextDate);
    setScheduledTime(nextTime);
    setAddAppointmentForm({
      doctor_user_id: relatedDoctors[0] ? String(relatedDoctors[0].id) : '',
      note: '',
    });
    setAddAppointmentError(null);
    setShowAddAppointmentModal(true);
  };

  const handleSaveAddedAppointment = () => {
    if (!patient) {
      setAddAppointmentError('Patient introuvable.');
      return;
    }
    const doctorId = Number(addAppointmentForm.doctor_user_id);
    if (!Number.isFinite(doctorId) || doctorId <= 0) {
      setAddAppointmentError('Selectionnez un medecin.');
      return;
    }
    if (!scheduledDate || !scheduledTime) {
      setAddAppointmentError('Date et heure requises.');
      return;
    }
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
    if (Number.isNaN(new Date(scheduledAt).getTime())) {
      setAddAppointmentError('Date/heure invalide.');
      return;
    }

    const doctorName = relatedDoctors.find((row) => row.id === doctorId)?.name ?? `Docteur #${doctorId}`;
    const next: SecretaryAppointmentEntry = {
      id: `rdv-${Date.now()}`,
      patient_id: patient.id,
      created_by_secretary_id: user?.id ?? null,
      doctor_user_id: doctorId,
      doctor_name: doctorName,
      scheduled_at: scheduledAt,
      note: addAppointmentForm.note.trim() || null,
      created_at: new Date().toISOString(),
    };

    const key = `secretary-appointments-${patient.id}`;
    let existing: SecretaryAppointmentEntry[] = [];
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as SecretaryAppointmentEntry[];
        if (Array.isArray(parsed)) {
          existing = parsed;
        }
      } catch {
        existing = [];
      }
    }
    localStorage.setItem(key, JSON.stringify([...existing, next]));
    setShowAddAppointmentModal(false);
    setAddAppointmentError(null);
    setAppointmentsVersion((prev) => prev + 1);
  };

  const handleOpenAddVitalModal = () => {
    const now = new Date();
    const isoLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setEditingVitalId(null);
    setVitalForm({
      recorded_at: isoLocal,
      systolic: '',
      diastolic: '',
      heart_rate: '',
      temperature_c: '',
      spo2: '',
      glucose_mg_dl: '',
      weight_kg: '',
      note: '',
    });
    setIsVitalModalOpen(true);
  };

  const toInputDateTime = (value: string) => {
    if (!value) {
      return '';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }
    return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const handleOpenEditVitalModal = (entry: VitalSignEntry) => {
    setEditingVitalId(entry.id);
    setVitalForm({
      recorded_at: toInputDateTime(entry.recorded_at),
      systolic: entry.systolic != null ? String(entry.systolic) : '',
      diastolic: entry.diastolic != null ? String(entry.diastolic) : '',
      heart_rate: entry.heart_rate != null ? String(entry.heart_rate) : '',
      temperature_c: entry.temperature_c != null ? String(entry.temperature_c) : '',
      spo2: entry.spo2 != null ? String(entry.spo2) : '',
      glucose_mg_dl: entry.glucose_mg_dl != null ? String(entry.glucose_mg_dl) : '',
      weight_kg: entry.weight_kg != null ? String(entry.weight_kg) : '',
      note: entry.note ?? '',
    });
    setIsVitalModalOpen(true);
  };

  const handleSaveVital = () => {
    if (!patient) {
      return;
    }
    const storageKey = `patient-vitals-${patient.id}`;
    const raw = localStorage.getItem(storageKey);
    let existing: VitalSignEntry[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as VitalSignEntry[];
        if (Array.isArray(parsed)) {
          existing = parsed;
        }
      } catch {
        existing = [];
      }
    }

    const toNullableNumber = (value: string) => {
      if (!value || !value.trim()) {
        return null;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const nextEntry: VitalSignEntry = {
      id: editingVitalId ?? `vs-${Date.now()}`,
      recorded_at: vitalForm.recorded_at || new Date().toISOString(),
      systolic: toNullableNumber(vitalForm.systolic),
      diastolic: toNullableNumber(vitalForm.diastolic),
      heart_rate: toNullableNumber(vitalForm.heart_rate),
      temperature_c: toNullableNumber(vitalForm.temperature_c),
      spo2: toNullableNumber(vitalForm.spo2),
      glucose_mg_dl: toNullableNumber(vitalForm.glucose_mg_dl),
      weight_kg: toNullableNumber(vitalForm.weight_kg),
      note: vitalForm.note?.trim() || null,
    };

    const nextList = editingVitalId
      ? existing.map((row) => (row.id === editingVitalId ? nextEntry : row))
      : [nextEntry, ...existing];

    localStorage.setItem(storageKey, JSON.stringify(nextList));
    setIsVitalModalOpen(false);
    setEditingVitalId(null);
    setVitalsVersion((prev) => prev + 1);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/secretaire/patients" />
          </IonButtons>
          <IonTitle>Detail patient</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardContent>
            {loading ? (
              <IonText color="medium">
                <p>Chargement...</p>
              </IonText>
            ) : !patient ? (
              <IonText color="danger">
                <p>Patient introuvable.</p>
              </IonText>
            ) : (
              <>
                <IonCard className="surface-card" style={{ margin: 0 }}>
                  <IonCardHeader>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IonIcon icon={personOutline} /> Profil patient
                      </IonCardTitle>
                      <IonButton fill="clear" size="small" onClick={() => setIsProfileCollapsed((prev) => !prev)}>
                        <IonIcon icon={isProfileCollapsed ? chevronDownOutline : chevronUpOutline} />
                      </IonButton>
                    </div>
                  </IonCardHeader>
                  {!isProfileCollapsed ? (
                    <IonCardContent>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div
                          style={{
                            border: '1px solid var(--ion-color-light-shade)',
                            borderRadius: '12px',
                            padding: '10px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px'
                          }}
                        >
                        <div
                          style={{ display: 'contents' }}
                        >
                          {patient.profile_photo_url ? (
                            <img
                              src={patient.profile_photo_url}
                              alt={patient.name}
                              style={{
                                width: '42px',
                                height: '42px',
                                objectFit: 'cover',
                                borderRadius: '50%',
                                border: '1px solid #dbe7ef'
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '50%',
                                display: 'grid',
                                placeItems: 'center',
                                background: '#dbeafe',
                                color: '#1e40af'
                              }}
                            >
                              <IonIcon icon={personOutline} />
                            </div>
                          )}
                        </div>
                          <div>
                            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{patient.name}</h2>
                            <p style={{ margin: '4px 0 0 0', fontSize: '1rem' }}>{patient.phone || 'Telephone: N/D'}</p>
                            <p style={{ margin: '2px 0 0 0', fontSize: '1rem' }}>{patient.whatsapp || 'WhatsApp: N/D'}</p>
                          </div>
                        </div>

                      </div>
                    </IonCardContent>
                  ) : null}
                </IonCard>

                <IonCard className="surface-card" style={{ marginTop: '10px' }}>
                  <IonCardHeader>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IonIcon icon={calendarOutline} />
                        Rendez-vous ({appointmentEntries.length})
                      </IonCardTitle>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        <IonButton
                          size="small"
                          onClick={handleOpenAddAppointmentModal}
                        >
                          Ajouter
                        </IonButton>
                        <IonButton fill="clear" size="small" onClick={() => setIsAppointmentsCollapsed((prev) => !prev)}>
                          <IonIcon icon={isAppointmentsCollapsed ? chevronDownOutline : chevronUpOutline} />
                        </IonButton>
                      </div>
                    </div>
                  </IonCardHeader>
                  {!isAppointmentsCollapsed ? (
                    <IonCardContent>
                      {appointmentEntries.length === 0 ? (
                        <IonText color="medium">
                          <p>Aucun rendez-vous.</p>
                        </IonText>
                      ) : (
                        <IonList>
                          {appointmentEntries.map((appointment, index) => (
                            <IonItem
                              key={appointment.id}
                              button
                              detail
                              lines={index === appointmentEntries.length - 1 ? 'none' : 'full'}
                              style={{
                                border: '1px solid #d1e1ec',
                                borderLeft: '4px solid #8fb3c9',
                                borderRadius: '12px',
                                marginBottom: index === appointmentEntries.length - 1 ? '0' : '10px',
                                background: '#ffffff'
                              }}
                              onClick={() =>
                                ionRouter.push(
                                  `/secretaire/patients/${patient.id}/rendez-vous/${appointment.id}/edit?patient=${encodeURIComponent(patient.name)}`,
                                  'forward',
                                  'push'
                                )
                              }
                            >
                              <IonLabel>
                                <h3 style={{ marginBottom: '4px', fontSize: '1.05rem', fontWeight: 700 }}>
                                  {formatDateTime(appointment.scheduled_at)}
                                </h3>
                                <p>
                                  <strong>Medecin:</strong> {appointment.doctor_name}
                                </p>
                                {appointment.note ? (
                                  <p>
                                    <strong>Note:</strong> {appointment.note}
                                  </p>
                                ) : null}
                              </IonLabel>
                            </IonItem>
                          ))}
                        </IonList>
                      )}
                    </IonCardContent>
                  ) : null}
                </IonCard>

                <IonCard className="surface-card" style={{ marginTop: '10px' }}>
                  <IonCardHeader>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IonIcon icon={pulseOutline} />
                        Suivi des signes vitaux ({vitalSignEntries.length})
                      </IonCardTitle>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        <IonButton fill="clear" size="small" onClick={() => setIsVitalsCollapsed((prev) => !prev)}>
                          <IonIcon icon={isVitalsCollapsed ? chevronDownOutline : chevronUpOutline} />
                        </IonButton>
                        <IonButton size="small" onClick={handleOpenAddVitalModal}>
                          Ajouter
                        </IonButton>
                      </div>
                    </div>
                  </IonCardHeader>
                  {!isVitalsCollapsed ? (
                    <IonCardContent>
                      {vitalSignEntries.length === 0 ? (
                        <IonText color="medium">
                          <p>Aucune donnee de signes vitaux.</p>
                        </IonText>
                      ) : (
                        <IonList>
                          {vitalSignEntries.map((entry, index) => (
                            <IonItem
                              key={`${entry.id}-${index}`}
                              button
                              detail
                              onClick={() => handleOpenEditVitalModal(entry)}
                              lines={index === vitalSignEntries.length - 1 ? 'none' : 'full'}
                              style={{
                                border: '1px solid #d1e1ec',
                                borderLeft: '4px solid #8fb3c9',
                                borderRadius: '12px',
                                marginBottom: index === vitalSignEntries.length - 1 ? '0' : '10px',
                                background: '#ffffff'
                              }}
                            >
                              <IonLabel>
                                <h3 style={{ marginBottom: '4px', fontSize: '1.05rem', fontWeight: 700 }}>{formatDateTime(entry.recorded_at)}</h3>
                                <p>
                                  TA: {entry.systolic ?? '-'} / {entry.diastolic ?? '-'} mmHg • FC: {entry.heart_rate ?? '-'} bpm
                                </p>
                                <p>
                                  SpO2: {entry.spo2 ?? '-'}% • Temperature: {entry.temperature_c ?? '-'} C
                                </p>
                                <p>
                                  Glycemie: {entry.glucose_mg_dl ?? '-'} mg/dL • Poids: {entry.weight_kg ?? '-'} kg
                                </p>
                              </IonLabel>
                            </IonItem>
                          ))}
                        </IonList>
                      )}
                    </IonCardContent>
                  ) : null}
                </IonCard>

                <IonCard className="surface-card" style={{ marginTop: '10px' }}>
                  <IonCardHeader>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IonIcon icon={documentTextOutline} />
                        Visites ({patient.visits.length})
                      </IonCardTitle>
                      <IonButton fill="clear" size="small" onClick={() => setIsVisitsCollapsed((prev) => !prev)}>
                        <IonIcon icon={isVisitsCollapsed ? chevronDownOutline : chevronUpOutline} />
                      </IonButton>
                    </div>
                  </IonCardHeader>
                  {!isVisitsCollapsed ? (
                    <IonCardContent>
                      {patient.visits.length === 0 ? (
                        <IonText color="medium">
                          <p>Aucune visite.</p>
                        </IonText>
                      ) : (
                        <IonList>
                          {patient.visits.map((visit, index) => (
                            <IonItem
                              key={`visit-${visit.id}`}
                              lines={index === patient.visits.length - 1 ? 'none' : 'full'}
                              style={{
                                border: '1px solid #d1e1ec',
                                borderLeft: '4px solid #8fb3c9',
                                borderRadius: '12px',
                                marginBottom: index === patient.visits.length - 1 ? '0' : '10px',
                                background: '#ffffff'
                              }}
                            >
                              <IonLabel>
                                <h3 style={{ marginBottom: '4px', fontSize: '1.05rem', fontWeight: 700 }}>{visit.visit_code}</h3>
                                <p>{visit.visit_date ? formatDateTime(visit.visit_date) : 'Date non renseignee'}</p>
                                <p>{visit.visit_type || 'Consultation'} • {visit.doctor_name || 'Medecin non precise'}</p>
                              </IonLabel>
                            </IonItem>
                          ))}
                        </IonList>
                      )}
                    </IonCardContent>
                  ) : null}
                </IonCard>

                <AppointmentFormModal
                  isOpen={showAddAppointmentModal}
                  title="Ajouter rendez-vous"
                  patientField={{
                    mode: 'readonly',
                    label: patient.name,
                  }}
                  doctorField={{
                    mode: 'select',
                    value: addAppointmentForm.doctor_user_id,
                    options: relatedDoctors.map((doctor) => ({ value: String(doctor.id), label: doctor.name })),
                    onChange: (value) => setAddAppointmentForm((prev) => ({ ...prev, doctor_user_id: value })),
                    placeholder: 'Selectionner un medecin',
                  }}
                  scheduledDate={scheduledDate}
                  scheduledTime={scheduledTime}
                  onScheduledDateChange={setScheduledDate}
                  onScheduledTimeChange={setScheduledTime}
                  note={addAppointmentForm.note}
                  onNoteChange={(value) => setAddAppointmentForm((prev) => ({ ...prev, note: value }))}
                  onSubmit={handleSaveAddedAppointment}
                  onClose={() => {
                    setShowAddAppointmentModal(false);
                    setAddAppointmentError(null);
                  }}
                  errorMessage={addAppointmentError}
                />

                <IonModal isOpen={isVitalModalOpen} onDidDismiss={() => setIsVitalModalOpen(false)}>
                  <IonHeader>
                    <IonToolbar>
                      <IonTitle>{editingVitalId ? 'Modifier signes vitaux' : 'Ajouter signes vitaux'}</IonTitle>
                      <IonButtons slot="end">
                        <IonButton
                          fill="clear"
                          onClick={() => {
                            setIsVitalModalOpen(false);
                            setEditingVitalId(null);
                          }}
                        >
                          <IonIcon icon={closeOutline} />
                        </IonButton>
                      </IonButtons>
                    </IonToolbar>
                  </IonHeader>
                  <IonContent className="ion-padding">
                    <IonCard className="surface-card" style={{ margin: 0, marginBottom: '10px' }}>
                      <IonCardHeader>
                        <IonCardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <IonIcon icon={pulseOutline} />
                          Apercu rapide
                        </IonCardTitle>
                      </IonCardHeader>
                      <IonCardContent>
                        {latestVitalSign ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                            <p style={{ margin: 0 }}>
                              <strong>Derniere tension:</strong> {latestVitalSign.systolic ?? '-'} / {latestVitalSign.diastolic ?? '-'}
                            </p>
                            <p style={{ margin: 0 }}>
                              <strong>Pouls:</strong> {latestVitalSign.heart_rate ?? '-'} bpm
                            </p>
                            <p style={{ margin: 0 }}>
                              <strong>Temperature:</strong> {latestVitalSign.temperature_c ?? '-'} C
                            </p>
                            <p style={{ margin: 0 }}>
                              <strong>SpO2:</strong> {latestVitalSign.spo2 ?? '-'} %
                            </p>
                          </div>
                        ) : (
                          <IonText color="medium">
                            <p style={{ margin: 0 }}>Aucune mesure pour le moment.</p>
                          </IonText>
                        )}
                      </IonCardContent>
                    </IonCard>

                    <IonCard className="surface-card" style={{ margin: 0 }}>
                      <IonCardHeader>
                        <IonCardTitle>Nouvelle mesure</IonCardTitle>
                      </IonCardHeader>
                      <IonCardContent>
                        <IonItem>
                          <IonLabel position="stacked">Date et heure</IonLabel>
                          <IonInput
                            type="datetime-local"
                            value={vitalForm.recorded_at}
                            onIonInput={(event) =>
                              setVitalForm((prev) => ({ ...prev, recorded_at: String(event.detail.value ?? '') }))
                            }
                          />
                        </IonItem>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginTop: '8px' }}>
                          <IonItem>
                            <IonLabel position="stacked">Systolique</IonLabel>
                            <IonInput
                              value={vitalForm.systolic}
                              onIonInput={(event) =>
                                setVitalForm((prev) => ({ ...prev, systolic: String(event.detail.value ?? '') }))
                              }
                            />
                          </IonItem>
                          <IonItem>
                            <IonLabel position="stacked">Diastolique</IonLabel>
                            <IonInput
                              value={vitalForm.diastolic}
                              onIonInput={(event) =>
                                setVitalForm((prev) => ({ ...prev, diastolic: String(event.detail.value ?? '') }))
                              }
                            />
                          </IonItem>
                          <IonItem>
                            <IonLabel position="stacked">Frequence cardiaque</IonLabel>
                            <IonInput
                              value={vitalForm.heart_rate}
                              onIonInput={(event) =>
                                setVitalForm((prev) => ({ ...prev, heart_rate: String(event.detail.value ?? '') }))
                              }
                            />
                          </IonItem>
                          <IonItem>
                            <IonLabel position="stacked">Temperature (C)</IonLabel>
                            <IonInput
                              value={vitalForm.temperature_c}
                              onIonInput={(event) =>
                                setVitalForm((prev) => ({ ...prev, temperature_c: String(event.detail.value ?? '') }))
                              }
                            />
                          </IonItem>
                          <IonItem>
                            <IonLabel position="stacked">SpO2 (%)</IonLabel>
                            <IonInput
                              value={vitalForm.spo2}
                              onIonInput={(event) =>
                                setVitalForm((prev) => ({ ...prev, spo2: String(event.detail.value ?? '') }))
                              }
                            />
                          </IonItem>
                          <IonItem>
                            <IonLabel position="stacked">Glycemie (mg/dL)</IonLabel>
                            <IonInput
                              value={vitalForm.glucose_mg_dl}
                              onIonInput={(event) =>
                                setVitalForm((prev) => ({ ...prev, glucose_mg_dl: String(event.detail.value ?? '') }))
                              }
                            />
                          </IonItem>
                          <IonItem>
                            <IonLabel position="stacked">Poids (kg)</IonLabel>
                            <IonInput
                              value={vitalForm.weight_kg}
                              onIonInput={(event) =>
                                setVitalForm((prev) => ({ ...prev, weight_kg: String(event.detail.value ?? '') }))
                              }
                            />
                          </IonItem>
                        </div>
                        <IonItem style={{ marginTop: '8px' }}>
                          <IonLabel position="stacked">Note</IonLabel>
                          <IonTextarea
                            autoGrow
                            value={vitalForm.note}
                            onIonInput={(event) =>
                              setVitalForm((prev) => ({ ...prev, note: String(event.detail.value ?? '') }))
                            }
                          />
                        </IonItem>
                      </IonCardContent>
                    </IonCard>
                    <div
                      style={{
                        position: 'sticky',
                        bottom: '-16px',
                        background: '#f0f6fa',
                        borderTop: '1px solid #dbe7ef',
                        padding: '8px',
                        boxShadow: '0 -4px 12px rgba(15, 23, 42, 0.06)',
                        zIndex: 1,
                        marginTop: '10px'
                      }}
                    >
                      <IonButton expand="block" onClick={handleSaveVital}>
                        {editingVitalId ? 'Mettre a jour' : 'Enregistrer'}
                      </IonButton>
                      <IonButton
                        expand="block"
                        color="dark"
                        onClick={() => {
                          setIsVitalModalOpen(false);
                          setEditingVitalId(null);
                        }}
                      >
                        Annuler
                      </IonButton>
                    </div>
                  </IonContent>
                </IonModal>
              </>
            )}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default SecretaryPatientDetailPage;

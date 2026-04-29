import {
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
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSearchbar,
  IonText,
  IonTitle,
  IonToolbar,
  useIonRouter,
  useIonViewWillEnter,
} from '@ionic/react';
import { addOutline } from 'ionicons/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import AppointmentFormModal from '../components/AppointmentFormModal';
import InstallBanner from '../components/InstallBanner';
import { api, type ApiAppointment, type ApiDoctorPatient } from '../services/api';
import { useAuth } from '../state/AuthState';
import { formatDateTime } from '../utils/time';

type AppointmentStatus = 'overdue' | 'soon' | 'upcoming';

const DAY_KEY_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
};

const getAppointmentStatus = (scheduledAt: string): AppointmentStatus => {
  const target = new Date(scheduledAt).getTime();
  const now = Date.now();
  if (target < now) {
    return 'overdue';
  }
  if (target - now <= 30 * 60 * 1000) {
    return 'soon';
  }
  return 'upcoming';
};

const getStatusUi = (status: AppointmentStatus) => {
  if (status === 'overdue') {
    return { label: 'Passe', color: 'warning', border: '#f59e0b' };
  }
  if (status === 'soon') {
    return { label: 'Bientot', color: 'primary', border: '#3b82f6' };
  }
  return { label: 'A venir', color: 'success', border: '#22c55e' };
};

const getDayKey = (value: string) => {
  return new Date(value).toLocaleDateString('fr-FR', DAY_KEY_OPTIONS);
};

const formatDayHeading = (value: string) => {
  return new Date(value).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const SecretaryAppointmentsPage: React.FC = () => {
  const { token } = useAuth();
  const ionRouter = useIonRouter();
  const location = useLocation();
  const { patientId: routePatientId } = useParams<{ patientId?: string }>();
  const [query, setQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<'all' | 'past' | 'upcoming'>('all');
  const [patients, setPatients] = useState<ApiDoctorPatient[]>([]);
  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
  const [relatedDoctors, setRelatedDoctors] = useState<Array<{ id: number; name: string }>>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scheduledTime, setScheduledTime] = useState(() => new Date().toISOString().slice(11, 16));
  const [addForm, setAddForm] = useState({
    patient_id: '',
    doctor_user_id: '',
    note: '',
  });
  const hasAutoOpenedModal = useRef(false);
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const preselectedPatientId = useMemo(() => {
    const raw = queryParams.get('patientId') ?? routePatientId ?? '';
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [queryParams, routePatientId]);
  const shouldOpenAddModalFromRoute = useMemo(() => {
    return location.pathname.includes('/rendez-vous/new') || preselectedPatientId !== null;
  }, [location.pathname, preselectedPatientId]);

  const loadData = useCallback(async () => {
    if (!token) {
      setPatients([]);
      setAppointments([]);
      setRelatedDoctors([]);
      return;
    }

    const [patientRows, accessRows] = await Promise.all([
      api.getSecretaryPatients(token).catch(() => []),
      api.getSecretaryAccessRequests(token).catch(() => [])
    ]);
    setPatients(patientRows);
    const relatedDoctorIds = new Set(
      accessRows
        .filter((row) => row.status === 'approved' && Number.isFinite(row.doctor_id))
        .map((row) => row.doctor_id)
    );
    const doctorMap = new Map<number, string>();
    accessRows.forEach((row) => {
      if (row.status === 'approved' && Number.isFinite(row.doctor_id) && row.doctor_name) {
        doctorMap.set(row.doctor_id, row.doctor_name);
      }
    });
    setRelatedDoctors(
      Array.from(doctorMap.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
    );

    const rows = await api.getSecretaryAppointments(token).catch(() => [] as ApiAppointment[]);
    const filtered = rows.filter((entry) => relatedDoctorIds.has(entry.doctor_user_id));
    setAppointments(filtered.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()));
  }, [token]);

  useIonViewWillEnter(() => {
    void loadData();
  });

  const patientNameById = useMemo(() => {
    const map = new Map<number, string>();
    patients.forEach((patient) => {
      map.set(patient.id, patient.name);
    });
    return map;
  }, [patients]);

  const doctorFilters = useMemo(() => {
    const names = Array.from(
      new Set(
        appointments
          .map((entry) => entry.doctor_name ?? '')
          .filter((name): name is string => name.trim().length > 0)
      )
    );
    return names.sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [appointments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();
    return appointments.filter((entry) => {
      if (selectedDoctor !== 'all' && entry.doctor_name !== selectedDoctor) {
        return false;
      }
      const isPast = new Date(entry.scheduled_at).getTime() < now;
      if (selectedTimeFilter === 'past' && !isPast) {
        return false;
      }
      if (selectedTimeFilter === 'upcoming' && isPast) {
        return false;
      }
      if (!q) {
        return true;
      }
      const patientName = patientNameById.get(entry.patient_id) ?? 'Patient';
      return `${patientName} ${entry.doctor_name} ${entry.note ?? ''}`.toLowerCase().includes(q);
    });
  }, [appointments, patientNameById, query, selectedDoctor, selectedTimeFilter]);

  const summary = useMemo(() => {
    const now = Date.now();
    const dayKey = new Date().toLocaleDateString('fr-FR', DAY_KEY_OPTIONS);
    const scoped = appointments.filter((entry) => selectedDoctor === 'all' || entry.doctor_name === selectedDoctor);
    const todayCount = scoped.filter((entry) => getDayKey(entry.scheduled_at) === dayKey).length;
    const overdueCount = scoped.filter((entry) => new Date(entry.scheduled_at).getTime() < now).length;
    const next24hCount = scoped.filter((entry) => {
      const target = new Date(entry.scheduled_at).getTime();
      return target >= now && target <= now + 24 * 60 * 60 * 1000;
    }).length;
    return { todayCount, overdueCount, next24hCount };
  }, [appointments, selectedDoctor]);

  const groupedAppointments = useMemo(() => {
    const groups = new Map<string, ApiAppointment[]>();
    filtered.forEach((entry) => {
      const key = getDayKey(entry.scheduled_at);
      const existing = groups.get(key) ?? [];
      existing.push(entry);
      groups.set(key, existing);
    });
    return Array.from(groups.entries())
      .sort((a, b) => new Date(a[1][0].scheduled_at).getTime() - new Date(b[1][0].scheduled_at).getTime())
      .map(([key, items]) => ({ key, title: formatDayHeading(items[0].scheduled_at), items }));
  }, [filtered]);

  const openAddModal = useCallback((patientIdToPrefill?: number | null) => {
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    const nextDate = localNow.toISOString().slice(0, 10);
    const nextTime = localNow.toISOString().slice(11, 16);
    setScheduledDate(nextDate);
    setScheduledTime(nextTime);
    setAddForm({
      patient_id: patientIdToPrefill ? String(patientIdToPrefill) : '',
      doctor_user_id: relatedDoctors[0] ? String(relatedDoctors[0].id) : '',
      note: '',
    });
    setAddError(null);
    setShowAddModal(true);
  }, [relatedDoctors]);

  useEffect(() => {
    if (!shouldOpenAddModalFromRoute || hasAutoOpenedModal.current || !token) {
      return;
    }
    hasAutoOpenedModal.current = true;
    openAddModal(preselectedPatientId);
  }, [openAddModal, preselectedPatientId, shouldOpenAddModalFromRoute, token]);

  const saveAddedAppointment = useCallback(() => {
    const patientId = Number(addForm.patient_id);
    const doctorId = Number(addForm.doctor_user_id);
    if (!Number.isFinite(patientId) || patientId <= 0) {
      setAddError('Selectionnez un patient.');
      return;
    }
    if (!Number.isFinite(doctorId) || doctorId <= 0) {
      setAddError('Selectionnez un medecin.');
      return;
    }
    if (!scheduledDate || !scheduledTime) {
      setAddError('Date et heure requises.');
      return;
    }

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
    if (Number.isNaN(new Date(scheduledAt).getTime())) {
      setAddError('Date/heure invalide.');
      return;
    }

    if (!token) {
      setAddError('Session invalide.');
      return;
    }

    api.createSecretaryAppointment(token, {
      patient_id: patientId,
      doctor_user_id: doctorId,
      scheduled_at: scheduledAt,
      note: addForm.note.trim() || null,
    }).then(() => {
    setShowAddModal(false);
      setAddError(null);
      void loadData();
    }).catch((error: unknown) => {
      setAddError(error instanceof Error ? error.message : "Impossible d'ajouter ce rendez-vous.");
    });
  }, [addForm, loadData, scheduledDate, scheduledTime, token]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/secretaire" />
          </IonButtons>
          <IonTitle>Rendez-vous</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardContent>
            <IonSearchbar
              value={query}
              placeholder="Rechercher patient, medecin ou note..."
              onIonInput={(event) => setQuery(event.detail.value ?? '')}
            />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '8px',
                marginTop: '8px',
                marginBottom: '4px',
              }}
            >
              <div style={{ border: '1px solid #dbe7ef', borderRadius: '10px', padding: '8px' }}>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>Aujourd&apos;hui</p>
                <p style={{ margin: '2px 0 0 0', fontWeight: 700 }}>{summary.todayCount}</p>
              </div>
              <div style={{ border: '1px solid #dbe7ef', borderRadius: '10px', padding: '8px' }}>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>Passe</p>
                <p style={{ margin: '2px 0 0 0', fontWeight: 700 }}>{summary.overdueCount}</p>
              </div>
              <div style={{ border: '1px solid #dbe7ef', borderRadius: '10px', padding: '8px' }}>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>A venir (24h)</p>
                <p style={{ margin: '2px 0 0 0', fontWeight: 700 }}>{summary.next24hCount}</p>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '6px',
                marginTop: '6px',
              }}
            >
              <IonButton
                size="small"
                fill={selectedDoctor === 'all' ? 'solid' : 'outline'}
                onClick={() => setSelectedDoctor('all')}
                style={{ whiteSpace: 'nowrap' }}
              >
                Tous
              </IonButton>
              {doctorFilters.map((doctorName) => (
                <IonButton
                  key={doctorName}
                  size="small"
                  fill={selectedDoctor === doctorName ? 'solid' : 'outline'}
                  onClick={() => setSelectedDoctor(doctorName ?? '')}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {doctorName}
                </IonButton>
              ))}
            </div>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '6px',
                marginTop: '6px',
              }}
            >
              <IonButton
                size="small"
                fill={selectedTimeFilter === 'all' ? 'solid' : 'outline'}
                onClick={() => setSelectedTimeFilter('all')}
                style={{ whiteSpace: 'nowrap' }}
              >
                Tous
              </IonButton>
              <IonButton
                size="small"
                fill={selectedTimeFilter === 'upcoming' ? 'solid' : 'outline'}
                onClick={() => setSelectedTimeFilter('upcoming')}
                style={{ whiteSpace: 'nowrap' }}
              >
                A venirs
              </IonButton>
              <IonButton
                size="small"
                fill={selectedTimeFilter === 'past' ? 'solid' : 'outline'}
                onClick={() => setSelectedTimeFilter('past')}
                style={{ whiteSpace: 'nowrap' }}
              >
                Passés
              </IonButton>
            </div>
            {filtered.length === 0 ? (
              <IonText color="medium">
                <p>Aucun rendez-vous pour cette secretaire.</p>
              </IonText>
            ) : (
              <>
                {groupedAppointments.map((group) => (
                  <div key={group.key} style={{ marginTop: '10px' }}>
                    <p style={{ margin: '0 0 6px 2px', fontSize: '0.88rem', color: '#64748b', fontWeight: 600 }}>
                      {group.title}
                    </p>
                    <IonList>
                      {group.items.map((appointment, index) => {
                        const patientName = patientNameById.get(appointment.patient_id) ?? `Patient #${appointment.patient_id}`;
                        const status = getAppointmentStatus(appointment.scheduled_at);
                        const statusUi = getStatusUi(status);
                        return (
                          <IonItem
                            key={`${group.key}-${appointment.id}-${index}`}
                            button
                            detail
                            lines={index === group.items.length - 1 ? 'none' : 'full'}
                            style={{
                              border: '1px solid #dbe7ef',
                              borderLeft: `4px solid ${statusUi.border}`,
                              borderRadius: '12px',
                              marginBottom: index === group.items.length - 1 ? '0' : '8px'
                            }}
                            onClick={() =>
                              ionRouter.push(
                                `/secretaire/patients/${appointment.patient_id}/rendez-vous/${appointment.id}/edit?patient=${encodeURIComponent(patientName)}`,
                                'forward',
                                'push'
                              )
                            }
                          >
                            <IonLabel>
                              <div style={{ display: 'grid', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                                    {new Date(appointment.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {patientName}
                                  </h3>
                                  <IonBadge color={statusUi.color}>{statusUi.label}</IonBadge>
                                </div>
                                <p style={{ margin: 0 }}><strong>Medecin:</strong> {appointment.doctor_name}</p>
                                {appointment.note ? (
                                  <p style={{ margin: 0, fontSize: '0.92rem', color: '#64748b' }}>
                                    {appointment.note.length > 100 ? `${appointment.note.slice(0, 100)}...` : appointment.note}
                                  </p>
                                ) : null}
                              </div>
                            </IonLabel>
                          </IonItem>
                        );
                      })}
                    </IonList>
                  </div>
                ))}
              </>
            )}
          </IonCardContent>
        </IonCard>

        <IonFab slot="fixed" vertical="bottom" horizontal="end">
          <IonFabButton color="primary" onClick={() => openAddModal()}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>

        <AppointmentFormModal
          isOpen={showAddModal}
          title="Ajouter rendez-vous"
          patientField={{
            mode: 'select',
            value: addForm.patient_id,
            options: patients.map((patient) => ({ value: String(patient.id), label: patient.name })),
            onChange: (value) => setAddForm((prev) => ({ ...prev, patient_id: value })),
            placeholder: 'Selectionner un patient',
          }}
          doctorField={{
            mode: 'select',
            value: addForm.doctor_user_id,
            options: relatedDoctors.map((doctor) => ({ value: String(doctor.id), label: doctor.name })),
            onChange: (value) => setAddForm((prev) => ({ ...prev, doctor_user_id: value })),
            placeholder: 'Selectionner un medecin',
          }}
          scheduledDate={scheduledDate}
          scheduledTime={scheduledTime}
          onScheduledDateChange={setScheduledDate}
          onScheduledTimeChange={setScheduledTime}
          note={addForm.note}
          onNoteChange={(value) => setAddForm((prev) => ({ ...prev, note: value }))}
          onSubmit={saveAddedAppointment}
          onClose={() => {
            setShowAddModal(false);
            setAddError(null);
          }}
          errorMessage={addError}
        />
      </IonContent>
    </IonPage>
  );
};

export default SecretaryAppointmentsPage;

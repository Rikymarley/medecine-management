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
import { useCallback, useMemo, useState } from 'react';
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

const DoctorMyAppointmentsPage: React.FC = () => {
  const { token, user } = useAuth();
  const ionRouter = useIonRouter();
  const [query, setQuery] = useState('');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<'all' | 'past' | 'upcoming'>('all');
  const [patients, setPatients] = useState<ApiDoctorPatient[]>([]);
  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scheduledTime, setScheduledTime] = useState(() => new Date().toISOString().slice(11, 16));
  const [addForm, setAddForm] = useState({
    patient_id: '',
    note: '',
  });

  const loadData = useCallback(async () => {
    if (!token || !user?.id) {
      setPatients([]);
      setAppointments([]);
      return;
    }

    const patientRows = await api.getDoctorPatients(token).catch(() => []);
    setPatients(patientRows);

    const rows = await api.getDoctorAppointments(token).catch(() => [] as ApiAppointment[]);
    const forDoctor = rows.filter((entry) => entry.doctor_user_id === user.id);
    setAppointments(forDoctor.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()));
  }, [token, user?.id]);

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();
    return appointments.filter((entry) => {
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
      const patientName = patientNameById.get(entry.patient_id) ?? `Patient #${entry.patient_id}`;
      return `${patientName} ${entry.note ?? ''} ${entry.doctor_name}`.toLowerCase().includes(q);
    });
  }, [appointments, patientNameById, query, selectedTimeFilter]);

  const summary = useMemo(() => {
    const now = Date.now();
    const dayKey = new Date().toLocaleDateString('fr-FR', DAY_KEY_OPTIONS);
    const todayCount = appointments.filter((entry) => getDayKey(entry.scheduled_at) === dayKey).length;
    const overdueCount = appointments.filter((entry) => new Date(entry.scheduled_at).getTime() < now).length;
    const next24hCount = appointments.filter((entry) => {
      const target = new Date(entry.scheduled_at).getTime();
      return target >= now && target <= now + 24 * 60 * 60 * 1000;
    }).length;
    return { todayCount, overdueCount, next24hCount };
  }, [appointments]);

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

  const openAddModal = useCallback(() => {
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    const nextDate = localNow.toISOString().slice(0, 10);
    const nextTime = localNow.toISOString().slice(11, 16);
    setScheduledDate(nextDate);
    setScheduledTime(nextTime);
    setAddForm({
      patient_id: '',
      note: '',
    });
    setAddError(null);
    setShowAddModal(true);
  }, []);

  const saveAddedAppointment = useCallback(() => {
    if (!user?.id) {
      setAddError('Utilisateur introuvable.');
      return;
    }
    const patientId = Number(addForm.patient_id);
    if (!Number.isFinite(patientId) || patientId <= 0) {
      setAddError('Selectionnez un patient.');
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

    api.createDoctorAppointment(token, {
      patient_id: patientId,
      doctor_user_id: user.id,
      scheduled_at: scheduledAt,
      note: addForm.note.trim() || null,
    }).then(() => {
      setShowAddModal(false);
      setAddError(null);
      void loadData();
    }).catch((error: unknown) => {
      setAddError(error instanceof Error ? error.message : "Impossible d'ajouter ce rendez-vous.");
    });
  }, [addForm, loadData, scheduledDate, scheduledTime, token, user?.id]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/doctor" />
          </IonButtons>
          <IonTitle>Mes rendez-vous</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardContent>
            <IonSearchbar
              value={query}
              placeholder="Rechercher par patient ou note..."
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
                <p>Aucun rendez-vous lie a votre compte.</p>
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
                                `/doctor/patients/${appointment.patient_id}`,
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
          <IonFabButton color="primary" onClick={openAddModal}>
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

export default DoctorMyAppointmentsPage;

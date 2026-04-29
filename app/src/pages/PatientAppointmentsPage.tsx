import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSearchbar,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useMemo, useState } from 'react';
import { useIonViewWillEnter } from '@ionic/react';
import InstallBanner from '../components/InstallBanner';
import { api, type ApiAppointment } from '../services/api';
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

const PatientAppointmentsPage: React.FC = () => {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<'all' | 'past' | 'upcoming'>('all');
  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);

  useIonViewWillEnter(() => {
    if (!token) {
      setAppointments([]);
      return;
    }
    api.getPatientAppointments(token)
      .then((rows) => {
        setAppointments(rows.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()));
      })
      .catch(() => setAppointments([]));
  });

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
      return `${entry.doctor_name} ${entry.note ?? ''}`.toLowerCase().includes(q);
    });
  }, [appointments, query, selectedDoctor, selectedTimeFilter]);

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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/patient" />
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
              placeholder="Rechercher medecin ou note..."
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
                <p>Aucun rendez-vous pour le moment.</p>
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
                        const status = getAppointmentStatus(appointment.scheduled_at);
                        const statusUi = getStatusUi(status);
                        return (
                          <IonItem
                            key={`${group.key}-${appointment.id}-${index}`}
                            lines={index === group.items.length - 1 ? 'none' : 'full'}
                            style={{
                              border: '1px solid #dbe7ef',
                              borderLeft: `4px solid ${statusUi.border}`,
                              borderRadius: '12px',
                              marginBottom: index === group.items.length - 1 ? '0' : '8px'
                            }}
                          >
                            <IonLabel>
                              <div style={{ display: 'grid', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                                    {new Date(appointment.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                  </h3>
                                  <IonBadge color={statusUi.color}>{statusUi.label}</IonBadge>
                                </div>
                                <p style={{ margin: 0 }}><strong>Medecin:</strong> {appointment.doctor_name}</p>
                                <p style={{ margin: 0 }}>
                                  <strong>Date:</strong> {formatDateTime(appointment.scheduled_at)}
                                </p>
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
      </IonContent>
    </IonPage>
  );
};

export default PatientAppointmentsPage;

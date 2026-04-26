import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInput,
  IonModal,
  IonItem,
  IonIcon,
  IonLabel,
  IonDatetime,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { calendarOutline, timeOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { useIonRouter } from '@ionic/react';
import { useLocation, useParams } from 'react-router';
import InstallBanner from '../components/InstallBanner';
import { api } from '../services/api';
import { useAuth } from '../state/AuthState';
import { formatDateTime } from '../utils/time';

type RouteParams = {
  patientId: string;
  appointmentId?: string;
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

const SecretaryAppointmentCreatePage: React.FC = () => {
  const ionRouter = useIonRouter();
  const { token, user } = useAuth();
  const { patientId, appointmentId } = useParams<RouteParams>();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const patientName = query.get('patient') ? decodeURIComponent(query.get('patient') as string) : 'Patient';

  const [doctorId, setDoctorId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scheduledTime, setScheduledTime] = useState(() => new Date().toISOString().slice(11, 16));
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(scheduledDate);
  const [draftTime, setDraftTime] = useState(scheduledTime);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedDoctors, setLinkedDoctors] = useState<Array<{ id: number; name: string; specialty: string | null }>>([]);
  const isEditMode = Boolean(appointmentId);

  useEffect(() => {
    let active = true;
    if (!token) {
      return () => {
        active = false;
      };
    }
    api.getSecretaryAccessRequests(token)
      .then((rows) => {
        if (!active) {
          return;
        }
        const approved = rows.filter((row) => row.status === 'approved' && row.doctor_id);
        const map = new Map<number, { id: number; name: string; specialty: string | null }>();
        approved.forEach((row) => {
          if (!map.has(row.doctor_id)) {
            map.set(row.doctor_id, {
              id: row.doctor_id,
              name: row.doctor_name ?? `Docteur #${row.doctor_id}`,
              specialty: row.doctor_specialty ?? null,
            });
          }
        });
        setLinkedDoctors(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setLinkedDoctors([]);
      });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    const parsedPatientId = Number(patientId);
    if (!Number.isFinite(parsedPatientId) || !appointmentId) {
      return;
    }
    const storageKey = `secretary-appointments-${parsedPatientId}`;
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as SecretaryAppointmentEntry[];
      if (!Array.isArray(parsed)) {
        return;
      }
      const existing = parsed.find((row) => row.id === appointmentId);
      if (!existing) {
        return;
      }
      setDoctorId(String(existing.doctor_user_id));
      const localDate = new Date(existing.scheduled_at);
      if (!Number.isNaN(localDate.getTime())) {
        const y = localDate.getFullYear();
        const m = String(localDate.getMonth() + 1).padStart(2, '0');
        const d = String(localDate.getDate()).padStart(2, '0');
        const hh = String(localDate.getHours()).padStart(2, '0');
        const mm = String(localDate.getMinutes()).padStart(2, '0');
        setScheduledDate(`${y}-${m}-${d}`);
        setScheduledTime(`${hh}:${mm}`);
      }
      setNote(existing.note ?? '');
    } catch {
      // ignore invalid local data
    }
  }, [appointmentId, patientId]);

  const selectedDoctor = useMemo(
    () => linkedDoctors.find((row) => String(row.id) === doctorId) ?? null,
    [doctorId, linkedDoctors]
  );

  const formattedDateLabel = useMemo(() => {
    if (!scheduledDate) {
      return '';
    }
    const parsed = new Date(`${scheduledDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }
    return parsed.toLocaleDateString('fr-HT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [scheduledDate]);
  const formattedTimeLabel = useMemo(() => {
    if (!scheduledTime) {
      return '';
    }
    const [hh, mm] = scheduledTime.split(':');
    if (!hh || !mm) {
      return '';
    }
    return `${hh}:${mm}`;
  }, [scheduledTime]);

  const saveAppointment = () => {
    const parsedPatientId = Number(patientId);
    if (!Number.isFinite(parsedPatientId)) {
      setError('Patient invalide.');
      return;
    }
    if (!doctorId) {
      setError('Selectionnez un medecin.');
      return;
    }
    if (!scheduledDate) {
      setError('Date requise.');
      return;
    }
    if (!scheduledTime) {
      setError('Date et heure requises.');
      return;
    }
    const localDateTime = `${scheduledDate}T${scheduledTime}:00`;

    const parsedDoctorId = Number(doctorId);
    const nextEntry: SecretaryAppointmentEntry = {
      id: appointmentId ?? `rdv-${Date.now()}`,
      patient_id: parsedPatientId,
      created_by_secretary_id: user?.id ?? null,
      doctor_user_id: parsedDoctorId,
      doctor_name: selectedDoctor?.name ?? `Docteur #${parsedDoctorId}`,
      scheduled_at: new Date(localDateTime).toISOString(),
      note: note.trim() || null,
      created_at: new Date().toISOString(),
    };

    setSaving(true);
    setError(null);
    try {
      const storageKey = `secretary-appointments-${parsedPatientId}`;
      const raw = localStorage.getItem(storageKey);
      let existing: SecretaryAppointmentEntry[] = [];
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
      const next = appointmentId
        ? existing.map((row) => (row.id === appointmentId ? nextEntry : row))
        : [...existing, nextEntry];
      localStorage.setItem(storageKey, JSON.stringify(next));
      ionRouter.push(`/secretaire/patients/${parsedPatientId}`, 'back', 'pop');
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={`/secretaire/patients/${patientId}`} />
          </IonButtons>
          <IonTitle>{isEditMode ? 'Modifier rendez-vous' : 'Nouveau rendez-vous'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <InstallBanner />
        <IonCard className="surface-card">
          <IonCardHeader>
            <IonCardTitle>{isEditMode ? 'Modifier rendez-vous' : 'Planifier rendez-vous'}</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p style={{ marginTop: 0 }}>
              <strong>Patient:</strong> {patientName}
            </p>
            <IonItem>
              <IonLabel position="stacked">Medecin</IonLabel>
              <IonSelect value={doctorId} placeholder="Selectionner un medecin" onIonChange={(e) => setDoctorId(String(e.detail.value ?? ''))}>
                {linkedDoctors.map((doctor) => (
                  <IonSelectOption key={doctor.id} value={String(doctor.id)}>
                    {doctor.name}{doctor.specialty ? ` · ${doctor.specialty}` : ''}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
            <div
              style={{
                border: '1px solid #dbe7ef',
                borderRadius: '12px',
                padding: '10px',
                background: '#f8fafc',
                marginTop: '10px',
              }}
            >
              <p style={{ margin: '0 0 8px 0', fontWeight: 700 }}>Date et heure du rendez-vous</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px' }}>
                <IonButton
                  fill="outline"
                  onClick={() => {
                    setDraftDate(scheduledDate);
                    setIsDatePickerOpen(true);
                  }}
                  style={{ justifyContent: 'space-between', textTransform: 'none', height: '44px' }}
                >
                  <span style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span><strong>Date:</strong> {formattedDateLabel || 'Selectionner'}</span>
                    <IonIcon icon={calendarOutline} />
                  </span>
                </IonButton>
                <IonButton
                  fill="outline"
                  disabled={!scheduledDate}
                  onClick={() => {
                    setDraftTime(scheduledTime);
                    setIsTimePickerOpen(true);
                  }}
                  style={{ justifyContent: 'space-between', textTransform: 'none', height: '44px' }}
                >
                  <span style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span><strong>Heure:</strong> {formattedTimeLabel || 'Selectionner'}</span>
                    <IonIcon icon={timeOutline} />
                  </span>
                </IonButton>
              </div>
              {!scheduledDate ? (
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Selectionnez d'abord une date.
                </p>
              ) : null}
            </div>
            <IonModal
              isOpen={isDatePickerOpen}
              onDidDismiss={() => setIsDatePickerOpen(false)}
              breakpoints={[0, 0.5, 0.85]}
              initialBreakpoint={0.5}
              keepContentsMounted
            >
              <IonContent className="ion-padding">
                <IonDatetime
                  presentation="date"
                  locale="fr-HT"
                  value={draftDate}
                  onIonChange={(e) => {
                    const value = String(e.detail.value ?? '');
                    setDraftDate(value.includes('T') ? value.split('T')[0] : value.slice(0, 10));
                  }}
                />
                <div style={{ display: 'grid', gap: '8px', marginTop: '8px' }}>
                  <IonButton
                    expand="block"
                    onClick={() => {
                      if (draftDate) {
                        setScheduledDate(draftDate);
                      }
                      setIsDatePickerOpen(false);
                    }}
                  >
                    Valider
                  </IonButton>
                  <IonButton expand="block" color="medium" onClick={() => setIsDatePickerOpen(false)}>
                    Annuler
                  </IonButton>
                </div>
              </IonContent>
            </IonModal>
            <IonModal
              isOpen={isTimePickerOpen}
              onDidDismiss={() => setIsTimePickerOpen(false)}
              breakpoints={[0, 0.45, 0.75]}
              initialBreakpoint={0.45}
              keepContentsMounted
            >
              <IonContent className="ion-padding">
                <IonDatetime
                  presentation="time"
                  locale="fr-HT"
                  minuteValues="0,15,30,45"
                  value={draftTime ? `1970-01-01T${draftTime}:00` : undefined}
                  onIonChange={(e) => {
                    const value = String(e.detail.value ?? '');
                    if (value) {
                      const parsed = new Date(value);
                      const hh = String(parsed.getHours()).padStart(2, '0');
                      const mm = String(parsed.getMinutes()).padStart(2, '0');
                      setDraftTime(`${hh}:${mm}`);
                    }
                  }}
                />
                <div style={{ display: 'grid', gap: '8px', marginTop: '8px' }}>
                  <IonButton
                    expand="block"
                    onClick={() => {
                      if (draftTime) {
                        setScheduledTime(draftTime);
                      }
                      setIsTimePickerOpen(false);
                    }}
                  >
                    Valider
                  </IonButton>
                  <IonButton expand="block" color="medium" onClick={() => setIsTimePickerOpen(false)}>
                    Annuler
                  </IonButton>
                </div>
              </IonContent>
            </IonModal>
            <IonItem>
              <IonLabel position="stacked">Note (optionnel)</IonLabel>
              <IonTextarea autoGrow value={note} onIonInput={(e) => setNote(String(e.detail.value ?? ''))} />
            </IonItem>
            {error ? (
              <IonText color="danger">
                <p>{error}</p>
              </IonText>
            ) : null}
            <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
              <IonButton expand="block" onClick={saveAppointment} disabled={saving}>
                {saving ? 'Enregistrement...' : isEditMode ? 'Mettre a jour' : 'Enregistrer'}
              </IonButton>
              <IonButton
                expand="block"
                color="dark"
                onClick={() => ionRouter.push(`/secretaire/patients/${patientId}`, 'back', 'pop')}
              >
                Annuler
              </IonButton>
            </div>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default SecretaryAppointmentCreatePage;

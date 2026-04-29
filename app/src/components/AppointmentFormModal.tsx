import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonDatetime,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { calendarOutline, closeOutline, timeOutline } from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';

type SelectOption = {
  value: string;
  label: string;
};

type PatientFieldConfig =
  | {
      mode: 'select';
      value: string;
      options: SelectOption[];
      onChange: (value: string) => void;
      placeholder?: string;
      label?: string;
    }
  | {
      mode: 'readonly';
      label: string;
      readonlyLabel?: string;
    };

type DoctorFieldConfig =
  | {
      mode: 'select';
      value: string;
      options: SelectOption[];
      onChange: (value: string) => void;
      placeholder?: string;
      label?: string;
    }
  | {
      mode: 'readonly';
      label: string;
      readonlyLabel?: string;
    };

type AppointmentFormModalProps = {
  isOpen: boolean;
  title?: string;
  patientField: PatientFieldConfig;
  doctorField?: DoctorFieldConfig | null;
  scheduledDate: string;
  scheduledTime: string;
  onScheduledDateChange: (value: string) => void;
  onScheduledTimeChange: (value: string) => void;
  note: string;
  onNoteChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  submitLabel?: string;
  submitDisabled?: boolean;
  errorMessage?: string | null;
};

const stickyActionsStyle: React.CSSProperties = {
  position: 'sticky',
  bottom: '-16px',
  background: '#f0f6fa',
  borderTop: '1px solid #dbe7ef',
  padding: '8px',
  boxShadow: '0 -4px 12px rgba(15, 23, 42, 0.06)',
  zIndex: 1,
};

const AppointmentFormModal: React.FC<AppointmentFormModalProps> = ({
  isOpen,
  title = 'Ajouter rendez-vous',
  patientField,
  doctorField = null,
  scheduledDate,
  scheduledTime,
  onScheduledDateChange,
  onScheduledTimeChange,
  note,
  onNoteChange,
  onSubmit,
  onClose,
  submitLabel = 'Enregistrer',
  submitDisabled = false,
  errorMessage = null,
}) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(scheduledDate);
  const [draftTime, setDraftTime] = useState(scheduledTime);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setDraftDate(scheduledDate);
    setDraftTime(scheduledTime);
    setIsDatePickerOpen(false);
    setIsTimePickerOpen(false);
  }, [isOpen, scheduledDate, scheduledTime]);

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

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{title}</IonTitle>
          <IonButtons slot="end">
            <IonButton fill="clear" onClick={onClose}>
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding app-content">
        <IonCard className="surface-card">
          <IonCardContent style={{ display: 'grid', gap: '8px' }}>
            {patientField.mode === 'select' ? (
              <IonItem>
                <IonLabel position="stacked">{patientField.label ?? 'Patient'}</IonLabel>
                <IonSelect
                  value={patientField.value}
                  placeholder={patientField.placeholder ?? 'Selectionner un patient'}
                  onIonChange={(event) => patientField.onChange(String(event.detail.value ?? ''))}
                >
                  {patientField.options.map((patient) => (
                    <IonSelectOption key={patient.value} value={patient.value}>
                      {patient.label}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
            ) : (
              <IonItem>
                <IonLabel position="stacked">{patientField.readonlyLabel ?? 'Patient'}</IonLabel>
                <IonInput value={patientField.label} readonly />
              </IonItem>
            )}

            {doctorField ? (
              doctorField.mode === 'select' ? (
                <IonItem>
                  <IonLabel position="stacked">{doctorField.label ?? 'Medecin'}</IonLabel>
                  <IonSelect
                    value={doctorField.value}
                    placeholder={doctorField.placeholder ?? 'Selectionner un medecin'}
                    onIonChange={(event) => doctorField.onChange(String(event.detail.value ?? ''))}
                  >
                    {doctorField.options.map((doctor) => (
                      <IonSelectOption key={doctor.value} value={doctor.value}>
                        {doctor.label}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
              ) : (
                <IonItem>
                  <IonLabel position="stacked">{doctorField.readonlyLabel ?? 'Medecin'}</IonLabel>
                  <IonInput value={doctorField.label} readonly />
                </IonItem>
              )
            ) : null}

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
            </div>

            <IonModal
              isOpen={isDatePickerOpen}
              onDidDismiss={() => setIsDatePickerOpen(false)}
              breakpoints={[0, 0.7, 0.95]}
              initialBreakpoint={0.7}
              keepContentsMounted
            >
              <IonContent className="ion-padding" style={{ '--padding-bottom': '20px' } as React.CSSProperties}>
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
                        onScheduledDateChange(draftDate);
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
              breakpoints={[0, 0.65, 0.9]}
              initialBreakpoint={0.65}
              keepContentsMounted
            >
              <IonContent className="ion-padding" style={{ '--padding-bottom': '20px' } as React.CSSProperties}>
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
                        onScheduledTimeChange(draftTime);
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
              <IonTextarea autoGrow value={note} onIonInput={(event) => onNoteChange(event.detail.value ?? '')} />
            </IonItem>
          </IonCardContent>
        </IonCard>

        <div style={stickyActionsStyle}>
          <IonButton expand="block" onClick={onSubmit} disabled={submitDisabled}>
            {submitLabel}
          </IonButton>
          <IonButton expand="block" color="dark" onClick={onClose}>
            Annuler
          </IonButton>
        </div>

        {errorMessage ? (
          <IonText color="danger">
            <p>{errorMessage}</p>
          </IonText>
        ) : null}
      </IonContent>
    </IonModal>
  );
};

export default AppointmentFormModal;
